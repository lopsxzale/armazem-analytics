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
    "doca": {"nome": "Descarga (recebimento)", "em": "na descarga", "ordem": 1, "participacao": 0.15},
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
# Último período de cada janela -> id da janela (mesma regra do CASE em q4_tendencia_etapa.sql).
JANELA_CORTES = {"2018-12": "2017-06", "2019-12": "2019-01", "2020-12": "2020-01", "9999-12": "2026-06"}

JANELAS = {
    "2017-06": "J1 · jun/17–fev/18",
    "2019-01": "J2 · jan–nov/19",
    "2020-01": "J3 · 2020 (4 meses)",
    "2026-06": "J4 · jun–ago/26",
}

SEED = 42

# ---------------------------------------------------------------- v2: acuracidade de inventário (premissas)

# Classe ABC pelo volume real (mesmos cortes da q5): A até 80% do volume, B até 95%, C o resto.
CORTES_ABC = (0.80, 0.95)

INVENTARIO = {
    # Estoque teórico = giro mensal x cobertura em dias / 30. Itens A giram mais e ficam menos tempo.
    "cobertura_dias": {"A": 10, "B": 20, "C": 45},
    # Posições (endereços) por item: A tem picking e pulmão em vários pontos.
    "posicoes": {"A": 3, "B": 2, "C": 1},
    # Eventos de divergência por caixa movimentada.
    "taxa_erro_separacao": 0.0008,
    "taxa_erro_recebimento": 0.0003,
    # Parte das avarias da v1 que não é baixada no sistema (o sistema fica com mais do que o físico).
    "fracao_avaria_nao_baixada": 0.25,
    # Tamanho médio de um erro, em caixas (geométrica, mínimo 1).
    "caixas_por_erro": 2.0,
    # Uma contagem bate se |físico - sistema| <= max(1 caixa, 2% do estoque).
    "tolerancia_pct": 2.0,
    # Custo de contar uma posição (mão de obra), em R$.
    "custo_contagem_posicao_brl": 4.0,
    # Meta de acuracidade de registro (IRA) que define a frequência recomendada.
    "ira_meta_pct": 95.0,
    # Intervalos de contagem possíveis, em dias.
    "intervalos_dias": (7, 14, 30, 60, 90),
}

CAUSAS = {
    "erro_separacao": "Erro de separação",
    "erro_recebimento": "Erro de recebimento",
    "avaria_nao_baixada": "Avaria não baixada",
}

# ---------------------------------------------------------------- vasilhame retornável (premissas)

# Refugo de vasilhame: casco retornável que não dá para reaproveitar (volta para o fabricante como
# caco). Os 4 tipos são os da operação: 1L (litrão), 600A (600 ml âmbar), 600V (600 ml verde) e
# 300 ml (litrinho). Tudo aqui é premissa: troque pelos números do armazém quando houver.
# O custo é só o do casco (reposição); o líquido de garrafa cheia que quebra já entra na avaria da v1.
VASILHAME = {
    # Cascos que passam pelo armazém num mês médio (retorno de rota + giro do estoque de vazio).
    "cascos_mes": 180_000,
    # Parte dos cascos que vira refugo, antes do multiplicador de cada tipo.
    "taxa_base_refugo": 0.018,
    # Sazonalidade do volume (mês -> fator): verão vende mais garrafa retornável.
    "sazonalidade": {
        1: 1.20,
        2: 1.15,
        3: 1.00,
        4: 0.92,
        5: 0.88,
        6: 0.85,
        7: 0.85,
        8: 0.90,
        9: 0.95,
        10: 1.02,
        11: 1.10,
        12: 1.30,
    },
    # 12 meses simulados, terminando no último mês do dado real.
    "periodo_fim": "2026-08",
    "meses": 12,
}

# participacao: parte dos cascos de cada tipo (soma 1). preco_casco_brl: custo de repor um casco.
# mult_refugo: quanto o tipo multiplica a taxa base. Informado pela operação: o 600A é o casco que mais
# dá prejuízo (é o que mais gira e mais bate na grade); o litrinho é o mais robusto.
TIPOS_VASILHAME = {
    "1L": {"nome": "1L (litrão)", "ordem": 1, "participacao": 0.28, "preco_casco_brl": 2.30, "mult_refugo": 1.05},
    "600A": {"nome": "600 ml âmbar", "ordem": 2, "participacao": 0.48, "preco_casco_brl": 1.45, "mult_refugo": 1.25},
    "600V": {"nome": "600 ml verde", "ordem": 3, "participacao": 0.10, "preco_casco_brl": 1.65, "mult_refugo": 1.10},
    "300ml": {
        "nome": "300 ml (litrinho)",
        "ordem": 4,
        "participacao": 0.14,
        "preco_casco_brl": 0.95,
        "mult_refugo": 0.70,
    },
}

# participacao: parte do refugo que aparece em cada etapa (soma 1).
ETAPAS_VASILHAME = {
    "retorno_rota": {"nome": "Retorno de rota", "ordem": 1, "participacao": 0.34},
    "triagem": {"nome": "Triagem / conferência", "ordem": 2, "participacao": 0.30},
    "armazenagem_vasilhame": {"nome": "Armazenagem do vasilhame", "ordem": 3, "participacao": 0.14},
    "separacao_carregamento": {"nome": "Separação / carregamento", "ordem": 4, "participacao": 0.22},
}

MOTIVOS_VASILHAME = {
    "quebrada": "Quebrada",
    "trincada": "Trincada",
    "sujidade_interna": "Sujidade interna",
    "bicada_externa": "Bicada externa",
    "bicada_interna": "Bicada interna",
}

# Peso de cada motivo por etapa (normalizado na simulação): o que chega quebrado/bicado do cliente
# aparece no retorno; sujidade e bicada interna só se vê na triagem; no manuseio do armazém, quebra.
PESO_MOTIVO_ETAPA_VASILHAME = {
    "retorno_rota": {"quebrada": 3, "trincada": 2, "bicada_externa": 3, "bicada_interna": 1, "sujidade_interna": 1},
    "triagem": {"sujidade_interna": 5, "bicada_interna": 3, "trincada": 2, "bicada_externa": 2},
    "armazenagem_vasilhame": {"quebrada": 4, "trincada": 2, "bicada_externa": 2},
    "separacao_carregamento": {"quebrada": 5, "trincada": 1, "bicada_externa": 1},
}

# Como o tipo desloca os motivos: 600A bica mais (bate na grade), litrão quebra mais (peso),
# litrinho volta mais sujo (consumo em bar).
PESO_MOTIVO_TIPO_VASILHAME = {
    "1L": {"quebrada": 1.4, "trincada": 1.2},
    "600A": {"bicada_externa": 1.3, "bicada_interna": 1.2},
    "600V": {"bicada_externa": 1.3},
    "300ml": {"sujidade_interna": 1.6, "quebrada": 0.6},
}

SEED_VASILHAME = SEED + 200
