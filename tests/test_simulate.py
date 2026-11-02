import numpy as np
import pandas as pd
import pytest

import referencias as ref
import simulate


@pytest.fixture(scope="module")
def entrada():
    periodos = ["2017-06", "2019-01", "2026-08"]
    itens = pd.DataFrame(
        {"item_code": ["1", "2", "3"], "embalagem_id": ["lata", "long_neck", "barril"], "descricao": "", "tipo": "BEER"}
    )
    mov = pd.DataFrame(
        [
            {"periodo": p, "ano": int(p[:4]), "mes": int(p[5:]), "item_code": i, "caixas_movimentadas": 200_000.0}
            for p in periodos
            for i in itens["item_code"]
        ]
    )
    return mov, itens


def test_seed_reproduzivel(entrada):
    a = simulate.simular(*entrada, seed=7)
    b = simulate.simular(*entrada, seed=7)
    pd.testing.assert_frame_equal(a, b)


def test_taxa_perto_da_premissa_e_abaixo_da_fao(entrada):
    mov, itens = entrada
    av = simulate.simular(mov, itens)
    taxa = av["caixas"].sum() / mov["caixas_movimentadas"].sum()
    mult_medio = np.mean([ref.EMBALAGENS[e]["mult_avaria"] for e in itens["embalagem_id"]])
    assert taxa == pytest.approx(ref.TAXA_BASE_AVARIA * mult_medio, rel=0.35)
    assert taxa * 100 < ref.FAO_PERDA_POS_COLHEITA_PCT


def test_vidro_avaria_mais_que_lata(entrada):
    av = simulate.simular(*entrada).merge(entrada[1], on="item_code")
    por_emb = av.groupby("embalagem_id")["caixas"].sum()
    assert por_emb["long_neck"] > por_emb["lata"] > por_emb["barril"]


def test_motivos_respeitam_a_etapa(entrada):
    av = simulate.simular(*entrada)
    for etapa, pesos in ref.PESO_MOTIVO_ETAPA.items():
        motivos = set(av.loc[av["etapa_id"] == etapa, "motivo_id"])
        assert motivos <= set(pesos)


def test_pesos_motivo_somam_um():
    for etapa in ref.ETAPAS:
        for emb in ref.EMBALAGENS:
            assert simulate.pesos_motivo(etapa, emb).sum() == pytest.approx(1.0)


def test_participacao_das_etapas_soma_um():
    assert sum(e["participacao"] for e in ref.ETAPAS.values()) == pytest.approx(1.0)
