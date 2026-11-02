"""Premissas e dimensões do projeto: embalagens, etapas, motivos e a referência da FAO.

Tudo que é premissa (não vem de dado real) está aqui, em um lugar só, para ficar
fácil de revisar e trocar. O site mostra estes valores ao lado dos resultados.
"""

# ---------------------------------------------------------------- referência real (FAO)

# FAO, "Tracking progress on food and agriculture-related SDG indicators 2023" (indicador 12.3.1a):
# 13,2% dos alimentos se perdem entre a colheita e o varejo (transporte, armazenagem, atacado,
# processamento), em 2021. É o número de todos os alimentos, inclusive frescos.
# A base FLW da FAO (https://www.fao.org/platform-food-loss-waste/flw-data/) só exporta por
# sessão interativa, então o número entra aqui como constante citada, não por download.
FAO_PERDA_POS_COLHEITA_PCT = 13.2
FAO_ANO = 2021
FAO_FONTE = "https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses/en"

# Bebida embalada perde muito menos que alimento fresco. A taxa base de avaria do armazém
# simulado fica em ~0,6% das caixas movimentadas, bem abaixo do teto da FAO. (premissa)
TAXA_BASE_AVARIA = 0.006

# ---------------------------------------------------------------- dimensões

# preco_caixa_brl: preço médio de uma caixa/unidade de venda em R$ (premissa, editável no site).
# mult_avaria: quanto a embalagem multiplica a taxa base (vidro quebra, lata amassa, barril é robusto).
EMBALAGENS = {
    "lata": {"nome": "Lata", "preco_caixa_brl": 48.0, "mult_avaria": 0.8},
    "long_neck": {"nome": "Long neck (vidro)", "preco_caixa_brl": 96.0, "mult_avaria": 1.9},
    "barril": {"nome": "Barril (retornável)", "preco_caixa_brl": 420.0, "mult_avaria": 0.3},
    "outras": {"nome": "Outras", "preco_caixa_brl": 70.0, "mult_avaria": 1.0},
}

# em: preposição + nome, para frases ("no carregamento").
# participacao: parte da avaria que acontece em cada etapa (soma 1). (premissa)
ETAPAS = {
    "doca": {"nome": "Doca (recebimento)", "em": "na doca", "ordem": 1, "participacao": 0.15},
    "armazenagem": {"nome": "Armazenagem", "em": "na armazenagem", "ordem": 2, "participacao": 0.20},
    "separacao": {"nome": "Separação (picking)", "em": "na separação", "ordem": 3, "participacao": 0.40},
    "carregamento": {"nome": "Carregamento", "em": "no carregamento", "ordem": 4, "participacao": 0.25},
}

MOTIVOS = {
    "quebra_manuseio": "Quebra no manuseio",
    "queda_palete": "Queda de palete",
    "amassado": "Embalagem amassada",
    "empilhamento": "Empilhamento excessivo",
    "colisao_empilhadeira": "Colisão de empilhadeira",
    "vazamento": "Vazamento",
    "vencimento": "Vencimento",
    "avaria_fornecedor": "Avaria de transporte do fornecedor",
}

# Peso de cada motivo por etapa (não precisa somar 1; é normalizado na simulação). (premissa)
PESO_MOTIVO_ETAPA = {
    "doca": {"avaria_fornecedor": 5, "queda_palete": 2, "amassado": 2, "vazamento": 1},
    "armazenagem": {"empilhamento": 4, "vencimento": 2, "colisao_empilhadeira": 3, "vazamento": 1},
    "separacao": {"quebra_manuseio": 6, "queda_palete": 2, "amassado": 2, "colisao_empilhadeira": 1},
    "carregamento": {"quebra_manuseio": 3, "queda_palete": 4, "amassado": 2, "vazamento": 1},
}

# Como a embalagem desloca os motivos: vidro quebra, lata amassa, barril vaza. (premissa)
PESO_MOTIVO_EMBALAGEM = {
    "lata": {"quebra_manuseio": 0.3, "amassado": 3.0, "vazamento": 0.8},
    "long_neck": {"quebra_manuseio": 1.8, "amassado": 0.2, "queda_palete": 1.3},
    "barril": {"quebra_manuseio": 0.1, "amassado": 0.5, "vazamento": 4.0, "vencimento": 0.3},
    "outras": {},
}

# Tendência: a avaria na separação cresce ao longo do período (fator 1,0 no início e 1,45 no fim).
# É o "onde a perda está crescendo" que a análise precisa encontrar. (premissa)
TENDENCIA_ETAPA = {"separacao": 1.45}

# Janelas de comparação: o Montgomery tem lacunas grandes, então comparamos blocos contínuos.
JANELAS = {
    "2017-06": "J1 · jun/17–fev/18",
    "2019-01": "J2 · jan–nov/19",
    "2020-01": "J3 · 2020 (4 meses)",
    "2026-06": "J4 · jun–ago/26",
}

SEED = 42
