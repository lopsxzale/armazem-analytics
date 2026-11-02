-- Q9. (v2) Quão acurado é o estoque? IRA (acuracidade de registro) por classe ABC, com contagem mensal.
-- Uma contagem "bate" quando |físico - sistema| <= max(1 caixa, 2% do estoque em sistema).
WITH liquido AS (
    SELECT periodo, item_code, SUM(caixas) AS divergencia, SUM(eventos) AS eventos
    FROM divergencias
    GROUP BY periodo, item_code
),
contagem AS (
    SELECT
        c.classe,
        c.estoque_sistema,
        COALESCE(l.divergencia, 0) AS divergencia,
        COALESCE(l.eventos, 0)     AS eventos,
        CASE WHEN 0.02 * c.estoque_sistema > 1 THEN 0.02 * c.estoque_sistema ELSE 1 END AS tolerancia
    FROM contagens c
    LEFT JOIN liquido l ON l.periodo = c.periodo AND l.item_code = c.item_code
)
SELECT
    classe,
    COUNT(*)                                                                                    AS contagens,
    ROUND(CAST(100.0 * SUM(CASE WHEN ABS(divergencia) <= tolerancia THEN 1 ELSE 0 END) / COUNT(*) AS NUMERIC), 2) AS ira_pct,
    ROUND(CAST(1.0 * SUM(eventos) / COUNT(*) AS NUMERIC), 3)                                     AS eventos_por_contagem,
    SUM(ABS(divergencia))                                                                       AS caixas_divergentes,
    ROUND(CAST(AVG(estoque_sistema) AS NUMERIC), 1)                                             AS estoque_medio
FROM contagem
GROUP BY classe
ORDER BY classe;
