-- Schema do Armazém Analytics. DDL compatível com SQLite e PostgreSQL.
-- Volumes (itens, movimentos_mensais) são reais (Montgomery County).
-- Avarias e preços são simulados (ver src/referencias.py).

DROP TABLE IF EXISTS avarias;
DROP TABLE IF EXISTS movimentos_mensais;
DROP TABLE IF EXISTS itens;
DROP TABLE IF EXISTS motivos;
DROP TABLE IF EXISTS etapas;
DROP TABLE IF EXISTS embalagens;

CREATE TABLE embalagens (
    embalagem_id    TEXT PRIMARY KEY,
    nome            TEXT NOT NULL,
    preco_caixa_brl NUMERIC(10, 2) NOT NULL,  -- premissa
    mult_avaria     NUMERIC(6, 3) NOT NULL    -- premissa
);

CREATE TABLE etapas (
    etapa_id TEXT PRIMARY KEY,
    nome     TEXT NOT NULL,
    ordem    INTEGER NOT NULL
);

CREATE TABLE motivos (
    motivo_id TEXT PRIMARY KEY,
    nome      TEXT NOT NULL
);

CREATE TABLE itens (
    item_code    TEXT PRIMARY KEY,
    descricao    TEXT NOT NULL,
    fornecedor   TEXT,
    tipo         TEXT NOT NULL,
    embalagem_id TEXT NOT NULL REFERENCES embalagens (embalagem_id)
);

CREATE TABLE movimentos_mensais (
    periodo             TEXT NOT NULL,  -- 'AAAA-MM'
    ano                 INTEGER NOT NULL,
    mes                 INTEGER NOT NULL,
    item_code           TEXT NOT NULL REFERENCES itens (item_code),
    caixas_armazem      NUMERIC(12, 2) NOT NULL,
    caixas_transferidas NUMERIC(12, 2) NOT NULL,
    caixas_varejo       NUMERIC(12, 2) NOT NULL,
    caixas_devolvidas   NUMERIC(12, 2) NOT NULL,
    caixas_movimentadas NUMERIC(12, 2) NOT NULL,
    PRIMARY KEY (periodo, item_code)
);

CREATE TABLE avarias (
    periodo   TEXT NOT NULL,
    ano       INTEGER NOT NULL,
    mes       INTEGER NOT NULL,
    item_code TEXT NOT NULL REFERENCES itens (item_code),
    etapa_id  TEXT NOT NULL REFERENCES etapas (etapa_id),
    motivo_id TEXT NOT NULL REFERENCES motivos (motivo_id),
    caixas    INTEGER NOT NULL CHECK (caixas > 0),
    PRIMARY KEY (periodo, item_code, etapa_id, motivo_id)
);

CREATE INDEX ix_avarias_periodo ON avarias (periodo);
CREATE INDEX ix_movimentos_item ON movimentos_mensais (item_code);
