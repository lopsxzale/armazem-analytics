# Resumo executivo · Armazém Analytics v2 (acuracidade de inventário)

> Giro e classe ABC **reais** (Montgomery County). Estoque em sistema, posições e divergências **simulados**
> (premissas em `src/referencias.py`, `INVENTARIO`). Gerado por `src/export_web.py`.

## 3 achados

1. **A curva A é onde o estoque erra:** contando todo mês, a IRA (contagens que batem com o sistema) é 87% na A e 99,5% na C. Erro por caixa é igual nas classes; a A erra mais porque movimenta mais.
2. **57% do valor divergente é avaria não baixada:** a perda da v1 que ninguém lança vira erro de estoque. Depende da premissa de que 25% das avarias não são lançadas.
3. **O modelo bate com a simulação:** a regra de frequência prevê 86,6% de IRA mensal na A, contra 87,0% medidos.

## Frequência recomendada (meta de IRA 95%)

| Classe | Itens ativos | Contagem | IRA (mensal → recomendada) | Custo/mês |
|---|---|---|---|---|
| A | 212 | a cada 14 dias | 87% → 99% | R$ 5.451 |
| B | 296 | a cada 30 dias | 95% → 95% | R$ 2.368 |
| C | 2140 | a cada 90 dias | 100% → 100% | R$ 2.853 |

**Total:** R$ 10.673 por mês, contra R$ 13.472 contando tudo todo mês, com a IRA da curva A subindo para 99%.

## Ações

1. **Baixa de avaria no ato:** registrar a avaria na hora em que acontece (liga a v1 à v2).
2. **Contagem cíclica por classe:** A a cada 14 dias, B a cada 30, C a cada 90.
3. **Indicador:** acompanhar a IRA por classe, não a média geral, que esconde a curva A atrás de milhares de itens C.
