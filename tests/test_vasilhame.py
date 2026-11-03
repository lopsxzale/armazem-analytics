"""Vasilhame retornável: simulação reproduzível e coerente com as premissas, e o JSON do site batendo com o banco."""

import json

import pandas as pd
import pytest

import export_web
import referencias as ref
import simulate_vasilhame as sv


def test_premissas_somam_1():
    assert sum(v["participacao"] for v in ref.TIPOS_VASILHAME.values()) == pytest.approx(1)
    assert sum(v["participacao"] for v in ref.ETAPAS_VASILHAME.values()) == pytest.approx(1)
    for tipo in ref.TIPOS_VASILHAME:
        assert sum(sv.pesos_etapa_motivo(tipo).values()) == pytest.approx(1)


def test_motivos_e_etapas_conhecidos():
    for etapa, pesos in ref.PESO_MOTIVO_ETAPA_VASILHAME.items():
        assert etapa in ref.ETAPAS_VASILHAME
        assert set(pesos) <= set(ref.MOTIVOS_VASILHAME)
    for tipo, pesos in ref.PESO_MOTIVO_TIPO_VASILHAME.items():
        assert tipo in ref.TIPOS_VASILHAME
        assert set(pesos) <= set(ref.MOTIVOS_VASILHAME)


def test_periodos_terminam_no_fim():
    p = sv.periodos("2026-08", 12)
    assert len(p) == 12 and p[0] == "2025-09" and p[-1] == "2026-08"


def test_simulacao_reproduzivel():
    r1, f1 = sv.simular(seed=7)
    r2, f2 = sv.simular(seed=7)
    pd.testing.assert_frame_equal(r1, r2)
    pd.testing.assert_frame_equal(f1, f2)


def test_simulacao_coerente():
    retorno, refugo = sv.simular()
    assert set(retorno["tipo_id"]) == set(ref.TIPOS_VASILHAME)
    assert set(refugo["etapa_id"]) == set(ref.ETAPAS_VASILHAME)
    assert set(refugo["motivo_id"]) == set(ref.MOTIVOS_VASILHAME)
    assert (refugo["cascos"] > 0).all()
    assert retorno["periodo"].nunique() == ref.VASILHAME["meses"]
    # refugo nunca passa dos cascos do tipo no mês
    soma = refugo.groupby(["periodo", "tipo_id"])["cascos"].sum()
    base = retorno.set_index(["periodo", "tipo_id"])["cascos"]
    assert (soma <= base.loc[soma.index]).all()
    # a taxa geral fica perto da premissa (taxa base x multiplicador médio ponderado)
    esperado = ref.VASILHAME["taxa_base_refugo"] * sum(
        v["participacao"] * v["mult_refugo"] for v in ref.TIPOS_VASILHAME.values()
    )
    assert refugo["cascos"].sum() / retorno["cascos"].sum() == pytest.approx(esperado, rel=0.05)


def test_parquet_versionado_e_o_da_simulacao():
    retorno, refugo = sv.simular()
    pd.testing.assert_frame_equal(retorno, pd.read_parquet(sv.SIM_DIR / "vasilhame_retorno.parquet"))
    pd.testing.assert_frame_equal(refugo, pd.read_parquet(sv.SIM_DIR / "vasilhame_refugo.parquet"))


@pytest.fixture(scope="module")
def site():
    return json.loads((export_web.WEB_DATA_DIR / "vasilhame.json").read_text(encoding="utf-8"))


def test_json_fecha_100_e_bate_com_a_simulacao(site):
    retorno, refugo = sv.simular()
    tipos = pd.DataFrame(site["tipos"])
    assert tipos["cascos_refugados"].sum() == refugo["cascos"].sum()
    assert tipos["cascos_tipo"].sum() == retorno["cascos"].sum()
    assert tipos["pct_custo"].sum() == pytest.approx(100, abs=0.05)
    assert tipos["pct_cascos"].sum() == pytest.approx(100, abs=0.05)
    etapas = pd.DataFrame(site["etapas"])
    assert etapas["pct"].sum() == pytest.approx(100, abs=0.05)
    assert etapas["pct_acum"].iloc[-1] == pytest.approx(100, abs=0.01)
    assert list(etapas["etapa_id"]) == list(ref.ETAPAS_VASILHAME)
    a = site["achados"]
    assert a["de_fora_pct"] + a["interno_pct"] == pytest.approx(100)
    assert a["pior_taxa_pct"] == tipos["taxa_pct"].max()
    mensal = pd.DataFrame(site["mensal"])
    assert mensal["cascos_refugados"].sum() == refugo["cascos"].sum()
