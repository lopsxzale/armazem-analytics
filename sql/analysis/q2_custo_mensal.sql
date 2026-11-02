-- Q2. Quanto a avaria custa por mês? Marca as lacunas da série (meses sem dado na fonte).
WITH mov AS (
    SELECT periodo, ano, mes, SUM(caixas_movimentadas) AS caixas_movimentadas
    FROM movimentos_mensais
    GROUP BY periodo, ano, mes
),
perda AS (
    SELECT a.periodo, SUM(a.caixas) AS caixas_avariadas, SUM(a.caixas * e.preco_caixa_brl) AS custo_brl
    FROM avarias a
    JOIN itens i      ON i.item_code = a.item_code
    JOIN embalagens e ON e.embalagem_id = i.embalagem_id
    GROUP BY a.periodo
)
SELECT
    mov.periodo,
    ROUND(mov.caixas_movimentadas, 0)                                  AS caixas_movimentadas,
    perda.caixas_avariadas,
    ROUND(perda.custo_brl, 2)                                          AS custo_brl,
    ROUND(100.0 * perda.caixas_avariadas / mov.caixas_movimentadas, 3) AS taxa_pct,
    -- meses entre este período e o anterior presente na base (1 = sem lacuna)
    (mov.ano * 12 + mov.mes) - LAG(mov.ano * 12 + mov.mes) OVER (ORDER BY mov.periodo) AS meses_desde_anterior
FROM mov
JOIN perda ON perda.periodo = mov.periodo
ORDER BY mov.periodo;
