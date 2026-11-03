-- Q13. (vasilhame) Quanto refuga cada tipo de casco (1L, 600A, 600V, 300ml) e por qual motivo? Taxa sobre os cascos do tipo.
WITH retorno AS (
    SELECT tipo_id, SUM(cascos) AS cascos
    FROM vasilhame_retorno
    GROUP BY tipo_id
),
refugo AS (
    SELECT tipo_id, motivo_id, SUM(cascos) AS cascos
    FROM vasilhame_refugo
    GROUP BY tipo_id, motivo_id
)
SELECT
    r.tipo_id,
    t.ordem,
    r.motivo_id,
    r.cascos                                                                                  AS cascos_refugados,
    ret.cascos                                                                                AS cascos_tipo,
    ROUND(CAST(r.cascos * t.preco_casco_brl AS NUMERIC), 2)                                   AS custo_brl,
    ROUND(CAST(100.0 * r.cascos / ret.cascos AS NUMERIC), 4)                                  AS taxa_pct,
    ROUND(CAST(100.0 * r.cascos * t.preco_casco_brl
          / SUM(r.cascos * t.preco_casco_brl) OVER () AS NUMERIC), 2)                         AS pct_custo
FROM refugo r
JOIN retorno ret        ON ret.tipo_id = r.tipo_id
JOIN tipos_vasilhame t  ON t.tipo_id = r.tipo_id
ORDER BY t.ordem, r.cascos DESC, r.motivo_id;
