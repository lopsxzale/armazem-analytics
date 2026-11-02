-- Q4. Onde a perda está crescendo? Taxa de avaria por etapa em janelas contínuas, bruta e ajustada por mix.
-- A fonte tem lacunas longas, então comparamos blocos de meses seguidos, não mês a mês.
-- O mix muda no período (mais lata, menos long neck), e lata quebra menos: a taxa bruta cai mesmo sem
-- mudança de processo. A taxa ajustada fixa o mix de embalagem da 1ª janela e mede só a mudança de taxa.
WITH mov AS (
    SELECT
        CASE
            WHEN m.periodo <= '2018-12' THEN '2017-06'
            WHEN m.periodo <= '2019-12' THEN '2019-01'
            WHEN m.periodo <= '2020-12' THEN '2020-01'
            ELSE '2026-06'
        END                        AS janela,
        i.embalagem_id,
        SUM(m.caixas_movimentadas) AS caixas_movimentadas,
        COUNT(DISTINCT m.periodo)  AS meses
    FROM movimentos_mensais m
    JOIN itens i ON i.item_code = m.item_code
    GROUP BY 1, 2
),
perda AS (
    SELECT
        CASE
            WHEN a.periodo <= '2018-12' THEN '2017-06'
            WHEN a.periodo <= '2019-12' THEN '2019-01'
            WHEN a.periodo <= '2020-12' THEN '2020-01'
            ELSE '2026-06'
        END           AS janela,
        a.etapa_id,
        i.embalagem_id,
        SUM(a.caixas) AS caixas_avariadas
    FROM avarias a
    JOIN itens i ON i.item_code = a.item_code
    GROUP BY 1, 2, 3
),
peso_inicial AS (
    -- participação de cada embalagem no volume da 1ª janela (o mix de referência)
    SELECT
        embalagem_id,
        1.0 * caixas_movimentadas / SUM(caixas_movimentadas) OVER () AS peso
    FROM mov
    WHERE janela = (SELECT MIN(janela) FROM mov)
),
vol_janela AS (
    SELECT janela, SUM(caixas_movimentadas) AS caixas_movimentadas, MAX(meses) AS meses
    FROM mov
    GROUP BY janela
),
taxas AS (
    SELECT
        p.janela,
        p.etapa_id,
        v.meses,
        SUM(p.caixas_avariadas)                                            AS caixas_avariadas,
        100.0 * SUM(p.caixas_avariadas) / v.caixas_movimentadas            AS taxa_pct,
        100.0 * SUM(1.0 * p.caixas_avariadas / m.caixas_movimentadas * w.peso) AS taxa_ajustada_pct
    FROM perda p
    JOIN mov m          ON m.janela = p.janela AND m.embalagem_id = p.embalagem_id
    JOIN vol_janela v   ON v.janela = p.janela
    JOIN peso_inicial w ON w.embalagem_id = p.embalagem_id
    GROUP BY p.janela, p.etapa_id, v.meses, v.caixas_movimentadas
)
SELECT
    janela,
    etapa_id,
    meses,
    caixas_avariadas,
    ROUND(CAST(taxa_pct AS NUMERIC), 4)                                                    AS taxa_pct,
    ROUND(CAST(taxa_pct - LAG(taxa_pct) OVER (PARTITION BY etapa_id ORDER BY janela) AS NUMERIC), 4) AS var_pp,
    ROUND(CAST(100.0 * (taxa_pct / FIRST_VALUE(taxa_pct) OVER (PARTITION BY etapa_id ORDER BY janela) - 1) AS NUMERIC), 2)
                                                                                           AS var_vs_inicio_pct,
    ROUND(CAST(taxa_ajustada_pct AS NUMERIC), 4)                                           AS taxa_ajustada_pct,
    ROUND(CAST(100.0 * (taxa_ajustada_pct / FIRST_VALUE(taxa_ajustada_pct) OVER (PARTITION BY etapa_id ORDER BY janela) - 1) AS NUMERIC), 2)
                                                                                           AS var_ajustada_vs_inicio_pct
FROM taxas
ORDER BY etapa_id, janela;
