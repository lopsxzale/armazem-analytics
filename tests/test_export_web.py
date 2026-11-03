"""Contrato dos JSONs do site: estrutura e consistência com as queries e com src/metrics.py.

Os testes leem os JSONs versionados em web/src/data/ (o que o site publica) e
recalculam os números-chave a partir do banco, para que site e análise nunca divirjam.
"""

import json
import math

import pandas as pd
import pytest

import export_web
import load
import metrics
import referencias as ref
import simulate


@pytest.fixture(scope="module")
def site():
    return {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in export_web.WEB_DATA_DIR.glob("*.json")}


@pytest.fixture(scope="module")
def con():
    c = load.build(":memory:")
    yield c
    c.close()


def _sem_nan(valor):
    if isinstance(valor, dict):
        return all(_sem_nan(v) for v in valor.values())
    if isinstance(valor, list):
        return all(_sem_nan(v) for v in valor)
    return not (isinstance(valor, float) and math.isnan(valor))


def test_todos_os_arquivos_que_o_site_importa_existem(site):
    esperados = {
        "meta",
        "pareto",
        "mensal",
        "matriz",
        "tendencia",
        "abc",
        "real",
        "inventario",
        "vasilhame",
        "simulador",
        "findings",
        "sensibilidade",
        "sql",
    }
    assert esperados <= set(site)


def test_json_valido_sem_nan(site):
    for nome, payload in site.items():
        assert _sem_nan(payload), nome


def test_meta_bate_com_o_banco(site, con):
    (caixas,) = con.execute("SELECT SUM(caixas) FROM avarias").fetchone()
    (meses,) = con.execute("SELECT COUNT(DISTINCT periodo) FROM movimentos_mensais").fetchone()
    assert site["meta"]["caixas_avariadas"] == caixas
    assert site["meta"]["meses"] == meses == len(site["mensal"]["meses"])


def test_pareto_fecha_100(site):
    combos = pd.DataFrame(site["pareto"]["combos"])
    assert combos["pct"].sum() == pytest.approx(100, abs=0.05)
    assert combos["pct_acum"].iloc[-1] == pytest.approx(100, abs=0.01)
    assert site["pareto"]["combos_ate_80"] == metrics.itens_ate(combos["pct_acum"])


def test_ids_conhecidos(site):
    combos = pd.DataFrame(site["pareto"]["combos"])
    assert set(combos["motivo_id"]) <= set(ref.MOTIVOS)
    assert set(combos["etapa_id"]) <= set(ref.ETAPAS)
    celulas = pd.DataFrame(site["matriz"]["celulas"])
    assert set(celulas["embalagem_id"]) <= set(ref.EMBALAGENS)


def test_simulador_reproduz_os_achados(site):
    sim = site["simulador"]
    cm = pd.DataFrame(sim["caixas_mes"])
    eco = metrics.economia_simulada(cm, sim["precos"], sim["reducao_padrao"], etapa="separacao")
    assert eco == pytest.approx(site["findings"]["acoes"]["economia_separacao_mes"], rel=1e-3)


def test_custo_mensal_bate_com_o_simulador(site):
    cm = pd.DataFrame(site["simulador"]["caixas_mes"])
    custo_mes = metrics.economia_simulada(cm, site["simulador"]["precos"], 100)
    assert custo_mes == pytest.approx(site["meta"]["custo_medio_mensal_brl"], rel=1e-3)


def test_sql_publicado_e_o_do_repositorio(site):
    for chave, info in site["sql"].items():
        assert info["sql"] == export_web.sql_text(chave)


# ---------------------------------------------------------------- SQL x pandas (mesma conta por dois caminhos)


@pytest.fixture(scope="module")
def tabelas():
    mov = pd.read_parquet(simulate.APP_DIR / "movimentos_mensais.parquet")
    itens = pd.read_parquet(simulate.APP_DIR / "itens.parquet")
    avarias = pd.read_parquet(simulate.SIM_DIR / "avarias.parquet")
    return avarias, mov, itens


def test_achados_pandas_batem_com_sql(site, tabelas):
    precos = {k: v["preco_caixa_brl"] for k, v in ref.EMBALAGENS.items()}
    a = metrics.achados(*tabelas, precos, ref.JANELA_CORTES)
    sql = site["findings"]["achados"]
    assert a["top3_pct"] == pytest.approx(sql["top3_pct"], abs=0.01)
    assert a["long_neck_pct_custo"] == pytest.approx(sql["long_neck_pct_custo"], abs=0.01)
    assert a["foco_var_pct"] == pytest.approx(sql["separacao_var_pct"], abs=0.01)
    assert a["foco_var_ajustada_pct"] == pytest.approx(sql["separacao_var_ajustada_pct"], abs=0.01)
    assert a["custo_medio_mensal_brl"] == pytest.approx(site["meta"]["custo_medio_mensal_brl"], rel=1e-6)


def test_curva_abc_sql_bate_com_pandas(site, tabelas):
    _, mov, _ = tabelas
    volumes = mov.groupby("item_code")["caixas_movimentadas"].sum()
    classe = metrics.curva_abc(volumes[volumes > 0])
    sql = {c["classe"]: c["itens"] for c in site["abc"]["classes"]}
    assert classe.value_counts().to_dict() == sql


def test_mix_real_soma_100(site):
    mix = pd.DataFrame(site["real"]["mix"])
    assert mix.groupby("ano")["pct"].sum().tolist() == pytest.approx([100] * mix["ano"].nunique(), abs=0.05)


def test_sensibilidade_coerente(site):
    s = site["sensibilidade"]
    for faixa in [*s["faixas"].values(), *s["nulo"].values()]:
        assert faixa["p5"] <= faixa["p50"] <= faixa["p95"]
    # Sem tendência plantada, a taxa ajustada da separação fica perto de zero.
    assert abs(s["nulo"]["foco_var_ajustada_pct"]["p50"]) < 5


def test_inventario_modelo_bate_com_simulacao(site):
    a = site["inventario"]["achados"]
    # A regra de frequência (Poisson) prevê a IRA mensal que a simulação mede.
    assert a["ira_a_modelo_mensal_pct"] == pytest.approx(a["ira_a_mensal_pct"], abs=3)
    freq = pd.DataFrame(site["inventario"]["frequencia"])
    assert (freq["ira_recomendada_pct"] >= ref.INVENTARIO["ira_meta_pct"]).all()
    causas = pd.DataFrame(site["inventario"]["causas"])
    assert causas["pct"].sum() == pytest.approx(100, abs=0.05)
