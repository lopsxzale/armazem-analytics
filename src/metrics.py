"""Funções puras de métricas. Sem I/O: recebem DataFrames/dicts e devolvem resultados.

As mesmas fórmulas são usadas no export do site e replicadas no simulador (web/src/components/simulator.tsx).
"""

from __future__ import annotations

import math
from collections.abc import Mapping

import pandas as pd


def pareto(df: pd.DataFrame, valor: str, por: str | list[str]) -> pd.DataFrame:
    """Agrupa por `por`, ordena por `valor` decrescente e acrescenta pct e pct_acum (0-100)."""
    g = df.groupby(por, as_index=False)[valor].sum().sort_values(valor, ascending=False, kind="stable")
    total = g[valor].sum()
    g["pct"] = g[valor] / total * 100
    g["pct_acum"] = g["pct"].cumsum()
    return g.reset_index(drop=True)


def itens_ate(pct_acum: pd.Series, corte: float = 80.0) -> int:
    """Quantas linhas (já ordenadas) são necessárias para atingir `corte`% do total."""
    return int((pct_acum < corte).sum()) + 1


def curva_abc(volumes: pd.Series, cortes: tuple[float, float] = (0.80, 0.95)) -> pd.Series:
    """Classe A/B/C de cada item pelo volume acumulado ANTES dele (A enquanto não passou de 80%, B até 95%).

    Olhar o acumulado anterior garante que o item que cruza o corte ainda entra na classe: um item que
    sozinho é 85% do volume é A, não B.
    """
    ordem = volumes.sort_values(ascending=False, kind="stable")
    antes = (ordem.cumsum() - ordem) / ordem.sum()
    classe = pd.Series("C", index=ordem.index)
    classe[antes < cortes[1]] = "B"
    classe[antes < cortes[0]] = "A"
    return classe.reindex(volumes.index)


def custo_avaria(caixas: Mapping[str, float], precos: Mapping[str, float]) -> float:
    """Custo em R$ de caixas avariadas por embalagem: soma de caixas x preço da caixa."""
    return float(sum(qtd * precos[emb] for emb, qtd in caixas.items()))


def economia_simulada(
    caixas_mes: pd.DataFrame,
    precos: Mapping[str, float],
    reducao_pct: float,
    etapa: str | None = None,
    embalagem: str | None = None,
) -> float:
    """Economia mensal em R$ ao reduzir `reducao_pct`% da avaria numa etapa e/ou embalagem.

    `caixas_mes` tem colunas etapa_id, embalagem_id e caixas (média mensal de caixas avariadas).
    `None` em etapa ou embalagem significa "todas".
    """
    d = caixas_mes
    if etapa is not None:
        d = d[d["etapa_id"] == etapa]
    if embalagem is not None:
        d = d[d["embalagem_id"] == embalagem]
    custo = (d["caixas"] * d["embalagem_id"].map(precos)).sum()
    return float(custo * reducao_pct / 100)


def janela(periodos: pd.Series, cortes: Mapping[str, str]) -> pd.Series:
    """Janela contínua de cada período 'AAAA-MM' (mesma regra do CASE em sql/analysis/q4_tendencia_etapa.sql).

    `cortes` mapeia o último período de cada janela -> id da janela, em ordem crescente.
    """
    out = pd.Series(list(cortes.values())[-1], index=periodos.index)
    for limite, nome in reversed(list(cortes.items())):
        out[periodos <= limite] = nome
    return out


def taxa_por_janela(
    avarias: pd.DataFrame, mov: pd.DataFrame, itens: pd.DataFrame, cortes: Mapping[str, str], ajustar_mix: bool
) -> pd.DataFrame:
    """Taxa de avaria (% das caixas) por etapa e janela; com `ajustar_mix`, padronizada pelo mix de embalagem da 1ª janela.

    Taxa ajustada = soma, nas embalagens, de taxa(etapa, embalagem, janela) x peso da embalagem no volume da 1ª janela.
    Assim a variação mede só a mudança de taxa, não a troca de long neck por lata ao longo dos anos.
    """
    emb = itens.set_index("item_code")["embalagem_id"]
    m = mov.assign(janela=janela(mov["periodo"], cortes), embalagem_id=mov["item_code"].map(emb))
    a = avarias.assign(janela=janela(avarias["periodo"], cortes), embalagem_id=avarias["item_code"].map(emb))
    vol = m.groupby(["janela", "embalagem_id"])["caixas_movimentadas"].sum()
    av = a.groupby(["etapa_id", "janela", "embalagem_id"])["caixas"].sum()
    if not ajustar_mix:
        tot = vol.groupby("janela").sum()
        bruta = av.groupby(["etapa_id", "janela"]).sum() / tot.reindex(
            av.groupby(["etapa_id", "janela"]).sum().index, level="janela"
        )
        return (bruta * 100).rename("taxa_pct").reset_index()
    primeira = sorted(vol.index.get_level_values("janela").unique())[0]
    peso = vol.xs(primeira, level="janela") / vol.xs(primeira, level="janela").sum()
    taxa = av / vol.reindex(av.index.droplevel("etapa_id")).to_numpy()
    ajust = (
        (taxa * taxa.index.get_level_values("embalagem_id").map(peso).to_numpy()).groupby(["etapa_id", "janela"]).sum()
    )
    return (ajust * 100).rename("taxa_pct").reset_index()


def variacao_final(taxas: pd.DataFrame) -> dict[str, float]:
    """Variação % da taxa de cada etapa entre a primeira e a última janela."""
    out = {}
    for etapa, d in taxas.sort_values("janela").groupby("etapa_id"):
        out[etapa] = (d["taxa_pct"].iloc[-1] / d["taxa_pct"].iloc[0] - 1) * 100
    return out


def achados(
    avarias: pd.DataFrame,
    mov: pd.DataFrame,
    itens: pd.DataFrame,
    precos: Mapping[str, float],
    cortes: Mapping[str, str],
    foco: str = "separacao",
) -> dict[str, float]:
    """Os números-chave do resumo a partir das tabelas (sem SQL). Usado pela sensibilidade e pelo teste cruzado."""
    emb = itens.set_index("item_code")["embalagem_id"]
    a = avarias.assign(embalagem_id=avarias["item_code"].map(emb))
    a["custo"] = a["caixas"] * a["embalagem_id"].map(precos)
    combos = pareto(a, "custo", ["motivo_id", "etapa_id"])
    custo_emb = a.groupby("embalagem_id")["custo"].sum()
    bruta = variacao_final(taxa_por_janela(avarias, mov, itens, cortes, ajustar_mix=False))
    ajust = variacao_final(taxa_por_janela(avarias, mov, itens, cortes, ajustar_mix=True))
    outras_b = [v for k, v in bruta.items() if k != foco]
    outras_a = [v for k, v in ajust.items() if k != foco]
    return {
        "top3_pct": float(combos["pct"].head(3).sum()),
        "long_neck_pct_custo": float(custo_emb.get("long_neck", 0) / custo_emb.sum() * 100),
        "foco_var_pct": bruta[foco],
        "foco_var_ajustada_pct": ajust[foco],
        "outras_var_media_pct": sum(outras_b) / len(outras_b),
        "outras_var_ajustada_media_pct": sum(outras_a) / len(outras_a),
        "custo_medio_mensal_brl": float(a["custo"].sum() / mov["periodo"].nunique()),
    }


# ---------------------------------------------------------------- v2: frequência de contagem


def poisson_cdf(k: int, media: float) -> float:
    """P(N <= k) para N ~ Poisson(media), sem depender do scipy."""
    termo, total = math.exp(-media), 0.0
    for i in range(k + 1):
        if i > 0:
            termo *= media / i
        total += termo
    return total


def ira_esperada(eventos_dia: float, tolerancia_eventos: int, intervalo_dias: float) -> float:
    """IRA esperada (%) contando a cada `intervalo_dias`: chance de acumular no máximo `tolerancia_eventos` eventos."""
    return poisson_cdf(tolerancia_eventos, eventos_dia * intervalo_dias) * 100


def frequencia_recomendada(base: pd.DataFrame, premissas: Mapping) -> pd.DataFrame:
    """Para cada classe, o MAIOR intervalo de contagem que mantém a IRA esperada >= meta, e o custo mensal.

    `base` é a saída de sql/analysis/q12_base_frequencia.sql. A tolerância (max(1 caixa, 2% do estoque)) vira
    número de eventos dividindo pelo tamanho médio de um evento (erro: caixas_por_erro; avaria: 1 caixa).
    """
    linhas = []
    for r in base.itertuples():
        eventos = r.eventos_avaria + r.eventos_erro
        eventos_dia = eventos / r.item_meses / 30
        tamanho = (r.eventos_erro * premissas["caixas_por_erro"] + r.eventos_avaria) / eventos
        tolerancia = max(1.0, premissas["tolerancia_pct"] / 100 * r.estoque_medio)
        k = max(0, round(tolerancia / tamanho))
        opcoes = {d: ira_esperada(eventos_dia, k, d) for d in premissas["intervalos_dias"]}
        ok = [d for d, ira in opcoes.items() if ira >= premissas["ira_meta_pct"]]
        intervalo = max(ok) if ok else min(opcoes)
        contagens_mes = r.itens_ativos * r.posicoes * 30 / intervalo
        linhas.append(
            {
                "classe": r.classe,
                "eventos_dia": eventos_dia,
                "tolerancia_eventos": k,
                "intervalo_dias": intervalo,
                "ira_recomendada_pct": opcoes[intervalo],
                "ira_mensal_pct": ira_esperada(eventos_dia, k, 30),
                "itens_ativos": r.itens_ativos,
                "posicoes": r.posicoes,
                "contagens_mes": contagens_mes,
                "custo_mes_brl": contagens_mes * premissas["custo_contagem_posicao_brl"],
                "custo_mensal_todos_brl": r.itens_ativos * r.posicoes * premissas["custo_contagem_posicao_brl"],
                "ira_por_intervalo": opcoes,
            }
        )
    return pd.DataFrame(linhas)
