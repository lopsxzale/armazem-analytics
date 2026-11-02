"""Cria o banco SQLite (data/armazem.db) a partir de sql/schema.sql e dos painéis versionados.

Fontes: data/app/*.parquet (volumes reais) e data/sim/avarias.parquet (simulado).
O banco não é versionado: qualquer máquina o recria em segundos.

Uso: python src/load.py
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd

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
    return {"embalagens": embalagens, "etapas": etapas, "motivos": motivos}


def build(db_path: Path | str = DB_PATH) -> sqlite3.Connection:
    """Recria o banco e devolve a conexão aberta (use ':memory:' nos testes)."""
    if db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    con.executescript(SCHEMA.read_text(encoding="utf-8"))
    tabelas = {
        **dimensoes(),
        "itens": pd.read_parquet(APP_DIR / "itens.parquet"),
        "movimentos_mensais": pd.read_parquet(APP_DIR / "movimentos_mensais.parquet"),
        "avarias": pd.read_parquet(SIM_DIR / "avarias.parquet"),
    }
    for nome, df in tabelas.items():
        df.to_sql(nome, con, if_exists="append", index=False)
    con.commit()
    return con


def main() -> None:
    con = build()
    for tabela in ("itens", "movimentos_mensais", "avarias"):
        (n,) = con.execute(f"SELECT COUNT(*) FROM {tabela}").fetchone()
        print(f"{tabela}: {n:,} linhas")
    con.close()


if __name__ == "__main__":
    main()
