"""Gera os JSONs do site (web/src/data/) e o resumo executivo (docs/resumo-executivo.md).

Recria o banco em memória a partir dos painéis versionados (data/app, data/sim),
roda as queries de sql/analysis/ e grava o resultado. Os JSONs são versionados:
o site é estático e o CI não precisa dos dados brutos.

Uso: python src/export_web.py
"""

from __future__ import annotations

import json
import math
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd

import load
import metrics
import referencias as ref

ROOT_DIR = Path(__file__).resolve().parent.parent
SQL_DIR = ROOT_DIR / "sql" / "analysis"
WEB_DATA_DIR = ROOT_DIR / "web" / "src" / "data"
RESUMO = ROOT_DIR / "docs" / "resumo-executivo.md"
RESUMO_V2 = ROOT_DIR / "docs" / "resumo-v2.md"
SENSIBILIDADE = WEB_DATA_DIR / "sensibilidade.json"  # gerado por src/sensitivity.py (roda antes deste script)

QUERIES = {
    "q1": "q1_pareto_motivo_etapa",
    "q2": "q2_custo_mensal",
    "q3": "q3_embalagem_etapa",
    "q4": "q4_tendencia_etapa",
    "q5": "q5_curva_abc",
    "q6": "q6_top_itens",
    "q7": "q7_mix_embalagem",
    "q8": "q8_estornos",
    "q9": "q9_ira_por_classe",
    "q10": "q10_divergencia_itens",
    "q11": "q11_causas",
    "q12": "q12_base_frequencia",
    "q13": "q13_vasilhame_tipo_motivo",
    "q14": "q14_vasilhame_etapa",
}
REDUCAO_PADRAO = 30  # % de redução usada nos achados e no valor inicial do simulador
PRECOS = {k: v["preco_caixa_brl"] for k, v in ref.EMBALAGENS.items()}


def _clean(value):
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float):
        return None if math.isnan(value) else round(value, 4)
    return value


def _normalize(value):
    """Deixa o payload serializável: NaN -> null e floats com 4 casas."""
    if isinstance(value, dict):
        return {str(k): _normalize(v) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [_normalize(v) for v in value]
    return _clean(value)


def records(df: pd.DataFrame) -> list[dict]:
    return df.to_dict("records")


def write(name: str, payload) -> Path:
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = WEB_DATA_DIR / f"{name}.json"
    path.write_text(json.dumps(_normalize(payload), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return path


def sql_text(key: str) -> str:
    return (SQL_DIR / f"{QUERIES[key]}.sql").read_text(encoding="utf-8")


def run_queries(con: sqlite3.Connection) -> dict[str, pd.DataFrame]:
    return {k: pd.read_sql(sql_text(k), con) for k in QUERIES}


def caixas_mes(con: sqlite3.Connection) -> pd.DataFrame:
    """Média mensal de caixas avariadas por etapa x embalagem (base do simulador)."""
    df = pd.read_sql(
        """
        SELECT a.etapa_id, i.embalagem_id, SUM(a.caixas) AS caixas
        FROM avarias a JOIN itens i ON i.item_code = a.item_code
        GROUP BY a.etapa_id, i.embalagem_id
        """,
        con,
    )
    (meses,) = con.execute("SELECT COUNT(DISTINCT periodo) FROM movimentos_mensais").fetchone()
    df["caixas"] = df["caixas"] / meses
    return df


# ---------------------------------------------------------------- blocos do site


def build_meta(q: dict[str, pd.DataFrame], con: sqlite3.Connection) -> dict:
    mensal = q["q2"]
    (itens,) = con.execute("SELECT COUNT(*) FROM itens").fetchone()
    (fornecedores,) = con.execute("SELECT COUNT(DISTINCT fornecedor) FROM itens").fetchone()
    return {
        "gerado_em": datetime.now(UTC).strftime("%Y-%m-%d"),
        "periodo_inicio": mensal["periodo"].iloc[0],
        "periodo_fim": mensal["periodo"].iloc[-1],
        "meses": len(mensal),
        "itens": itens,
        "fornecedores": fornecedores,
        "caixas_movimentadas": mensal["caixas_movimentadas"].sum(),
        "caixas_avariadas": int(mensal["caixas_avariadas"].sum()),
        "custo_total_brl": mensal["custo_brl"].sum(),
        "custo_medio_mensal_brl": mensal["custo_brl"].mean(),
        "taxa_pct": mensal["caixas_avariadas"].sum() / mensal["caixas_movimentadas"].sum() * 100,
        "fao": {"perda_pct": ref.FAO_PERDA_POS_COLHEITA_PCT, "ano": ref.FAO_ANO, "fonte": ref.FAO_FONTE},
        "taxa_base_pct": ref.TAXA_BASE_AVARIA * 100,
        "seed": ref.SEED,
    }


def build_pareto(q: dict[str, pd.DataFrame]) -> dict:
    combos = q["q1"]
    motivos = metrics.pareto(combos, "custo_brl", "motivo_id")
    etapas = metrics.pareto(combos, "custo_brl", "etapa_id")
    return {
        "combos": records(combos[["motivo_id", "etapa_id", "caixas", "custo_brl", "pct", "pct_acum", "posicao"]]),
        "motivos": records(motivos),
        "etapas": records(etapas),
        "combos_ate_80": metrics.itens_ate(combos["pct_acum"]),
        "total_combos": len(combos),
    }


def build_mensal(q: dict[str, pd.DataFrame]) -> dict:
    return {"meses": records(q["q2"])}


def build_matriz(q: dict[str, pd.DataFrame], con: sqlite3.Connection) -> dict:
    volume = pd.read_sql(
        """
        SELECT i.embalagem_id, SUM(m.caixas_movimentadas) AS caixas_movimentadas
        FROM movimentos_mensais m JOIN itens i ON i.item_code = m.item_code
        GROUP BY i.embalagem_id
        """,
        con,
    )
    volume["pct_volume"] = volume["caixas_movimentadas"] / volume["caixas_movimentadas"].sum() * 100
    custo = q["q3"].groupby("embalagem_id", as_index=False)[["custo_brl", "caixas_avariadas"]].sum()
    custo["pct_custo"] = custo["custo_brl"] / custo["custo_brl"].sum() * 100
    resumo = volume.merge(custo, on="embalagem_id")
    resumo["taxa_pct"] = resumo["caixas_avariadas"] / resumo["caixas_movimentadas"] * 100
    return {
        "celulas": records(
            q["q3"][["embalagem_id", "etapa_id", "caixas_avariadas", "custo_brl", "taxa_pct", "pct_custo"]]
        ),
        "embalagens": records(resumo),
    }


def build_tendencia(q: dict[str, pd.DataFrame]) -> dict:
    t = q["q4"]
    ultima = t[t["janela"] == t["janela"].max()].set_index("etapa_id")
    return {
        "janelas": [{"id": k, "rotulo": v} for k, v in ref.JANELAS.items()],
        "series": records(t),
        "var_final_pct": ultima["var_vs_inicio_pct"].to_dict(),
        "var_final_ajustada_pct": ultima["var_ajustada_vs_inicio_pct"].to_dict(),
    }


def build_real(q: dict[str, pd.DataFrame]) -> dict:
    """Só dado real do Montgomery: mix de embalagem por ano, estornos e concentração do volume."""
    mix = q["q7"]
    primeiro, ultimo = mix["ano"].min(), mix["ano"].max()
    pct = mix.set_index(["ano", "embalagem_id"])["pct"]
    classes = q["q5"].set_index("classe")
    estornos = q["q8"]
    return {
        "mix": records(mix),
        "ano_inicio": primeiro,
        "ano_fim": ultimo,
        "lata_inicio_pct": pct[(primeiro, "lata")],
        "lata_fim_pct": pct[(ultimo, "lata")],
        "long_neck_inicio_pct": pct[(primeiro, "long_neck")],
        "long_neck_fim_pct": pct[(ultimo, "long_neck")],
        "estornos": records(estornos),
        "estornos_total": estornos["caixas_devolvidas"].sum(),
        "estornos_taxa_pct": estornos["caixas_devolvidas"].sum() / estornos["caixas_movimentadas"].sum() * 100,
        "itens_a": int(classes.loc["A", "itens"]),
        "itens_total": int(classes["itens"].sum()),
        "pct_volume_a": classes.loc["A", "pct_volume"],
    }


def build_abc(q: dict[str, pd.DataFrame]) -> dict:
    return {"classes": records(q["q5"]), "top_itens": records(q["q6"])}


def build_inventario(q: dict[str, pd.DataFrame]) -> dict:
    """v2: IRA por classe, causas, itens que mais divergem e a frequência de contagem recomendada."""
    p = ref.INVENTARIO
    freq = metrics.frequencia_recomendada(q["q12"], p)
    freq["ira_por_intervalo"] = [{str(d): v for d, v in o.items()} for o in freq["ira_por_intervalo"]]
    ira = q["q9"].set_index("classe")
    causas = q["q11"].set_index("causa_id")
    fa = freq.set_index("classe")
    return {
        "ira": records(q["q9"]),
        "causas": records(q["q11"][["causa_id", "eventos", "caixas", "valor_brl", "pct", "pct_acum"]]),
        "top_itens": records(q["q10"]),
        "frequencia": records(freq),
        "premissas": {k: v for k, v in p.items() if k != "intervalos_dias"}
        | {"intervalos_dias": list(p["intervalos_dias"])},
        "achados": {
            "ira_a_mensal_pct": ira.loc["A", "ira_pct"],
            "ira_c_mensal_pct": ira.loc["C", "ira_pct"],
            "ira_a_modelo_mensal_pct": fa.loc["A", "ira_mensal_pct"],
            "avaria_nao_baixada_pct": causas.loc["avaria_nao_baixada", "pct"],
            "intervalo_a": int(fa.loc["A", "intervalo_dias"]),
            "intervalo_b": int(fa.loc["B", "intervalo_dias"]),
            "intervalo_c": int(fa.loc["C", "intervalo_dias"]),
            "ira_a_recomendada_pct": fa.loc["A", "ira_recomendada_pct"],
            "custo_recomendado_mes": freq["custo_mes_brl"].sum(),
            "custo_todos_mensal_mes": freq["custo_mensal_todos_brl"].sum(),
            "itens_ativos": int(freq["itens_ativos"].sum()),
        },
    }


ETAPAS_DE_FORA = ("retorno_rota", "triagem")  # refugo que já chega do cliente (o armazém só encontra)


def build_vasilhame(q: dict[str, pd.DataFrame], con: sqlite3.Connection) -> dict:
    """Refugo de vasilhame por tipo (1L, 600A, 600V, 300ml), motivo, etapa e mês. Camada 100% simulada."""
    tm = q["q13"]
    etapas = q["q14"]
    tipos = (
        tm.groupby(["tipo_id", "ordem"], as_index=False)
        .agg(
            cascos_refugados=("cascos_refugados", "sum"),
            cascos_tipo=("cascos_tipo", "first"),
            custo_brl=("custo_brl", "sum"),
        )
        .sort_values("ordem")
    )
    total_cascos = tipos["cascos_tipo"].sum()
    tipos["taxa_pct"] = tipos["cascos_refugados"] / tipos["cascos_tipo"] * 100
    tipos["pct_cascos"] = tipos["cascos_tipo"] / total_cascos * 100
    tipos["pct_custo"] = tipos["custo_brl"] / tipos["custo_brl"].sum() * 100
    tipos["preco_casco_brl"] = tipos["tipo_id"].map({k: v["preco_casco_brl"] for k, v in ref.TIPOS_VASILHAME.items()})

    motivos = tm.groupby("motivo_id", as_index=False)["cascos_refugados"].sum()
    motivos["pct"] = motivos["cascos_refugados"] / motivos["cascos_refugados"].sum() * 100
    motivos = motivos.sort_values("cascos_refugados", ascending=False)

    mensal = pd.read_sql(
        """
        SELECT r.periodo, r.cascos, COALESCE(f.refugados, 0) AS cascos_refugados, COALESCE(f.custo_brl, 0) AS custo_brl
        FROM (SELECT periodo, SUM(cascos) AS cascos FROM vasilhame_retorno GROUP BY periodo) r
        LEFT JOIN (
            SELECT v.periodo, SUM(v.cascos) AS refugados, SUM(v.cascos * t.preco_casco_brl) AS custo_brl
            FROM vasilhame_refugo v JOIN tipos_vasilhame t ON t.tipo_id = v.tipo_id
            GROUP BY v.periodo
        ) f ON f.periodo = r.periodo
        ORDER BY r.periodo
        """,
        con,
    )
    mensal["taxa_pct"] = mensal["cascos_refugados"] / mensal["cascos"] * 100
    meses = len(mensal)

    pior = tipos.sort_values("taxa_pct", ascending=False).iloc[0]
    melhor = tipos.sort_values("taxa_pct").iloc[0]
    et = etapas.set_index("etapa_id")
    de_fora = et.loc[list(ETAPAS_DE_FORA), "pct"].sum()
    interno_custo_mes = et.drop(list(ETAPAS_DE_FORA))["custo_brl"].sum() / meses
    return {
        "tipos": records(tipos),
        "celulas": records(tm[["tipo_id", "motivo_id", "cascos_refugados", "custo_brl", "taxa_pct", "pct_custo"]]),
        "motivos": records(motivos),
        "etapas": records(etapas[["etapa_id", "cascos_refugados", "custo_brl", "pct", "pct_acum"]]),
        "mensal": records(mensal),
        "premissas": {
            "cascos_mes": ref.VASILHAME["cascos_mes"],
            "taxa_base_refugo_pct": ref.VASILHAME["taxa_base_refugo"] * 100,
            "meses": meses,
            "periodo_inicio": mensal["periodo"].iloc[0],
            "periodo_fim": mensal["periodo"].iloc[-1],
            "seed": ref.SEED_VASILHAME,
        },
        "achados": {
            "refugados_mes": tipos["cascos_refugados"].sum() / meses,
            "custo_mes_brl": tipos["custo_brl"].sum() / meses,
            "cascos_mes": total_cascos / meses,
            "taxa_pct": tipos["cascos_refugados"].sum() / total_cascos * 100,
            "pior_tipo": pior["tipo_id"],
            "pior_taxa_pct": pior["taxa_pct"],
            "pior_pct_cascos": pior["pct_cascos"],
            "pior_pct_custo": pior["pct_custo"],
            "melhor_tipo": melhor["tipo_id"],
            "melhor_taxa_pct": melhor["taxa_pct"],
            "pior_vs_melhor": pior["taxa_pct"] / melhor["taxa_pct"],
            "top_motivo": motivos.iloc[0]["motivo_id"],
            "top_motivo_pct": motivos.iloc[0]["pct"],
            "de_fora_pct": de_fora,
            "interno_pct": 100 - de_fora,
            "economia_interno_mes": interno_custo_mes * REDUCAO_PADRAO / 100,
            "reducao_pct": REDUCAO_PADRAO,
            "pico_periodo": mensal.loc[mensal["cascos_refugados"].idxmax(), "periodo"],
            "pico_refugados": mensal["cascos_refugados"].max(),
        },
    }


def build_simulador(cm: pd.DataFrame) -> dict:
    return {
        "caixas_mes": records(cm),
        "precos": PRECOS,
        "reducao_padrao": REDUCAO_PADRAO,
        "etapas": list(ref.ETAPAS),
        "embalagens": list(ref.EMBALAGENS),
    }


def build_findings(meta: dict, pareto: dict, matriz: dict, tendencia: dict, cm: pd.DataFrame) -> dict:
    """Os 3 achados e as 3 ações do resumo, com os números que o site formata nos dois idiomas."""
    combos = pd.DataFrame(pareto["combos"])
    top3 = combos.head(3)
    emb = pd.DataFrame(matriz["embalagens"]).set_index("embalagem_id")
    var = tendencia["var_final_pct"]
    var_aj = tendencia["var_final_ajustada_pct"]
    outras = [v for k, v in var.items() if k != "separacao"]
    outras_aj = [v for k, v in var_aj.items() if k != "separacao"]

    eco_separacao = metrics.economia_simulada(cm, PRECOS, REDUCAO_PADRAO, etapa="separacao")
    eco_long_neck = metrics.economia_simulada(cm, PRECOS, REDUCAO_PADRAO, embalagem="long_neck")
    eco_top = sum(
        metrics.economia_simulada(
            cm[cm["etapa_id"] == r.etapa_id].assign(
                caixas=lambda d, r=r: d["caixas"] * _fracao_motivo(combos, r.motivo_id, r.etapa_id)
            ),
            PRECOS,
            REDUCAO_PADRAO,
        )
        for r in top3.itertuples()
    )
    return {
        "achados": {
            "top3_pct": top3["pct"].sum(),
            "top3": records(top3[["motivo_id", "etapa_id", "pct"]]),
            "combos_ate_80": pareto["combos_ate_80"],
            "long_neck_pct_custo": emb.loc["long_neck", "pct_custo"],
            "long_neck_pct_volume": emb.loc["long_neck", "pct_volume"],
            "long_neck_taxa_pct": emb.loc["long_neck", "taxa_pct"],
            "lata_taxa_pct": emb.loc["lata", "taxa_pct"],
            "separacao_var_pct": var["separacao"],
            "outras_var_media_pct": sum(outras) / len(outras),
            "separacao_var_ajustada_pct": var_aj["separacao"],
            "outras_var_ajustada_media_pct": sum(outras_aj) / len(outras_aj),
            "tendencia_plantada_pct": (ref.TENDENCIA_ETAPA["separacao"] - 1) * 100,
        },
        "acoes": {
            "reducao_pct": REDUCAO_PADRAO,
            "economia_separacao_mes": eco_separacao,
            "economia_long_neck_mes": eco_long_neck,
            "economia_top3_mes": eco_top,
        },
        "custo_medio_mensal_brl": meta["custo_medio_mensal_brl"],
    }


def _fracao_motivo(combos: pd.DataFrame, motivo: str, etapa: str) -> float:
    """Parte das caixas avariadas de uma etapa que vem de um motivo (para isolar a economia de uma combinação)."""
    na_etapa = combos[combos["etapa_id"] == etapa]
    return float(na_etapa.loc[na_etapa["motivo_id"] == motivo, "caixas"].sum() / na_etapa["caixas"].sum())


def build_sql() -> dict:
    out = {}
    for key, nome in QUERIES.items():
        texto = sql_text(key)
        titulo = texto.splitlines()[0].removeprefix("-- ").strip()
        out[key] = {"arquivo": f"sql/analysis/{nome}.sql", "titulo": titulo, "sql": texto}
    return out


# ---------------------------------------------------------------- resumo executivo


def brl(valor: float) -> str:
    return "R$ " + f"{valor:,.0f}".replace(",", ".")


def pct(valor: float, casas: int = 0) -> str:
    return f"{valor:.{casas}f}%".replace(".", ",")


def inteiro(valor: float) -> str:
    return f"{valor:,.0f}".replace(",", ".")


def vezes(valor: float) -> str:
    return f"{valor:.1f}×".replace(".", ",")


def write_resumo(meta: dict, findings: dict, real: dict, sens: dict) -> Path:
    a, c = findings["achados"], findings["acoes"]
    f, n = sens["faixas"], sens["nulo"]
    nomes = [f"{ref.MOTIVOS[t['motivo_id']].lower()} {ref.ETAPAS[t['etapa_id']]['em']}" for t in a["top3"]]

    def intervalo(chave: str, casas: int = 0) -> str:
        return f"{pct(f[chave]['p5'], casas)} a {pct(f[chave]['p95'], casas)}"

    texto = f"""# Resumo executivo · Armazém Analytics v1 (refugo e avarias)

> Volumes **reais** de cerveja e barris (Montgomery County, {meta["periodo_inicio"]} a {meta["periodo_fim"]}, {meta["meses"]} meses com dado).
> Avarias e preços **simulados** (seed {meta["seed"]}), com premissas em `src/referencias.py`. Gerado por `src/export_web.py`.
> Intervalos: p5–p95 de {sens["rodadas"]} simulações com premissas sorteadas em faixas plausíveis (`src/sensitivity.py`).

**Perda estimada:** {brl(meta["custo_medio_mensal_brl"])} por mês ({pct(meta["taxa_pct"], 2)} das caixas movimentadas).

## O que o dado real mostra (sem simulação)

- **O mix mudou:** a lata foi de {pct(real["lata_inicio_pct"])} para {pct(real["lata_fim_pct"])} do volume ({real["ano_inicio"]}→{real["ano_fim"]}); o long neck, de {pct(real["long_neck_inicio_pct"])} para {pct(real["long_neck_fim_pct"])}.
- **O volume é concentrado:** {real["itens_a"]} de {inteiro(real["itens_total"])} itens somam {pct(real["pct_volume_a"])} das caixas.
- **Estornos são raros** ({pct(real["estornos_taxa_pct"], 3)} das caixas), mas o barril estorna cerca de 10× mais que lata e long neck.

## 3 achados (sobre a camada simulada)

1. **{pct(a["top3_pct"])} do custo vem de 3 combinações** ({intervalo("top3_pct")}): {nomes[0]}, {nomes[1]} e {nomes[2]}. Este achado depende sobretudo de quanto da avaria cai na separação, que é premissa.
2. **Long neck é {pct(a["long_neck_pct_custo"])} do custo com {pct(a["long_neck_pct_volume"])} do volume** ({intervalo("long_neck_pct_custo")}). É o achado mais robusto: vale em todas as faixas testadas.
3. **A taxa bruta engana:** na separação ela sobe {pct(a["separacao_var_pct"])} e nas outras etapas cai {pct(abs(a["outras_var_media_pct"]))}, mas parte disso é só a troca de long neck por lata. **Ajustada por mix**, a separação sobe {pct(a["separacao_var_ajustada_pct"])} e as outras ficam estáveis ({pct(a["outras_var_ajustada_media_pct"])}). A simulação embute +{pct(a["tendencia_plantada_pct"])} na separação: o método recupera a alta plantada (erro mediano de {pct(sens["recuperacao"]["erro_mediano_pp"], 1).replace("%", " p.p.")}), e sem alta plantada a taxa ajustada fica entre {pct(n["foco_var_ajustada_pct"]["p5"])} e {pct(n["foco_var_ajustada_pct"]["p95"])}.

## 3 ações

1. **Separação:** treinamento de manuseio e caixa plástica para fracionado de vidro.
2. **Long neck:** filme stretch extra e cantoneira no palete de vidro, separando lata de vidro na montagem.
3. **Indicador:** acompanhar a taxa de avaria **ajustada por mix**, não a bruta, para não confundir troca de embalagem com melhora de processo.

## Quanto economiza (reduzindo {c["reducao_pct"]}%)

| Frente | Economia por mês |
|---|---|
| Toda a avaria na separação | {brl(c["economia_separacao_mes"])} |
| Toda a avaria de long neck | {brl(c["economia_long_neck_mes"])} |
| Só as 3 combinações principais | {brl(c["economia_top3_mes"])} |

Premissa: preço médio por caixa de {", ".join(f"{v['nome'].lower()} {brl(v['preco_caixa_brl'])}" for v in ref.EMBALAGENS.values())}.
"""
    RESUMO.parent.mkdir(parents=True, exist_ok=True)
    RESUMO.write_text(texto, encoding="utf-8")
    return RESUMO


def write_resumo_v2(inv: dict) -> Path:
    a, p = inv["achados"], inv["premissas"]
    linhas = "\n".join(
        f"| {f['classe']} | {f['itens_ativos']} | a cada {f['intervalo_dias']} dias | {pct(f['ira_mensal_pct'])} → {pct(f['ira_recomendada_pct'])} | {brl(f['custo_mes_brl'])} |"
        for f in inv["frequencia"]
    )
    texto = f"""# Resumo executivo · Armazém Analytics v2 (acuracidade de inventário)

> Giro e classe ABC **reais** (Montgomery County). Estoque em sistema, posições e divergências **simulados**
> (premissas em `src/referencias.py`, `INVENTARIO`). Gerado por `src/export_web.py`.

## 3 achados

1. **A curva A é onde o estoque erra:** contando todo mês, a IRA (contagens que batem com o sistema) é {pct(a["ira_a_mensal_pct"])} na A e {pct(a["ira_c_mensal_pct"], 1)} na C. Erro por caixa é igual nas classes; a A erra mais porque movimenta mais.
2. **{pct(a["avaria_nao_baixada_pct"])} do valor divergente é avaria não baixada:** a perda da v1 que ninguém lança vira erro de estoque. Depende da premissa de que {pct(p["fracao_avaria_nao_baixada"] * 100)} das avarias não são lançadas.
3. **O modelo bate com a simulação:** a regra de frequência prevê {pct(a["ira_a_modelo_mensal_pct"], 1)} de IRA mensal na A, contra {pct(a["ira_a_mensal_pct"], 1)} medidos.

## Frequência recomendada (meta de IRA {pct(p["ira_meta_pct"])})

| Classe | Itens ativos | Contagem | IRA (mensal → recomendada) | Custo/mês |
|---|---|---|---|---|
{linhas}

**Total:** {brl(a["custo_recomendado_mes"])} por mês, contra {brl(a["custo_todos_mensal_mes"])} contando tudo todo mês, com a IRA da curva A subindo para {pct(a["ira_a_recomendada_pct"])}.

## Ações

1. **Baixa de avaria no ato:** registrar a avaria na hora em que acontece (liga a v1 à v2).
2. **Contagem cíclica por classe:** A a cada {a["intervalo_a"]} dias, B a cada {a["intervalo_b"]}, C a cada {a["intervalo_c"]}.
3. **Indicador:** acompanhar a IRA por classe, não a média geral, que esconde a curva A atrás de milhares de itens C.
"""
    RESUMO_V2.write_text(texto, encoding="utf-8")
    return RESUMO_V2


def main() -> None:
    con = load.build(":memory:")
    q = run_queries(con)
    cm = caixas_mes(con)
    meta = build_meta(q, con)
    pareto = build_pareto(q)
    matriz = build_matriz(q, con)
    tendencia = build_tendencia(q)
    findings = build_findings(meta, pareto, matriz, tendencia, cm)
    real = build_real(q)
    inventario = build_inventario(q)
    vasilhame = build_vasilhame(q, con)
    sens = json.loads(SENSIBILIDADE.read_text(encoding="utf-8"))
    payloads = {
        "meta": meta,
        "pareto": pareto,
        "mensal": build_mensal(q),
        "matriz": matriz,
        "tendencia": tendencia,
        "abc": build_abc(q),
        "real": real,
        "inventario": inventario,
        "vasilhame": vasilhame,
        "simulador": build_simulador(cm),
        "findings": findings,
        "sql": build_sql(),
    }
    for nome, payload in payloads.items():
        write(nome, payload)
    write_resumo(meta, findings, real, sens)
    write_resumo_v2(inventario)
    con.close()
    print(f"{len(payloads)} JSONs em {WEB_DATA_DIR} e resumo em {RESUMO}")


if __name__ == "__main__":
    main()
