import pandas as pd
import pytest

import transform


@pytest.mark.parametrize(
    ("descricao", "tipo", "esperado"),
    [
        ("GUINNESS DRAFT 6/4 CANS - 14.9OZ", "BEER", "lata"),
        ("MONUMENT CITY BROWN ALE 4/6 - 12OZ CN", "BEER", "lata"),
        ("HEINEKEN DRAFT KEG CAN - 5L", "BEER", "lata"),
        ("WARSTEINER 2/12 NR - 12OZ", "BEER", "long_neck"),
        ("JACK DANIELS DOWNHOME PUNCH 4/6NR - 10OZ", "BEER", "long_neck"),
        ("PERENNIAL VON PAMPELMUSE 12/750ML", "BEER", "long_neck"),
        ("PERONI 1/2K", "BEER", "barril"),
        ("GREAT LAKES CONWAY IRISH RED 1/6 KEG", "BEER", "barril"),
        ("QUALQUER COISA", "KEGS", "barril"),
        ("SHACKSBURY SEMI-DRY CRAFT CIDER - 12OZ", "BEER", "outras"),
        (None, "BEER", "outras"),
    ],
)
def test_embalagem(descricao, tipo, esperado):
    assert transform.embalagem(descricao, tipo) == esperado


@pytest.fixture
def raw():
    return pd.DataFrame(
        {
            "YEAR": [2026, 2026, 2026, 2026, 2026],
            "MONTH": [6, 6, 7, 6, 6],
            "SUPPLIER": ["A", "A", "A", "B", "C"],
            "ITEM CODE": ["1", "1", "1", "2", None],
            "ITEM DESCRIPTION": ["X 4/6 CANS", "X 4/6 CANS", "X 4/6 CANS NOVO", "VINHO 750ML", "Y"],
            "ITEM TYPE": ["BEER", "BEER", "BEER", "WINE", "BEER"],
            "RETAIL SALES": [1.0, 2.0, None, 5.0, 1.0],
            "RETAIL TRANSFERS": [3.0, -1.0, 0.0, 5.0, 1.0],
            "WAREHOUSE SALES": [10.0, -4.0, 7.0, 5.0, 1.0],
        }
    )


def test_limpar_filtra_tipos_e_itens_sem_codigo(raw):
    df = transform.limpar(raw)
    assert set(df["tipo"]) == {"BEER"}
    assert df["item_code"].notna().all()
    assert set(df["periodo"]) == {"2026-06", "2026-07"}


def test_movimentos_separa_devolucoes(raw):
    mov = transform.build_movimentos(transform.limpar(raw)).set_index("periodo")
    jun = mov.loc["2026-06"]
    assert jun["caixas_armazem"] == 10
    assert jun["caixas_transferidas"] == 3
    assert jun["caixas_devolvidas"] == 5  # -4 do armazém + -1 das transferências
    assert jun["caixas_movimentadas"] == 13


def test_itens_usa_descricao_mais_recente(raw):
    itens = transform.build_itens(transform.limpar(raw))
    assert itens.loc[itens["item_code"] == "1", "descricao"].item() == "X 4/6 CANS NOVO"
