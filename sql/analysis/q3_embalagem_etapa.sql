-- Q3. Onde cada embalagem avaria? Taxa (% das caixas movimentadas) e custo por embalagem x etapa.
WITH mov AS (
    SELECT i.embalagem_id, SUM(m.caixas_movimentadas) AS caixas_movimentadas
    FROM movimentos_mensais m
    JOIN itens i ON i.item_code = m.item_code
    GROUP BY i.embalagem_id
),
perda AS (
    SELECT
        i.embalagem_id,
        a.etapa_id,
        SUM(a.caixas)                     AS caixas_avariadas,
        SUM(a.caixas * e.preco_caixa_brl) AS custo_brl
    FROM avarias a
    JOIN itens i      ON i.item_code = a.item_code
    JOIN embalagens e ON e.embalagem_id = i.embalagem_id
    GROUP BY i.embalagem_id, a.etapa_id
)
SELECT
    p.embalagem_id,
    e.nome                                                         AS embalagem,
    p.etapa_id,
    t.nome                                                         AS etapa,
    t.ordem,
    p.caixas_avariadas,
    ROUND(p.custo_brl, 2)                                          AS custo_brl,
    ROUND(100.0 * p.caixas_avariadas / mov.caixas_movimentadas, 3) AS taxa_pct,
    ROUND(100.0 * p.custo_brl / SUM(p.custo_brl) OVER (), 2)       AS pct_custo
FROM perda p
JOIN mov          ON mov.embalagem_id = p.embalagem_id
JOIN embalagens e ON e.embalagem_id = p.embalagem_id
JOIN etapas t     ON t.etapa_id = p.etapa_id
ORDER BY p.embalagem_id, t.ordem;
