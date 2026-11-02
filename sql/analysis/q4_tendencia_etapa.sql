-- Q4. Onde a perda está crescendo? Taxa de avaria por etapa em janelas contínuas da série.
-- A fonte tem lacunas longas, então comparamos blocos de meses seguidos, não mês a mês.
WITH mov AS (
    SELECT
        CASE
            WHEN periodo <= '2018-12' THEN '2017-06'
            WHEN periodo <= '2019-12' THEN '2019-01'
            WHEN periodo <= '2020-12' THEN '2020-01'
            ELSE '2026-06'
        END                      AS janela,
        SUM(caixas_movimentadas) AS caixas_movimentadas,
        COUNT(DISTINCT periodo)  AS meses
    FROM movimentos_mensais
    GROUP BY 1
),
perda AS (
    SELECT
        CASE
            WHEN periodo <= '2018-12' THEN '2017-06'
            WHEN periodo <= '2019-12' THEN '2019-01'
            WHEN periodo <= '2020-12' THEN '2020-01'
            ELSE '2026-06'
        END         AS janela,
        etapa_id,
        SUM(caixas) AS caixas_avariadas
    FROM avarias
    GROUP BY 1, 2
),
taxas AS (
    SELECT
        p.janela,
        p.etapa_id,
        m.meses,
        p.caixas_avariadas,
        100.0 * p.caixas_avariadas / m.caixas_movimentadas AS taxa_pct
    FROM perda p
    JOIN mov m ON m.janela = p.janela
)
SELECT
    janela,
    etapa_id,
    meses,
    caixas_avariadas,
    ROUND(taxa_pct, 4)                                                             AS taxa_pct,
    ROUND(taxa_pct - LAG(taxa_pct) OVER (PARTITION BY etapa_id ORDER BY janela), 4) AS var_pp,
    ROUND(100.0 * (taxa_pct / FIRST_VALUE(taxa_pct) OVER (PARTITION BY etapa_id ORDER BY janela) - 1), 2)
                                                                                   AS var_vs_inicio_pct
FROM taxas
ORDER BY etapa_id, janela;
