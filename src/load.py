"""Cria o banco (SQLite em data/armazem.db, ou PostgreSQL se DATABASE_URL estiver definida) a partir de
sql/schema.sql e dos painéis versionados.

Fontes: data/app/*.parquet (volumes reais) e data/sim/avarias.parquet (simulado).
O banco não é versionado: qualquer máquina o recria em segundos.

Uso: python src/load.py
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd

import db
import referencias as ref

ROOT_DIR = Path(__file__).resolve().parent.parent
APP_DIR = ROOT_DIR / "data" / "app"
SIM_DIR = ROOT_DIR / "data" / "sim"
SCHEMA = ROOT_DIR / "sql" / "schema.sql"
DB_PATH = ROOT_DIR / "data" / "armazem.db"


def dimensoes() -> dict[str, pd.DataFrame]:
    embalagens = pd.DataFrame(
        [
            {
                "embalagem_id": k,
                "nome": v["nome"],
                "preco_caixa_brl": v["preco_caixa_brl"],
                "mult_avaria": v["mult_avaria"],
            }
            for k, v in ref.EMBALAGENS.items()
        ]
    )
    etapas = pd.DataFrame([{"etapa_id": k, "nome": v["nome"], "ordem": v["ordem"]} for k, v in ref.ETAPAS.items()])
    motivos = pd.DataFrame([{"motivo_id": k, "nome": v} for k, v in ref.MOTIVOS.items()])
    causas = pd.DataFrame([{"causa_id": k, "nome": v} for k, v in ref.CAUSAS.items()])
    return {"embalagens": embalagens, "etapas": etapas, "motivos": motivos, "causas_divergencia": causas}


def tabelas() -> dict[str, pd.DataFrame]:
    """Todas as tabelas, na ordem de carga (dimensões antes dos fatos, por causa das FKs)."""
    return {
        **dimensoes(),
        "itens": pd.read_parquet(APP_DIR / "itens.parquet"),
        "movimentos_mensais": pd.read_parquet(APP_DIR / "movimentos_mensais.parquet"),
        "avarias": pd.read_parquet(SIM_DIR / "avarias.parquet"),
        "contagens": pd.read_parquet(SIM_DIR / "contagens.parquet"),
        "divergencias": pd.read_parquet(SIM_DIR / "divergencias.parquet"),
    }


def build(db_path: Path | str = DB_PATH) -> sqlite3.Connection:
    """Recria o banco SQLite e devolve a conexão aberta (use ':memory:' nos testes)."""
    if db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    con.executescript(SCHEMA.read_text(encoding="utf-8"))
    for nome, df in tabelas().items():
        df.to_sql(nome, con, if_exists="append", index=False)
    con.commit()
    return con


def build_postgres(url: str):
    """Recria o banco no PostgreSQL com o mesmo schema.sql e carrega via COPY. Devolve a conexão aberta."""
    con = db.connect_postgres(url)
    con.execute(SCHEMA.read_text(encoding="utf-8"))
    with con.cursor() as cur:
        for nome, df in tabelas().items():
            cols = ", ".join(df.columns)
            with cur.copy(f"COPY {nome} ({cols}) FROM STDIN") as copy:
                for row in df.itertuples(index=False):
                    copy.write_row(row)
    con.commit()
    return con


def main() -> None:
    url = db.database_url()
    con = build_postgres(url) if url else build()
    for tabela in ("itens", "movimentos_mensais", "avarias"):
        n = db.query(con, f"SELECT COUNT(*) AS n FROM {tabela}")["n"].iloc[0]
        print(f"{tabela}: {n:,} linhas")
    con.close()


if __name__ == "__main__":
    main()
