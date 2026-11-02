-- Q6. Quais itens mais custam em avaria? (top 10, com o motivo principal de cada um)
WITH custo_motivo AS (
    SELECT a.item_code, a.motivo_id, SUM(a.caixas) AS caixas, SUM(a.caixas * e.preco_caixa_brl) AS custo_brl
    FROM avarias a
    JOIN itens i      ON i.item_code = a.item_code
    JOIN embalagens e ON e.embalagem_id = i.embalagem_id
    GROUP BY a.item_code, a.motivo_id
),
por_item AS (
    SELECT
        item_code,
        motivo_id,
        SUM(caixas)    OVER (PARTITION BY item_code)                       AS caixas_avariadas,
        SUM(custo_brl) OVER (PARTITION BY item_code)                       AS custo_brl,
        ROW_NUMBER()   OVER (PARTITION BY item_code ORDER BY custo_brl DESC) AS rn
    FROM custo_motivo
),
mov AS (
    SELECT item_code, SUM(caixas_movimentadas) AS caixas_movimentadas
    FROM movimentos_mensais
    GROUP BY item_code
)
SELECT
    p.item_code,
    i.descricao,
    i.embalagem_id,
    p.motivo_id,
    m.nome                                                        AS motivo_principal,
    p.caixas_avariadas,
    ROUND(p.custo_brl, 2)                                          AS custo_brl,
    ROUND(100.0 * p.caixas_avariadas / mov.caixas_movimentadas, 3) AS taxa_pct
FROM por_item p
JOIN itens i   ON i.item_code = p.item_code
JOIN motivos m ON m.motivo_id = p.motivo_id
JOIN mov       ON mov.item_code = p.item_code
WHERE p.rn = 1
ORDER BY p.custo_brl DESC
LIMIT 10;
