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

QUERIES = {
    "q1": "q1_pareto_motivo_etapa",
    "q2": "q2_custo_mensal",
    "q3": "q3_embalagem_etapa",
    "q4": "q4_tendencia_etapa",
    "q5": "q5_curva_abc",
    "q6": "q6_top_itens",
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
    ultima = t[t["janela"] == t["janela"].max()].set_index("etapa_id")["var_vs_inicio_pct"]
    return {
        "janelas": [{"id": k, "rotulo": v} for k, v in ref.JANELAS.items()],
        "series": records(t),
        "var_final_pct": ultima.to_dict(),
    }


def build_abc(q: dict[str, pd.DataFrame]) -> dict:
    return {"classes": records(q["q5"]), "top_itens": records(q["q6"])}


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
    outras = [v for k, v in var.items() if k != "separacao"]

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


def vezes(valor: float) -> str:
    return f"{valor:.1f}×".replace(".", ",")


def write_resumo(meta: dict, findings: dict) -> Path:
    a, c = findings["achados"], findings["acoes"]
    nomes = [f"{ref.MOTIVOS[t['motivo_id']].lower()} {ref.ETAPAS[t['etapa_id']]['em']}" for t in a["top3"]]
    texto = f"""# Resumo executivo · Armazém Analytics v1 (refugo e avarias)

> Volumes reais de cerveja e barris (Montgomery County, {meta["periodo_inicio"]} a {meta["periodo_fim"]}, {meta["meses"]} meses com dado).
> Avarias e preços **simulados** (seed {meta["seed"]}), com premissas em `src/referencias.py`. Gerado por `src/export_web.py`.

**Perda estimada:** {brl(meta["custo_medio_mensal_brl"])} por mês ({pct(meta["taxa_pct"], 2)} das caixas movimentadas).

## 3 achados

1. **{pct(a["top3_pct"])} do custo vem de 3 combinações:** {nomes[0]}, {nomes[1]} e {nomes[2]}. {a["combos_ate_80"]} combinações motivo × etapa explicam 80% da perda.
2. **Long neck é {pct(a["long_neck_pct_custo"])} do custo com {pct(a["long_neck_pct_volume"])} do volume.** A taxa de avaria do vidro ({pct(a["long_neck_taxa_pct"], 2)}) é {vezes(a["long_neck_taxa_pct"] / a["lata_taxa_pct"])} a da lata.
3. **A avaria na separação cresceu {pct(a["separacao_var_pct"])}** entre a primeira e a última janela da série, enquanto as outras etapas variaram {pct(a["outras_var_media_pct"])} em média.

## 3 ações

1. **Separação:** treinamento de manuseio e caixa plástica para fracionado de vidro.
2. **Long neck:** filme stretch extra e cantoneira no palete de vidro, separando lata de vidro na montagem.
3. **Carregamento e armazenagem:** padrão de amarração e limite de empilhamento sinalizado na posição.

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


def main() -> None:
    con = load.build(":memory:")
    q = run_queries(con)
    cm = caixas_mes(con)
    meta = build_meta(q, con)
    pareto = build_pareto(q)
    matriz = build_matriz(q, con)
    tendencia = build_tendencia(q)
    findings = build_findings(meta, pareto, matriz, tendencia, cm)
    payloads = {
        "meta": meta,
        "pareto": pareto,
        "mensal": build_mensal(q),
        "matriz": matriz,
        "tendencia": tendencia,
        "abc": build_abc(q),
        "simulador": build_simulador(cm),
        "findings": findings,
        "sql": build_sql(),
    }
    for nome, payload in payloads.items():
        write(nome, payload)
    write_resumo(meta, findings)
    con.close()
    print(f"{len(payloads)} JSONs em {WEB_DATA_DIR} e resumo em {RESUMO}")


if __name__ == "__main__":
    main()
