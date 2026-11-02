-- Q7. (dado real) Como o mix de embalagens mudou? % das caixas movimentadas por embalagem e ano.
WITH vol AS (
    SELECT m.ano, i.embalagem_id, SUM(m.caixas_movimentadas) AS caixas_movimentadas
    FROM movimentos_mensais m
    JOIN itens i ON i.item_code = m.item_code
    GROUP BY m.ano, i.embalagem_id
)
SELECT
    ano,
    embalagem_id,
    ROUND(CAST(caixas_movimentadas AS NUMERIC), 0)                                                   AS caixas_movimentadas,
    ROUND(CAST(100.0 * caixas_movimentadas / SUM(caixas_movimentadas) OVER (PARTITION BY ano) AS NUMERIC), 2) AS pct
FROM vol
ORDER BY ano, embalagem_id;
