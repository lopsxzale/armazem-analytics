# Resumo executivo · Armazém Analytics v1 (refugo e avarias)

> Volumes **reais** de cerveja e barris (Montgomery County, 2017-06 a 2026-08, 27 meses com dado).
> Avarias e preços **simulados** (seed 42), com premissas em `src/referencias.py`. Gerado por `src/export_web.py`.
> Intervalos: p5–p95 de 120 simulações com premissas sorteadas em faixas plausíveis (`src/sensitivity.py`).

**Perda estimada:** R$ 210.215 por mês (0,84% das caixas movimentadas).

## O que o dado real mostra (sem simulação)

- **O mix mudou:** a lata foi de 38% para 54% do volume (2017→2026); o long neck, de 53% para 41%.
- **O volume é concentrado:** 233 de 9.537 itens somam 80% das caixas.
- **Estornos são raros** (0,013% das caixas), mas o barril estorna cerca de 10× mais que lata e long neck.

## 3 achados (sobre a camada simulada)

1. **46% do custo vem de 3 combinações** (43% a 50%): quebra no manuseio na separação, queda de palete no carregamento e quebra no manuseio no carregamento. Este achado depende sobretudo de quanto da avaria cai na separação, que é premissa.
2. **Long neck é 80% do custo com 51% do volume** (76% a 84%). É o achado mais robusto: vale em todas as faixas testadas.
3. **A taxa bruta engana:** na separação ela sobe 31% e nas outras etapas cai 11%, mas parte disso é só a troca de long neck por lata. **Ajustada por mix**, a separação sobe 46% e as outras ficam estáveis (-1%). A simulação embute +45% na separação: o método recupera a alta plantada (erro mediano de -1,3 p.p.), e sem alta plantada a taxa ajustada fica entre -5% e 5%.

## 3 ações

1. **Separação:** treinamento de manuseio e caixa plástica para fracionado de vidro.
2. **Long neck:** filme stretch extra e cantoneira no palete de vidro, separando lata de vidro na montagem.
3. **Indicador:** acompanhar a taxa de avaria **ajustada por mix**, não a bruta, para não confundir troca de embalagem com melhora de processo.

## Quanto economiza (reduzindo 30%)

| Frente | Economia por mês |
|---|---|
| Toda a avaria na separação | R$ 26.964 |
| Toda a avaria de long neck | R$ 50.371 |
| Só as 3 combinações principais | R$ 26.874 |

Premissa: preço médio por caixa de lata R$ 48, long neck (vidro) R$ 96, barril (retornável) R$ 420, outras R$ 70.
