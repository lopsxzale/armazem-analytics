"""v2: gera a camada simulada de inventário (data/sim/contagens.parquet e data/sim/divergencias.parquet).

Base real: giro mensal de cada item (Montgomery) e classe ABC pelo volume. Sobre ela, com seed fixo e as
premissas de referencias.INVENTARIO:

- estoque em sistema de cada item-mês = caixas movimentadas no mês x cobertura da classe (dias) / 30;
- eventos de divergência (físico - sistema), por causa:
  - erro de separação e erro de recebimento: Poisson sobre as caixas movimentadas, tamanho geométrico,
    sinal + ou - (o item errado fica com sobra, o certo com falta);
  - avaria não baixada: parte das avarias da v1 (data/sim/avarias.parquet) que ninguém lançou no sistema,
    sempre negativa (o físico tem menos do que o sistema diz).

Uso: python src/simulate_inventario.py   (depois de simulate.py)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

import metrics
import referencias as ref

ROOT_DIR = Path(__file__).resolve().parent.parent
APP_DIR = ROOT_DIR / "data" / "app"
SIM_DIR = ROOT_DIR / "data" / "sim"
SEED_INVENTARIO = ref.SEED + 100


def classes_abc(mov: pd.DataFrame) -> pd.Series:
    """Classe ABC de cada item pelo volume real total (mesma regra da q5)."""
    volumes = mov.groupby("item_code")["caixas_movimentadas"].sum()
    return metrics.curva_abc(volumes[volumes > 0], ref.CORTES_ABC)


def _erros(rng: np.random.Generator, caixas: np.ndarray, taxa: float, tamanho: float) -> tuple[np.ndarray, np.ndarray]:
    """Eventos de erro por linha (Poisson) e a soma com sinal das caixas erradas (tamanho geométrico, sinal ±)."""
    eventos = rng.poisson(caixas * taxa)
    total = int(eventos.sum())
    tamanhos = rng.geometric(1 / tamanho, total) * rng.choice([-1, 1], total)
    linha = np.repeat(np.arange(len(caixas)), eventos)
    liquido = np.bincount(linha, weights=tamanhos, minlength=len(caixas)).astype(int)
    return eventos, liquido


def simular(mov: pd.DataFrame, avarias: pd.DataFrame, seed: int = SEED_INVENTARIO) -> tuple[pd.DataFrame, pd.DataFrame]:
    p = ref.INVENTARIO
    rng = np.random.default_rng(seed)
    classe = classes_abc(mov)
    base = mov[mov["caixas_movimentadas"] > 0][["periodo", "item_code", "caixas_movimentadas"]].copy()
    base["classe"] = base["item_code"].map(classe)
    base["estoque_sistema"] = np.maximum(
        1, np.round(base["caixas_movimentadas"] * base["classe"].map(p["cobertura_dias"]) / 30)
    ).astype(int)
    base["posicoes"] = base["classe"].map(p["posicoes"]).astype(int)
    base = base.reset_index(drop=True)

    caixas = base["caixas_movimentadas"].to_numpy()
    partes = []
    for causa, taxa in (("erro_separacao", p["taxa_erro_separacao"]), ("erro_recebimento", p["taxa_erro_recebimento"])):
        ev, liq = _erros(rng, caixas, taxa, p["caixas_por_erro"])
        partes.append(base[["periodo", "item_code"]].assign(causa_id=causa, eventos=ev, caixas=liq))

    # Avaria não baixada: cada caixa avariada tem chance `fracao` de nunca ser lançada.
    av = avarias.groupby(["periodo", "item_code"], as_index=False)["caixas"].sum()
    av = base[["periodo", "item_code"]].merge(av, on=["periodo", "item_code"], how="left").fillna({"caixas": 0})
    nao_baixadas = rng.binomial(av["caixas"].astype(int).to_numpy(), p["fracao_avaria_nao_baixada"])
    partes.append(
        base[["periodo", "item_code"]].assign(causa_id="avaria_nao_baixada", eventos=nao_baixadas, caixas=-nao_baixadas)
    )

    div = pd.concat(partes, ignore_index=True)
    div = div[div["eventos"] > 0].sort_values(["periodo", "item_code", "causa_id"]).reset_index(drop=True)
    contagens = base[["periodo", "item_code", "classe", "estoque_sistema", "posicoes"]]
    return contagens, div


def main() -> None:
    mov = pd.read_parquet(APP_DIR / "movimentos_mensais.parquet")
    avarias = pd.read_parquet(SIM_DIR / "avarias.parquet")
    contagens, div = simular(mov, avarias)
    contagens.to_parquet(SIM_DIR / "contagens.parquet", index=False)
    div.to_parquet(SIM_DIR / "divergencias.parquet", index=False)
    print(
        f"{len(contagens):,} contagens item-mês, {len(div):,} linhas de divergência, {div['eventos'].sum():,} eventos"
    )
    print(div.groupby("causa_id")[["eventos", "caixas"]].sum().to_string())


if __name__ == "__main__":
    main()
