-- Q12. (v2) Base da frequência de contagem: ritmo de eventos por classe e quantos itens/posições estão ativos.
-- A frequência recomendada sai de src/metrics.py:frequencia_recomendada (maior intervalo com IRA >= meta).
WITH eventos AS (
    SELECT
        c.classe,
        SUM(CASE WHEN d.causa_id = 'avaria_nao_baixada' THEN d.eventos ELSE 0 END) AS eventos_avaria,
        SUM(CASE WHEN d.causa_id <> 'avaria_nao_baixada' THEN d.eventos ELSE 0 END) AS eventos_erro
    FROM contagens c
    JOIN divergencias d ON d.periodo = c.periodo AND d.item_code = c.item_code
    GROUP BY c.classe
),
contagens_classe AS (
    SELECT classe, COUNT(*) AS item_meses, AVG(estoque_sistema) AS estoque_medio, MAX(posicoes) AS posicoes
    FROM contagens
    GROUP BY classe
),
ativos AS (
    -- itens com movimento nos 3 últimos meses da base: o que precisa ser contado hoje
    SELECT classe, COUNT(DISTINCT item_code) AS itens_ativos
    FROM contagens
    WHERE periodo IN (SELECT DISTINCT periodo FROM contagens ORDER BY periodo DESC LIMIT 3)
    GROUP BY classe
)
SELECT
    k.classe,
    k.item_meses,
    ROUND(CAST(k.estoque_medio AS NUMERIC), 2) AS estoque_medio,
    k.posicoes,
    a.itens_ativos,
    e.eventos_avaria,
    e.eventos_erro
FROM contagens_classe k
JOIN eventos e ON e.classe = k.classe
JOIN ativos a  ON a.classe = k.classe
ORDER BY k.classe;
