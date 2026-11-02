# Armazém Analytics

**Onde um armazém de bebidas perde dinheiro, e o que fazer primeiro?** Análise de ponta a ponta (extração → banco relacional → SQL analítico → métricas em Python → site interativo) sobre a rotina de armazém: **refugo e avarias**, **acuracidade de inventário**, **validade (FEFO)** e **devoluções**. Cada achado vira uma ação concreta para o chão do armazém.

> **Status:** v1 (refugo e avarias) publicada. Site: **[armazem-analytics.vercel.app](https://armazem-analytics.vercel.app/pt/)** · Resumo: [`docs/resumo-executivo.md`](docs/resumo-executivo.md)

## Resultados da v1

**Só dado real** (Montgomery County, 27 meses entre jun/2017 e ago/2026):

- **O mix mudou:** a lata foi de 38% para 54% do volume e o long neck de 53% para 41%. Como lata quebra menos, qualquer taxa de avaria bruta cai sozinha com o tempo.
- **O volume é concentrado:** 233 de 9.537 itens (2,4%) somam 80% das caixas.
- **Estornos são raros** (0,013% das caixas), mas o barril estorna em 26 dos 27 meses, cerca de 10× mais que as outras embalagens.

**Sobre a camada simulada** (intervalos p5–p95 de 120 simulações com premissas sorteadas em faixas, `src/sensitivity.py`):

- **Long neck é 80% do custo com 51% do volume** (76–84%). É o achado mais robusto às premissas.
- **46% do custo vem de 3 combinações** motivo × etapa (43–50%). Depende sobretudo de quanto da avaria cai na separação, que é premissa.
- **A taxa bruta engana:** na separação ela sobe 31% e nas outras etapas cai 11%. **Ajustada por mix**, a separação sobe 46% e as outras ficam estáveis. A alta foi plantada (+45%) para testar o método, que a recupera com erro mediano de −1,3 p.p.; sem alta plantada, a taxa ajustada fica entre −5% e +5%.
- Perda estimada de **R$ 210 mil por mês** (0,84% das caixas); reduzir 30% da avaria na separação economiza cerca de **R$ 27 mil por mês**.

## Como rodar

```bash
python -m venv .venv && .venv/Scripts/activate      # Windows (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
python src/extract.py      # baixa o Montgomery para data/raw/ (30 MB, fora do git)
python src/transform.py    # cerveja e barris, embalagem pela descrição -> data/app/*.parquet
python src/simulate.py     # avarias simuladas, seed fixo -> data/sim/avarias.parquet
python src/sensitivity.py  # ~2 min: achados com premissas variando -> web/src/data/sensibilidade.json
python src/load.py         # (opcional) banco SQLite em data/armazem.db para explorar as queries
python src/export_web.py   # roda sql/analysis/ e gera web/src/data/*.json + docs/resumo-executivo.md
pytest -q && ruff check .
cd web && npm install && npm run dev
```

`data/app/` e `data/sim/` são versionados, então os passos a partir de `simulate.py` (e o CI) rodam sem baixar o dado bruto.

---

## Por que este projeto existe

Trabalho como Aprendiz de Armazém numa revenda de bebidas. O dia a dia mostra os mesmos problemas se repetindo: produto avariado na separação, divergência entre sistema e contagem física, item perto de vencer no fundo da posição, retorno de rota sem motivo claro. Este projeto transforma essa vivência em um método de análise: perguntas de negócio claras, dados estruturados, SQL e Python testados, e recomendações que dá para executar.

## Princípio de dados (regra inegociável)

O código é **público e genérico**. Os dados mudam conforme o uso:

| Uso | Dados | Onde ficam | Vai para o GitHub? |
|---|---|---|---|
| Portfólio (público) | Dados abertos + camada simulada, declarada como simulada | `data/raw/`, `data/sim/` | Sim |
| Testes locais (opcional) | Qualquer planilha que não possa ser pública | `data/private/` | **Nunca** (`.gitignore`) |

- **Montgomery County (EUA): Warehouse and Retail Sales.** Dados reais e mensais de um armazém público de bebidas (cerveja, vinho, destilados), por item e fornecedor: vendas do armazém, transferências e vendas no varejo. É a base de volume, giro e curva ABC.
- **FAO: indicador 12.3.1a.** 13,2% dos alimentos se perdem entre a colheita e o varejo (2021). A base FLW da FAO só exporta por sessão interativa, então o número entra como constante citada em `src/referencias.py` e serve de **teto**: bebida embalada perde muito menos, e a taxa base simulada é 0,6% das caixas.
- **Camada simulada** (seed fixo, reproduzível): ocorrências de avaria por SKU, embalagem (lata, long neck, barril; derivada da descrição do item), etapa (doca, armazenagem, separação, carregamento) e motivo, presas aos volumes reais de Montgomery. Todas as premissas (taxas, multiplicadores, preços em R$) ficam em `src/referencias.py`.
- **Nenhum dado de empresa** entra no repositório, no site ou em prints. `data/private/` existe só para testes locais e é ignorado pelo git.

## Fases e perguntas de negócio

| Fase | Tema | Perguntas | Entrega |
|---|---|---|---|
| **v1** | Refugo & avarias | Quais motivos, embalagens e etapas explicam 80% da perda (Pareto)? Quanto isso custa por mês? Onde a perda está crescendo? | Pareto em SQL (window functions), custo mensal e um **simulador de economia** ("reduzir X% da avaria na etapa Y economiza R$ Z") |
| v2 | Acuracidade de inventário | Quais SKUs e posições divergem mais entre sistema e contagem? A divergência se concentra na curva A? | Ranking de divergência por curva ABC e sugestão de frequência de contagem cíclica |
| v3 | Validade / FEFO | Quais itens correm risco de vencer, dado o giro real? Quanto valor está em risco nos próximos 30/60/90 dias? | Alerta de vencimento por giro e fila de saída FEFO |
| v4 | Devoluções / retorno | Quais motivos e rotas mais devolvem? Quanto volta como refugo? | Pareto de motivos de devolução e custo por rota |

## Arquitetura

```
Montgomery (dado aberto) ──► src/extract.py ──► data/raw/ ──► src/transform.py ──► data/app/
                                                                                        │
src/simulate.py (seed fixo, premissas em src/referencias.py) ──► data/sim/   data/private/ (só local)
                                           │                       │
                                           ▼                       ▼
                    src/load.py ──► SQLite (DDL compatível com PostgreSQL)
                                           │
                                           ▼
                         sql/analysis/ (uma query por pergunta)
                                           │
                    src/metrics.py (funções puras, testadas)
                                           │
                    src/export_web.py ──► web/src/data/*.json (só dados públicos/simulados)
                                           │
                                           ▼
                    web/ (Next.js, PT/EN, export estático) ──► Vercel
```

```
armazem-analytics/
├── data/
│   ├── raw/        # dado bruto baixado (Montgomery), fora do git
│   ├── app/        # painéis tratados (parquet), versionados
│   ├── sim/        # camada simulada gerada por src/simulate.py
│   └── private/    # dados reais: SÓ LOCAL, no .gitignore
├── sql/
│   ├── schema.sql
│   └── analysis/   # q1_pareto_motivo_etapa.sql ... q6_top_itens.sql
├── src/            # extract, transform, simulate, load, metrics, export_web, referencias
├── tests/          # pytest: parsing, simulação, métricas, contrato dos JSONs
├── docs/           # resumo executivo e imagens
└── web/            # site Next.js
```

**Stack:** Python 3.11+, pandas, NumPy, SQLite (DDL compatível com PostgreSQL), SQL (CTEs e window functions), pytest, ruff, GitHub Actions, Next.js. É o mesmo padrão do [`logistics-distribution-analytics`](https://github.com/lopsxzale/logistics-distribution-analytics).

## Resumo executivo

Além do site, o projeto tem um resumo de **uma página** (`docs/resumo-executivo.md`) para quem quer a conclusão em um minuto:

1. **3 achados:** por exemplo, "70% da perda vem de 2 motivos na separação".
2. **3 ações:** por exemplo, "proteção extra em palete de long neck", "contagem cíclica semanal da curva A".
3. **Quanto economiza:** estimativa do simulador, com a premissa escrita ao lado.

## Checklist

- [x] `git init` e `.gitignore` antes do primeiro commit (`data/private/`, `data/raw/`, `.venv/`, `__pycache__/`)
- [x] Ambiente e `requirements.txt` (pandas, pyarrow, requests, pytest, ruff)
- [x] Dataset *Warehouse and Retail Sales*: 341 mil linhas, 27 meses com lacunas (2018, 2020–2026), última carga ago/2026
- [x] Referência da FAO (constante citada; a base FLW não tem download por script)
- [x] `sql/schema.sql` (`itens`, `movimentos_mensais`, `avarias`, `motivos`, `etapas`, `embalagens`)
- [x] `src/simulate.py` com seed fixo e premissas em `src/referencias.py`
- [x] Queries `sql/analysis/q1` a `q6`, com testes de contrato em `tests/`
- [x] Publicar a v1
- [ ] Atualizar o card "Lote 002 · Armazém" no portfólio, trocando "Em andamento" pelos números reais
