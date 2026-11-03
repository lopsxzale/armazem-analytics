"""Refugo de vasilhame: gera data/sim/vasilhame_retorno.parquet e data/sim/vasilhame_refugo.parquet.

Camada 100% simulada (seed fixo), com as premissas de referencias.VASILHAME e companhia:

- cascos por mês e tipo = cascos_mes x sazonalidade do mês x participação do tipo x ruído (±5%);
- refugo esperado = cascos x taxa base x multiplicador do tipo, repartido entre etapa e motivo
  (participação da etapa x peso do motivo na etapa x peso do motivo no tipo);
- cada célula periodo x tipo x etapa x motivo é um sorteio Poisson.

Uso: python src/simulate_vasilhame.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

import referencias as ref

ROOT_DIR = Path(__file__).resolve().parent.parent
SIM_DIR = ROOT_DIR / "data" / "sim"


def periodos(fim: str, meses: int) -> list[str]:
    """Os `meses` períodos 'AAAA-MM' que terminam em `fim`."""
    return [p.strftime("%Y-%m") for p in pd.period_range(end=fim, periods=meses, freq="M")]


def pesos_etapa_motivo(tipo: str) -> dict[tuple[str, str], float]:
    """Probabilidade de um refugo do tipo cair em cada (etapa, motivo). Soma 1."""
    out: dict[tuple[str, str], float] = {}
    ajuste = ref.PESO_MOTIVO_TIPO_VASILHAME[tipo]
    for etapa, cfg in ref.ETAPAS_VASILHAME.items():
        pesos = {m: w * ajuste.get(m, 1.0) for m, w in ref.PESO_MOTIVO_ETAPA_VASILHAME[etapa].items()}
        total = sum(pesos.values())
        for motivo, w in pesos.items():
            out[(etapa, motivo)] = cfg["participacao"] * w / total
    return out


def simular(seed: int = ref.SEED_VASILHAME) -> tuple[pd.DataFrame, pd.DataFrame]:
    p = ref.VASILHAME
    rng = np.random.default_rng(seed)
    retorno, refugo = [], []
    for periodo in periodos(p["periodo_fim"], p["meses"]):
        ano, mes = int(periodo[:4]), int(periodo[5:])
        for tipo, cfg in ref.TIPOS_VASILHAME.items():
            ruido = rng.normal(1.0, 0.05)
            cascos = int(round(p["cascos_mes"] * p["sazonalidade"][mes] * cfg["participacao"] * ruido))
            retorno.append({"periodo": periodo, "ano": ano, "mes": mes, "tipo_id": tipo, "cascos": cascos})
            esperado = cascos * p["taxa_base_refugo"] * cfg["mult_refugo"]
            for (etapa, motivo), w in pesos_etapa_motivo(tipo).items():
                n = int(rng.poisson(esperado * w))
                if n > 0:
                    refugo.append(
                        {
                            "periodo": periodo,
                            "ano": ano,
                            "mes": mes,
                            "tipo_id": tipo,
                            "etapa_id": etapa,
                            "motivo_id": motivo,
                            "cascos": n,
                        }
                    )
    return pd.DataFrame(retorno), pd.DataFrame(refugo)


def main() -> None:
    retorno, refugo = simular()
    SIM_DIR.mkdir(parents=True, exist_ok=True)
    retorno.to_parquet(SIM_DIR / "vasilhame_retorno.parquet", index=False)
    refugo.to_parquet(SIM_DIR / "vasilhame_refugo.parquet", index=False)
    taxa = refugo.groupby("tipo_id")["cascos"].sum() / retorno.groupby("tipo_id")["cascos"].sum() * 100
    print(f"{retorno['cascos'].sum():,} cascos, {refugo['cascos'].sum():,} refugados")
    print(taxa.round(2).to_string())


if __name__ == "__main__":
    main()
