# Resumo executivo · Armazém Analytics v1 (refugo e avarias)

> Volumes reais de cerveja e barris (Montgomery County, 2017-06 a 2026-08, 27 meses com dado).
> Avarias e preços **simulados** (seed 42), com premissas em `src/referencias.py`. Gerado por `src/export_web.py`.

**Perda estimada:** R$ 210.215 por mês (0,84% das caixas movimentadas).

## 3 achados

1. **46% do custo vem de 3 combinações:** quebra no manuseio na separação, queda de palete no carregamento e quebra no manuseio no carregamento. 9 combinações motivo × etapa explicam 80% da perda.
2. **Long neck é 80% do custo com 51% do volume.** A taxa de avaria do vidro (1,16%) é 2,4× a da lata.
3. **A avaria na separação cresceu 31%** entre a primeira e a última janela da série, enquanto as outras etapas variaram -11% em média.

## 3 ações

1. **Separação:** treinamento de manuseio e caixa plástica para fracionado de vidro.
2. **Long neck:** filme stretch extra e cantoneira no palete de vidro, separando lata de vidro na montagem.
3. **Carregamento e armazenagem:** padrão de amarração e limite de empilhamento sinalizado na posição.

## Quanto economiza (reduzindo 30%)

| Frente | Economia por mês |
|---|---|
| Toda a avaria na separação | R$ 26.964 |
| Toda a avaria de long neck | R$ 50.371 |
| Só as 3 combinações principais | R$ 26.874 |

Premissa: preço médio por caixa de lata R$ 48, long neck (vidro) R$ 96, barril (retornável) R$ 420, outras R$ 70.
