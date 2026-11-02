"""Gera a camada simulada de avarias (data/sim/avarias.parquet).

O volume é real (Montgomery, data/app/movimentos_mensais.parquet). As avarias são
simuladas, com seed fixo, a partir das premissas de src/referencias.py:

- caixas avariadas esperadas = caixas movimentadas x TAXA_BASE_AVARIA
  x participação da etapa x multiplicador da embalagem x fator do item x tendência
- o número de caixas avariadas é sorteado por Poisson em torno desse valor;
- as caixas avariadas são divididas entre motivos por uma multinomial, com pesos
  por etapa (PESO_MOTIVO_ETAPA) ajustados pela embalagem (PESO_MOTIVO_EMBALAGEM);
- cada item tem um fator de fragilidade lognormal (média 1), para existir variação
  entre itens da mesma embalagem;
- a etapa em TENDENCIA_ETAPA cresce linearmente do início ao fim do período.

Uso: python src/simulate.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

import referencias as ref

ROOT_DIR = Path(__file__).resolve().parent.parent
APP_DIR = ROOT_DIR / "data" / "app"
SIM_DIR = ROOT_DIR / "data" / "sim"

SIGMA_ITEM = 0.4


def pesos_motivo(etapa: str, embalagem: str) -> np.ndarray:
    """Probabilidade de cada motivo (na ordem de ref.MOTIVOS) para uma etapa e embalagem."""
    base = ref.PESO_MOTIVO_ETAPA[etapa]
    ajuste = ref.PESO_MOTIVO_EMBALAGEM[embalagem]
    w = np.array([base.get(m, 0) * ajuste.get(m, 1.0) for m in ref.MOTIVOS], dtype=float)
    return w / w.sum()


def premissas_padrao() -> dict:
    """Premissas de src/referencias.py num dict que a análise de sensibilidade pode variar."""
    return {
        "taxa_base": ref.TAXA_BASE_AVARIA,
        "mult_avaria": {k: v["mult_avaria"] for k, v in ref.EMBALAGENS.items()},
        "participacao": {k: v["participacao"] for k, v in ref.ETAPAS.items()},
        "tendencia": dict(ref.TENDENCIA_ETAPA),
    }


def fator_tendencia(periodos: pd.Series, fim: float) -> np.ndarray:
    """1,0 no primeiro mês do período e `fim` no último (linear no tempo)."""
    datas = pd.to_datetime(periodos)
    t = (datas - datas.min()) / (datas.max() - datas.min())
    return 1.0 + (fim - 1.0) * t.to_numpy(dtype=float)


def simular(
    mov: pd.DataFrame, itens: pd.DataFrame, seed: int = ref.SEED, premissas: dict | None = None
) -> pd.DataFrame:
    p = premissas or premissas_padrao()
    rng = np.random.default_rng(seed)
    itens = itens.sort_values("item_code").reset_index(drop=True)
    fragilidade = rng.lognormal(-(SIGMA_ITEM**2) / 2, SIGMA_ITEM, len(itens))
    itens = itens.assign(fragilidade=fragilidade)

    base = mov[mov["caixas_movimentadas"] > 0].merge(
        itens[["item_code", "embalagem_id", "fragilidade"]], on="item_code", how="left"
    )
    mult = base["embalagem_id"].map(p["mult_avaria"]).to_numpy()
    motivos = list(ref.MOTIVOS)

    partes = []
    for etapa in ref.ETAPAS:
        lam = (
            base["caixas_movimentadas"].to_numpy()
            * p["taxa_base"]
            * p["participacao"][etapa]
            * mult
            * base["fragilidade"].to_numpy()
            * fator_tendencia(base["periodo"], p["tendencia"].get(etapa, 1.0))
        )
        caixas = rng.poisson(lam)
        tem = caixas > 0
        sub = base.loc[tem, ["periodo", "ano", "mes", "item_code", "embalagem_id"]].copy()
        sub["total"] = caixas[tem]
        for emb, grupo in sub.groupby("embalagem_id"):
            dist = rng.multinomial(grupo["total"].to_numpy(), pesos_motivo(etapa, emb))
            df = pd.DataFrame(dist, columns=motivos, index=grupo.index)
            longo = (
                grupo[["periodo", "ano", "mes", "item_code"]]
                .join(df)
                .melt(id_vars=["periodo", "ano", "mes", "item_code"], var_name="motivo_id", value_name="caixas")
            )
            partes.append(longo[longo["caixas"] > 0].assign(etapa_id=etapa))

    avarias = pd.concat(partes, ignore_index=True)
    avarias["caixas"] = avarias["caixas"].astype(int)
    cols = ["periodo", "ano", "mes", "item_code", "etapa_id", "motivo_id", "caixas"]
    return avarias[cols].sort_values(cols[:-1]).reset_index(drop=True)


def main() -> None:
    mov = pd.read_parquet(APP_DIR / "movimentos_mensais.parquet")
    itens = pd.read_parquet(APP_DIR / "itens.parquet")
    avarias = simular(mov, itens)
    SIM_DIR.mkdir(parents=True, exist_ok=True)
    avarias.to_parquet(SIM_DIR / "avarias.parquet", index=False)
    taxa = avarias["caixas"].sum() / mov["caixas_movimentadas"].sum() * 100
    print(f"{len(avarias):,} linhas de avaria, {avarias['caixas'].sum():,} caixas ({taxa:.2f}% do movimentado)")


if __name__ == "__main__":
    main()
