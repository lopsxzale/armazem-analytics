-- Q5. A avaria se concentra nos itens de maior giro? Curva ABC por volume real x avaria.
-- A: itens até o acumulado cruzar 80% do volume (inclusive o que cruza); B: até 95%; C: o restante.
WITH volume AS (
    SELECT item_code, SUM(caixas_movimentadas) AS caixas_movimentadas
    FROM movimentos_mensais
    GROUP BY item_code
    HAVING SUM(caixas_movimentadas) > 0
),
acumulado AS (
    SELECT
        item_code,
        caixas_movimentadas,
        -- acumulado ANTES do item: o item que cruza o corte ainda entra na classe
        (SUM(caixas_movimentadas) OVER (ORDER BY caixas_movimentadas DESC, item_code ROWS UNBOUNDED PRECEDING)
            - caixas_movimentadas) / SUM(caixas_movimentadas) OVER () AS fracao_antes
    FROM volume
),
classe AS (
    SELECT
        item_code,
        caixas_movimentadas,
        CASE WHEN fracao_antes < 0.80 THEN 'A' WHEN fracao_antes < 0.95 THEN 'B' ELSE 'C' END AS classe
    FROM acumulado
),
perda AS (
    SELECT a.item_code, SUM(a.caixas) AS caixas_avariadas, SUM(a.caixas * e.preco_caixa_brl) AS custo_brl
    FROM avarias a
    JOIN itens i      ON i.item_code = a.item_code
    JOIN embalagens e ON e.embalagem_id = i.embalagem_id
    GROUP BY a.item_code
)
SELECT
    c.classe,
    COUNT(*)                                                                                AS itens,
    ROUND(SUM(c.caixas_movimentadas), 0)                                                    AS caixas_movimentadas,
    ROUND(100.0 * SUM(c.caixas_movimentadas) / SUM(SUM(c.caixas_movimentadas)) OVER (), 2)   AS pct_volume,
    COALESCE(SUM(p.caixas_avariadas), 0)                                                    AS caixas_avariadas,
    ROUND(COALESCE(SUM(p.custo_brl), 0), 2)                                                 AS custo_brl,
    ROUND(100.0 * COALESCE(SUM(p.custo_brl), 0) / SUM(SUM(p.custo_brl)) OVER (), 2)          AS pct_custo,
    ROUND(100.0 * COALESCE(SUM(p.caixas_avariadas), 0) / SUM(c.caixas_movimentadas), 3)      AS taxa_pct
FROM classe c
LEFT JOIN perda p ON p.item_code = c.item_code
GROUP BY c.classe
ORDER BY c.classe;
