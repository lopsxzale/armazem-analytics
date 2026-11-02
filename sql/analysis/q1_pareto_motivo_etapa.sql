-- Q1. Quais combinações de motivo e etapa explicam 80% do custo da avaria? (Pareto)
WITH perda AS (
    SELECT
        a.motivo_id,
        a.etapa_id,
        SUM(a.caixas)                     AS caixas,
        SUM(a.caixas * e.preco_caixa_brl) AS custo_brl
    FROM avarias a
    JOIN itens i      ON i.item_code = a.item_code
    JOIN embalagens e ON e.embalagem_id = i.embalagem_id
    GROUP BY a.motivo_id, a.etapa_id
)
SELECT
    p.motivo_id,
    m.nome                                                   AS motivo,
    p.etapa_id,
    t.nome                                                   AS etapa,
    p.caixas,
    ROUND(p.custo_brl, 2)                                    AS custo_brl,
    ROUND(100.0 * p.custo_brl / SUM(p.custo_brl) OVER (), 2) AS pct,
    ROUND(100.0 * SUM(p.custo_brl) OVER (ORDER BY p.custo_brl DESC ROWS UNBOUNDED PRECEDING)
          / SUM(p.custo_brl) OVER (), 2)                     AS pct_acum,
    RANK() OVER (ORDER BY p.custo_brl DESC)                  AS posicao
FROM perda p
JOIN motivos m ON m.motivo_id = p.motivo_id
JOIN etapas t  ON t.etapa_id = p.etapa_id
ORDER BY p.custo_brl DESC;
