"""Limpa o Montgomery e gera os painéis versionados em data/app/.

Mantém só cerveja e barris (BEER, KEGS), deriva a embalagem pela descrição e
agrega por item e mês. Valores negativos (estornos/devoluções) ficam em uma
coluna separada, para a fase de devoluções.

Uso: python src/transform.py
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_FILE = ROOT_DIR / "data" / "raw" / "montgomery_warehouse_retail_sales.csv"
APP_DIR = ROOT_DIR / "data" / "app"

TIPOS = ("BEER", "KEGS")

RE_BARRIL = re.compile(r"\bKEG|\b1/[246]\s?K|\b1/4\s?KG|\b\d+\s?L\b(?!.*CAN)")
RE_LATA = re.compile(r"CANS?\b|(?:\b|\d)CN\b")
RE_VIDRO = re.compile(r"(?:\b|\d)NR\b|\bBTLS?\b|\bBOTTLES?\b|\b750\s?ML\b|\b22\s?OZ\b|\b25\.4\s?Z")

COLUNAS = {
    "YEAR": "ano",
    "MONTH": "mes",
    "SUPPLIER": "fornecedor",
    "ITEM CODE": "item_code",
    "ITEM DESCRIPTION": "descricao",
    "ITEM TYPE": "tipo",
    "RETAIL SALES": "varejo",
    "RETAIL TRANSFERS": "transferencias",
    "WAREHOUSE SALES": "armazem",
}


def embalagem(descricao: str, tipo: str) -> str:
    """Classifica a embalagem pela descrição do item (lata, long neck, barril ou outras)."""
    d = (descricao or "").upper()
    if tipo == "KEGS" or (RE_BARRIL.search(d) and not RE_LATA.search(d)):
        return "barril"
    if RE_LATA.search(d):
        return "lata"
    if RE_VIDRO.search(d):
        return "long_neck"
    return "outras"


def limpar(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.rename(columns=COLUNAS)[list(COLUNAS.values())]
    df = df[df["tipo"].isin(TIPOS) & df["item_code"].notna()].copy()
    for col in ("varejo", "transferencias", "armazem"):
        df[col] = df[col].fillna(0.0)
    df["item_code"] = df["item_code"].astype(str).str.strip()
    df["periodo"] = df["ano"].astype(str) + "-" + df["mes"].astype(str).str.zfill(2)
    return df


def build_itens(df: pd.DataFrame) -> pd.DataFrame:
    """Um registro por item, com a descrição mais recente."""
    ultimo = df.sort_values("periodo").drop_duplicates("item_code", keep="last")
    itens = ultimo[["item_code", "descricao", "fornecedor", "tipo"]].copy()
    itens["descricao"] = itens["descricao"].fillna("").str.strip()
    itens["embalagem_id"] = [embalagem(d, t) for d, t in zip(itens["descricao"], itens["tipo"], strict=True)]
    return itens.sort_values("item_code").reset_index(drop=True)


def build_movimentos(df: pd.DataFrame) -> pd.DataFrame:
    """Caixas por item e mês. Movimentado = saídas do armazém + transferências para as lojas."""
    pos = df[["armazem", "transferencias", "varejo"]].clip(lower=0)
    neg = df[["armazem", "transferencias"]].clip(upper=0).sum(axis=1).abs()
    base = df[["periodo", "ano", "mes", "item_code"]].assign(
        caixas_armazem=pos["armazem"],
        caixas_transferidas=pos["transferencias"],
        caixas_varejo=pos["varejo"],
        caixas_devolvidas=neg,
    )
    mov = base.groupby(["periodo", "ano", "mes", "item_code"], as_index=False).sum()
    mov["caixas_movimentadas"] = mov["caixas_armazem"] + mov["caixas_transferidas"]
    return mov.sort_values(["periodo", "item_code"]).reset_index(drop=True)


def main() -> None:
    df = limpar(pd.read_csv(RAW_FILE, dtype={"ITEM CODE": str}))
    APP_DIR.mkdir(parents=True, exist_ok=True)
    itens = build_itens(df)
    mov = build_movimentos(df)
    itens.to_parquet(APP_DIR / "itens.parquet", index=False)
    mov.to_parquet(APP_DIR / "movimentos_mensais.parquet", index=False)
    print(f"{len(itens):,} itens, {len(mov):,} linhas item-mês, {mov['periodo'].nunique()} meses")
    print(itens["embalagem_id"].value_counts().to_string())


if __name__ == "__main__":
    main()
