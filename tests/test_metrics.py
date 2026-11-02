import pandas as pd
import pytest

import metrics


def test_pareto_ordena_e_acumula_100():
    df = pd.DataFrame({"motivo": ["a", "b", "a", "c"], "custo": [10.0, 50.0, 30.0, 10.0]})
    p = metrics.pareto(df, "custo", "motivo")
    assert list(p["motivo"]) == ["b", "a", "c"]
    assert p["pct"].sum() == pytest.approx(100)
    assert p["pct_acum"].iloc[-1] == pytest.approx(100)
    assert p["pct_acum"].is_monotonic_increasing


def test_itens_ate_80():
    assert metrics.itens_ate(pd.Series([50.0, 79.9, 90.0, 100.0])) == 3
    assert metrics.itens_ate(pd.Series([85.0, 100.0])) == 1


def test_curva_abc():
    volumes = pd.Series({"x": 70.0, "y": 10.0, "z": 15.0, "w": 5.0})
    classe = metrics.curva_abc(volumes)
    # acumulado: x 70%, z 85%, y 95% (corte inclusivo, como no SQL), w 100%
    assert classe.to_dict() == {"x": "A", "y": "B", "z": "B", "w": "C"}


def test_custo_avaria():
    assert metrics.custo_avaria({"lata": 10, "long_neck": 2}, {"lata": 48.0, "long_neck": 96.0}) == 672.0


def test_economia_simulada():
    cm = pd.DataFrame(
        {
            "etapa_id": ["separacao", "separacao", "doca"],
            "embalagem_id": ["lata", "long_neck", "lata"],
            "caixas": [100.0, 50.0, 10.0],
        }
    )
    precos = {"lata": 50.0, "long_neck": 100.0}
    assert metrics.economia_simulada(cm, precos, 10, etapa="separacao") == pytest.approx(1000.0)
    assert metrics.economia_simulada(cm, precos, 50, embalagem="lata") == pytest.approx(2750.0)
    assert metrics.economia_simulada(cm, precos, 0) == 0.0
