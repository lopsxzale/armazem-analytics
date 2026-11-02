-- Q8. (dado real) Quanto volta? Estornos (lançamentos negativos do armazém) por embalagem.
-- Prévia da fase v4 (devoluções): no Montgomery eles são raros e concentrados em poucos meses.
SELECT
    i.embalagem_id,
    ROUND(CAST(SUM(m.caixas_devolvidas) AS NUMERIC), 1)                                    AS caixas_devolvidas,
    ROUND(CAST(SUM(m.caixas_movimentadas) AS NUMERIC), 0)                                  AS caixas_movimentadas,
    ROUND(CAST(100.0 * SUM(m.caixas_devolvidas) / SUM(m.caixas_movimentadas) AS NUMERIC), 4) AS taxa_pct,
    COUNT(DISTINCT CASE WHEN m.caixas_devolvidas > 0 THEN m.periodo END)                   AS meses_com_estorno,
    COUNT(DISTINCT CASE WHEN m.caixas_devolvidas > 0 THEN m.item_code END)                 AS itens_com_estorno
FROM movimentos_mensais m
JOIN itens i ON i.item_code = m.item_code
GROUP BY i.embalagem_id
ORDER BY taxa_pct DESC;
