"""v2: simulação de inventário e regra de frequência de contagem."""

import math

import pandas as pd
import pytest

import metrics
import referencias as ref
import simulate_inventario as si


@pytest.fixture(scope="module")
def entrada():
    mov = pd.DataFrame(
        [
            {"periodo": p, "item_code": i, "caixas_movimentadas": v}
            for p in ("2019-01", "2019-02", "2019-03")
            for i, v in (("a", 5000.0), ("b", 800.0), ("c", 50.0), ("d", 10.0))
        ]
    )
    avarias = pd.DataFrame({"periodo": ["2019-01", "2019-02"], "item_code": ["a", "a"], "caixas": [40, 40]})
    return mov, avarias


def test_poisson_cdf():
    assert metrics.poisson_cdf(0, 2.0) == pytest.approx(math.exp(-2))
    assert metrics.poisson_cdf(2, 1.0) == pytest.approx(math.exp(-1) * 2.5)
    assert metrics.poisson_cdf(50, 3.0) == pytest.approx(1.0)


def test_frequencia_escolhe_o_maior_intervalo_que_atinge_a_meta():
    base = pd.DataFrame(
        [
            {
                "classe": "A",
                "item_meses": 100,
                "estoque_medio": 50.0,
                "posicoes": 2,
                "itens_ativos": 10,
                "eventos_avaria": 30,
                "eventos_erro": 0,
            }
        ]
    )
    premissas = {**ref.INVENTARIO, "tolerancia_pct": 0.0}  # tolerância de 1 caixa = 1 evento de avaria
    f = metrics.frequencia_recomendada(base, premissas).iloc[0]
    eventos_dia = 30 / 100 / 30
    validos = [d for d in ref.INVENTARIO["intervalos_dias"] if metrics.ira_esperada(eventos_dia, 1, d) >= 95]
    assert f["intervalo_dias"] == max(validos)
    assert f["contagens_mes"] == pytest.approx(10 * 2 * 30 / f["intervalo_dias"])


def test_simulacao_reproduzivel_e_coerente(entrada):
    mov, avarias = entrada
    c1, d1 = si.simular(mov, avarias, seed=1)
    c2, d2 = si.simular(mov, avarias, seed=1)
    pd.testing.assert_frame_equal(d1, d2)
    assert set(d1["causa_id"]) <= set(ref.CAUSAS)
    nao_baixada = d1[d1["causa_id"] == "avaria_nao_baixada"]
    assert (nao_baixada["caixas"] < 0).all()  # físico sempre abaixo do sistema
    assert -nao_baixada["caixas"].sum() <= avarias["caixas"].sum()
    assert (c1["estoque_sistema"] >= 1).all()
    assert c1.set_index("item_code")["classe"].to_dict()["a"] == "A"
