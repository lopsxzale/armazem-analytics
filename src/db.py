"""Acesso ao banco: o mesmo schema e as mesmas queries rodam em SQLite (padrão) e PostgreSQL.

SQLite é o banco do dia a dia e do export do site. PostgreSQL entra quando DATABASE_URL está definida
(ex.: postgresql://postgres:postgres@localhost:5432/armazem), e o teste de paridade compara os dois.
"""

from __future__ import annotations

import os
from decimal import Decimal

import pandas as pd


def database_url() -> str | None:
    return os.getenv("DATABASE_URL") or None


def connect_postgres(url: str):
    import psycopg  # opcional: só é preciso para o PostgreSQL

    return psycopg.connect(url)


def query(con, sql: str) -> pd.DataFrame:
    """Roda uma query em qualquer conexão DB-API e devolve um DataFrame (NUMERIC do Postgres vira float)."""
    cur = con.cursor()
    cur.execute(sql)
    cols = [c[0] for c in cur.description]
    rows = [[float(v) if isinstance(v, Decimal) else v for v in row] for row in cur.fetchall()]
    cur.close()
    return pd.DataFrame(rows, columns=cols)
