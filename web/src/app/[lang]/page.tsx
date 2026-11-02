import { notFound } from "next/navigation";
import { codeToHtml } from "shiki";
import { AbcCharts } from "@/components/charts/abc-charts";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { PackagingCharts } from "@/components/charts/packaging-charts";
import { RealCharts } from "@/components/charts/real-charts";
import { RobustCharts } from "@/components/charts/robust-chart";
import { ParetoChart } from "@/components/charts/pareto-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { About, Actions, Footer, Method } from "@/components/closing";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Providers, type HighlightedSql } from "@/components/providers";
import { Section } from "@/components/section";
import { Simulator } from "@/components/simulator";
import { Summary } from "@/components/summary";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { abc, findings as fd, meta, pareto, real, sensitivity as sens, sqlFiles } from "@/lib/data";
import { fill, formatters } from "@/lib/format";
import { comboLabel } from "@/lib/labels";

// Destaque de sintaxe roda no build; o cliente recebe só o HTML pronto.
async function highlightSql(): Promise<HighlightedSql> {
  const entries = await Promise.all(
    Object.entries(sqlFiles).map(async ([id, file]) => {
      const html = await codeToHtml(file.sql, {
        lang: "sql",
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: "light",
      });
      return [id, { html, raw: file.sql }] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const f = formatters(lang);
  const sql = await highlightSql();

  const a = fd.achados;
  const top = pareto.combos[0];
  const classA = abc.classes.find((c) => c.classe === "A")!;
  const savings = {
    pct: `${fd.acoes.reducao_pct}%`,
    sep: f.brl0(fd.acoes.economia_separacao_mes),
    glass: f.brl0(fd.acoes.economia_long_neck_mes),
  };

  return (
    <Providers lang={lang} sql={sql}>
      <Header />
      <main>
        <Hero />
        <Summary />

        <Section
          id="real"
          index="01"
          eyebrow={t.real.eyebrow}
          title={t.real.title}
          lede={fill(t.real.lede, {
            canStart: f.pp(real.lata_inicio_pct, 0),
            canEnd: f.pp(real.lata_fim_pct, 0),
            y0: real.ano_inicio,
            y1: real.ano_fim,
          })}
          takeaway={t.real.takeaway}
        >
          <RealCharts months={meta.meses} />
        </Section>

        <Section
          id="pareto"
          index="02"
          eyebrow={t.pareto.eyebrow}
          title={t.pareto.title}
          lede={fill(t.pareto.lede, {
            n80: pareto.combos_ate_80,
            top: comboLabel(top.motivo_id, top.etapa_id, lang).toLowerCase(),
            topPct: f.pp(top.pct, 0),
          })}
          takeaway={t.pareto.takeaway}
        >
          <ParetoChart />
        </Section>

        <Section
          id="packaging"
          index="03"
          eyebrow={t.packaging.eyebrow}
          title={t.packaging.title}
          lede={fill(t.packaging.lede, {
            glassVol: f.pp(a.long_neck_pct_volume, 0),
            glassCost: f.pp(a.long_neck_pct_custo, 0),
          })}
          takeaway={t.packaging.takeaway}
        >
          <PackagingCharts />
        </Section>

        <Section
          id="monthly"
          index="04"
          eyebrow={t.monthly.eyebrow}
          title={fill(t.monthly.title, { monthly: f.brlCompact(meta.custo_medio_mensal_brl) })}
          lede={t.monthly.lede}
          takeaway={fill(t.monthly.takeaway, { rate: f.pp(meta.taxa_pct, 2) })}
        >
          <MonthlyChart />
        </Section>

        <Section
          id="trend"
          index="05"
          eyebrow={t.trend.eyebrow}
          title={t.trend.title}
          lede={fill(t.trend.lede, {
            raw: f.spp(a.separacao_var_pct, 0),
            adj: f.spp(a.separacao_var_ajustada_pct, 0),
            planted: f.pp(a.tendencia_plantada_pct, 0),
          })}
          takeaway={t.trend.takeaway}
        >
          <TrendChart />
        </Section>

        <Section
          id="abc"
          index="06"
          eyebrow={t.abc.eyebrow}
          title={t.abc.title}
          lede={fill(t.abc.lede, {
            aItems: f.int(classA.itens),
            aVol: f.pp(classA.pct_volume, 0),
            aCost: f.pp(classA.pct_custo, 0),
          })}
          takeaway={t.abc.takeaway}
        >
          <AbcCharts />
        </Section>

        <Section
          id="robust"
          index="07"
          eyebrow={t.robust.eyebrow}
          title={t.robust.title}
          lede={fill(t.robust.lede, {
            runs: sens.rodadas,
            m0: f.dec(sens.faixas_premissas.mult_long_neck.min, 1),
            m1: f.dec(sens.faixas_premissas.mult_long_neck.max, 1),
            s0: f.pp(sens.faixas_premissas.participacao_separacao.min * 100, 0),
            s1: f.pp(sens.faixas_premissas.participacao_separacao.max * 100, 0),
            t1: f.pp((sens.faixas_premissas.tendencia_separacao.max - 1) * 100, 0),
          })}
          takeaway={fill(t.robust.takeaway, { err: `${f.dec(sens.recuperacao.erro_mediano_pp, 1)} p.p.` })}
        >
          <RobustCharts />
        </Section>

        <Section
          id="simulator"
          index="08"
          eyebrow={t.simulator.eyebrow}
          title={t.simulator.title}
          lede={t.simulator.lede}
          takeaway={fill(t.simulator.takeaway, savings)}
        >
          <Simulator />
        </Section>

        <Section
          id="actions"
          index="09"
          eyebrow={t.actions.eyebrow}
          title={t.actions.title}
          lede={fill(t.actions.lede, savings)}
        >
          <Actions />
        </Section>

        <Section id="method" index="10" eyebrow={t.method.eyebrow} title={t.method.title} lede={t.method.lede}>
          <Method />
        </Section>

        <About />
      </main>
      <Footer generatedAt={meta.gerado_em} />
    </Providers>
  );
}
