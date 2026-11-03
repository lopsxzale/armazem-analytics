-- Q14. (vasilhame) Em que ponto do caminho do casco o refugo aparece? Retorno de rota, triagem, armazenagem e separação/carregamento.
WITH etapa AS (
    SELECT
        v.etapa_id,
        SUM(v.cascos)                     AS cascos,
        SUM(v.cascos * t.preco_casco_brl) AS custo_brl
    FROM vasilhame_refugo v
    JOIN tipos_vasilhame t ON t.tipo_id = v.tipo_id
    GROUP BY v.etapa_id
)
SELECT
    e.etapa_id,
    k.ordem,
    e.cascos                                                                  AS cascos_refugados,
    ROUND(CAST(e.custo_brl AS NUMERIC), 2)                                    AS custo_brl,
    ROUND(CAST(100.0 * e.cascos / SUM(e.cascos) OVER () AS NUMERIC), 2)       AS pct,
    ROUND(CAST(100.0 * SUM(e.cascos) OVER (ORDER BY k.ordem ROWS UNBOUNDED PRECEDING)
          / SUM(e.cascos) OVER () AS NUMERIC), 2)                             AS pct_acum
FROM etapa e
JOIN etapas_vasilhame k ON k.etapa_id = e.etapa_id
ORDER BY k.ordem;
