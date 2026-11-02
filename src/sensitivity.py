"""Sensibilidade dos achados às premissas da simulação (web/src/data/sensibilidade.json).

Os achados da v1 dependem de premissas (quanto o vidro quebra a mais, quanto da avaria cai na
separação, se há tendência). Aqui cada premissa varia numa faixa plausível, com seeds diferentes,
e cada achado ganha um intervalo (p5-p95). Dois cenários:

- "faixas": premissas sorteadas nas FAIXAS abaixo (incerteza sobre o mundo);
- "nulo": premissas da v1, mas SEM tendência embutida. Mostra quanto de "crescimento" aparece só por
  ruído e, portanto, se o método detectaria uma tendência que não existe.

Uso: python src/sensitivity.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

import metrics
import referencias as ref
import simulate

ROOT_DIR = Path(__file__).resolve().parent.parent
APP_DIR = ROOT_DIR / "data" / "app"
OUT = ROOT_DIR / "web" / "src" / "data" / "sensibilidade.json"

RODADAS = 120
RODADAS_NULO = 60
# Faixas plausíveis para as premissas que mais mexem nos achados. (premissa)
FAIXAS = {
    "mult_long_neck": (1.4, 2.4),
    "participacao_separacao": (0.30, 0.50),
    "tendencia_separacao": (1.0, 1.6),
}
PRECOS = {k: v["preco_caixa_brl"] for k, v in ref.EMBALAGENS.items()}


def premissas_sorteadas(rng: np.random.Generator) -> tuple[dict, dict]:
    p = simulate.premissas_padrao()
    mult = rng.uniform(*FAIXAS["mult_long_neck"])
    sep = rng.uniform(*FAIXAS["participacao_separacao"])
    tend = rng.uniform(*FAIXAS["tendencia_separacao"])
    p["mult_avaria"] = {**p["mult_avaria"], "long_neck": mult}
    # A separação fica com `sep`; as outras etapas dividem o resto na mesma proporção de antes.
    resto = {k: v for k, v in p["participacao"].items() if k != "separacao"}
    escala = (1 - sep) / sum(resto.values())
    p["participacao"] = {**{k: v * escala for k, v in resto.items()}, "separacao": sep}
    p["tendencia"] = {"separacao": tend}
    return p, {"mult_long_neck": mult, "participacao_separacao": sep, "tendencia_separacao": tend}


def rodar(mov: pd.DataFrame, itens: pd.DataFrame, n: int, nulo: bool, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    linhas = []
    for _ in range(n):
        if nulo:
            p, sorteio = {**simulate.premissas_padrao(), "tendencia": {}}, {}
        else:
            p, sorteio = premissas_sorteadas(rng)
        av = simulate.simular(mov, itens, seed=int(rng.integers(1 << 31)), premissas=p)
        linhas.append({**sorteio, **metrics.achados(av, mov, itens, PRECOS, ref.JANELA_CORTES)})
    return pd.DataFrame(linhas)


def faixa(s: pd.Series) -> dict[str, float]:
    return {"p5": s.quantile(0.05), "p50": s.median(), "p95": s.quantile(0.95)}


def resumir(faixas: pd.DataFrame, nulo: pd.DataFrame) -> dict:
    achados = [
        "top3_pct",
        "long_neck_pct_custo",
        "foco_var_pct",
        "foco_var_ajustada_pct",
        "outras_var_ajustada_media_pct",
    ]
    # Tendência embutida esperada entre o meio da 1ª e da última janela: compara com o que o método detectou.
    plantada = (faixas["tendencia_separacao"] - 1) * 100
    erro = faixas["foco_var_ajustada_pct"] - plantada
    return {
        "rodadas": len(faixas),
        "rodadas_nulo": len(nulo),
        "faixas_premissas": {k: {"min": a, "max": b} for k, (a, b) in FAIXAS.items()},
        "faixas": {a: faixa(faixas[a]) for a in achados},
        "nulo": {a: faixa(nulo[a]) for a in achados},
        "recuperacao": {
            "erro_mediano_pp": float(erro.median()),
            "erro_absoluto_p90_pp": float(erro.abs().quantile(0.9)),
        },
        # Quanto cada premissa explica de cada achado (correlação de Spearman entre premissa sorteada e achado).
        "dependencia": {a: {k: float(faixas[k].rank().corr(faixas[a].rank())) for k in FAIXAS} for a in achados},
    }


def main() -> None:
    mov = pd.read_parquet(APP_DIR / "movimentos_mensais.parquet")
    itens = pd.read_parquet(APP_DIR / "itens.parquet")
    faixas = rodar(mov, itens, RODADAS, nulo=False, seed=ref.SEED)
    nulo = rodar(mov, itens, RODADAS_NULO, nulo=True, seed=ref.SEED + 1)
    resumo = resumir(faixas, nulo)
    OUT.parent.mkdir(parents=True, exist_ok=True)

    def limpo(v):
        if isinstance(v, dict):
            return {k: limpo(x) for k, x in v.items()}
        return round(float(v), 3) if isinstance(v, float | np.floating) else v

    OUT.write_text(json.dumps(limpo(resumo), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for nome, f in resumo["faixas"].items():
        n = resumo["nulo"][nome]
        print(f"{nome:32s} faixas p5-p95 {f['p5']:7.1f} a {f['p95']:7.1f} | nulo {n['p5']:7.1f} a {n['p95']:7.1f}")
    print("recuperação:", resumo["recuperacao"])


if __name__ == "__main__":
    main()
