-- Q10. (v2) Quais itens mais divergem em valor? Top 10, com a causa que mais gera eventos em cada um.
WITH por_causa AS (
    SELECT
        d.item_code,
        d.causa_id,
        SUM(d.eventos)                         AS eventos,
        SUM(ABS(d.caixas) * e.preco_caixa_brl) AS valor_brl
    FROM divergencias d
    JOIN itens i      ON i.item_code = d.item_code
    JOIN embalagens e ON e.embalagem_id = i.embalagem_id
    GROUP BY d.item_code, d.causa_id
),
por_item AS (
    SELECT
        item_code,
        causa_id,
        SUM(valor_brl) OVER (PARTITION BY item_code)                     AS valor_brl,
        SUM(eventos)   OVER (PARTITION BY item_code)                     AS eventos,
        ROW_NUMBER()   OVER (PARTITION BY item_code ORDER BY eventos DESC, causa_id) AS rn
    FROM por_causa
),
classe AS (
    SELECT DISTINCT item_code, classe FROM contagens
)
SELECT
    p.item_code,
    i.descricao,
    i.embalagem_id,
    c.classe,
    p.causa_id                                 AS causa_principal,
    p.eventos,
    ROUND(CAST(p.valor_brl AS NUMERIC), 2)     AS valor_brl
FROM por_item p
JOIN itens i  ON i.item_code = p.item_code
JOIN classe c ON c.item_code = p.item_code
WHERE p.rn = 1
ORDER BY p.valor_brl DESC, p.item_code
LIMIT 10;
