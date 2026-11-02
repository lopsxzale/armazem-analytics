"""Funções puras de métricas. Sem I/O: recebem DataFrames/dicts e devolvem resultados.

As mesmas fórmulas são usadas no export do site e replicadas no simulador (web/src/components/simulator.tsx).
"""

from __future__ import annotations

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
    """Classe A/B/C de cada item pelo volume acumulado (A até 80%, B até 95%, C o resto)."""
    ordem = volumes.sort_values(ascending=False, kind="stable")
    acum = ordem.cumsum() / ordem.sum()
    classe = pd.Series("C", index=ordem.index)
    classe[acum <= cortes[1]] = "B"
    classe[acum <= cortes[0]] = "A"
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
