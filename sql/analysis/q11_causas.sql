-- Q11. (v2) O que causa a divergência? Pareto das causas por valor (caixas divergentes x preço da caixa).
WITH causa AS (
    SELECT
        d.causa_id,
        SUM(d.eventos)                         AS eventos,
        SUM(ABS(d.caixas))                     AS caixas,
        SUM(ABS(d.caixas) * e.preco_caixa_brl) AS valor_brl
    FROM divergencias d
    JOIN itens i      ON i.item_code = d.item_code
    JOIN embalagens e ON e.embalagem_id = i.embalagem_id
    GROUP BY d.causa_id
)
SELECT
    c.causa_id,
    k.nome                                                                     AS causa,
    c.eventos,
    c.caixas,
    ROUND(CAST(c.valor_brl AS NUMERIC), 2)                                     AS valor_brl,
    ROUND(CAST(100.0 * c.valor_brl / SUM(c.valor_brl) OVER () AS NUMERIC), 2)  AS pct,
    ROUND(CAST(100.0 * SUM(c.valor_brl) OVER (ORDER BY c.valor_brl DESC ROWS UNBOUNDED PRECEDING)
          / SUM(c.valor_brl) OVER () AS NUMERIC), 2)                           AS pct_acum
FROM causa c
JOIN causas_divergencia k ON k.causa_id = c.causa_id
ORDER BY c.valor_brl DESC;
