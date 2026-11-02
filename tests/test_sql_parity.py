"""Paridade SQLite x PostgreSQL: cada query de sql/analysis/ dá o mesmo resultado nos dois bancos.

Só roda com DATABASE_URL definida (no CI, um serviço postgres:16). Sem ela, os testes são pulados.
"""

import numpy as np
import pandas as pd
import pytest

import db
import export_web
import load

URL = db.database_url()
pytestmark = pytest.mark.skipif(not URL, reason="defina DATABASE_URL para testar no PostgreSQL")


@pytest.fixture(scope="module")
def bancos():
    sqlite = load.build(":memory:")
    pg = load.build_postgres(URL)
    yield sqlite, pg
    sqlite.close()
    pg.close()


@pytest.mark.parametrize("chave", list(export_web.QUERIES))
def test_query_igual_nos_dois_bancos(bancos, chave):
    sqlite, pg = bancos
    sql = export_web.sql_text(chave)
    a, b = db.query(sqlite, sql), db.query(pg, sql)
    assert list(a.columns) == list(b.columns)
    assert len(a) == len(b)
    for col in a.columns:
        x, y = a[col], b[col]
        if pd.api.types.is_numeric_dtype(x) or pd.api.types.is_numeric_dtype(y):
            # NUMERIC exato no Postgres x float no SQLite: diferença só na última casa arredondada.
            assert np.allclose(x.astype(float), y.astype(float), rtol=1e-6, atol=0.011, equal_nan=True), (chave, col)
        else:
            assert x.astype(str).tolist() == y.astype(str).tolist(), (chave, col)
