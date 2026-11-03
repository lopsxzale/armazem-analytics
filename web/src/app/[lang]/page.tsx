import { notFound } from "next/navigation";
import { codeToHtml } from "shiki";
import { AbcCharts } from "@/components/charts/abc-charts";
import { BottleCharts } from "@/components/charts/bottle-charts";
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
import { StageMap } from "@/components/stage-map";
import { Summary } from "@/components/summary";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { abc, bottles, findings as fd, meta, pareto, real, sensitivity as sens, sqlFiles } from "@/lib/data";
import { fill, formatters } from "@/lib/format";
import { bottleReasonLabel, bottleShort, comboLabel } from "@/lib/labels";

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
  const b = bottles.achados;

  return (
    <Providers lang={lang} sql={sql}>
      <Header />
      <main>
        <Hero />
        <Summary />
        <StageMap />

        <Section
          id="real"
          index="01"
          eyebrow={t.real.eyebrow}
          title={fill(t.real.title, { canStart: f.pp(real.lata_inicio_pct, 0), canEnd: f.pp(real.lata_fim_pct, 0) })}
          lede={fill(t.real.lede, {
            canStart: f.pp(real.lata_inicio_pct, 0),
            canEnd: f.pp(real.lata_fim_pct, 0),
            y0: real.ano_inicio,
            y1: real.ano_fim,
          })}
          takeaway={t.real.takeaway}
          stat={{ value: real.lata_fim_pct, format: "pct0", label: fill(t.real.stat, { y1: real.ano_fim }) }}
        >
          <RealCharts months={meta.meses} />
        </Section>

        <Section
          id="pareto"
          index="02"
          eyebrow={t.pareto.eyebrow}
          title={fill(t.pareto.title, { n80: pareto.combos_ate_80, total: pareto.total_combos })}
          lede={fill(t.pareto.lede, {
            n80: pareto.combos_ate_80,
            top: comboLabel(top.motivo_id, top.etapa_id, lang).toLowerCase(),
            topPct: f.pp(top.pct, 0),
          })}
          takeaway={t.pareto.takeaway}
          stat={{ value: top.pct, format: "pct0", label: t.pareto.stat }}
        >
          <ParetoChart />
        </Section>

        <Section
          id="packaging"
          index="03"
          eyebrow={t.packaging.eyebrow}
          title={fill(t.packaging.title, { glassVol: f.pp(a.long_neck_pct_volume, 0), glassCost: f.pp(a.long_neck_pct_custo, 0) })}
          lede={fill(t.packaging.lede, {
            glassVol: f.pp(a.long_neck_pct_volume, 0),
            glassCost: f.pp(a.long_neck_pct_custo, 0),
          })}
          takeaway={t.packaging.takeaway}
          stat={{ value: a.long_neck_pct_custo, format: "pct0", label: t.packaging.stat }}
        >
          <PackagingCharts />
        </Section>

        <Section
          id="bottles"
          index="04"
          eyebrow={t.bottles.eyebrow}
          title={fill(t.bottles.title, { worst: bottleShort(b.pior_tipo), cost: f.pp(b.pior_pct_custo, 0) })}
          lede={fill(t.bottles.lede, {
            worst: bottleShort(b.pior_tipo),
            outside: f.pp(b.de_fora_pct, 0),
            reason: bottleReasonLabel(b.top_motivo, lang).toLowerCase(),
            reasonPct: f.pp(b.top_motivo_pct, 0),
          })}
          takeaway={fill(t.bottles.takeaway, {
            inside: f.pp(b.interno_pct, 0),
            saving: f.brl0(b.economia_interno_mes),
            pct: `${b.reducao_pct}%`,
          })}
          stat={{
            value: b.refugados_mes,
            format: "int",
            label: fill(t.bottles.stat, { cost: f.brl0(b.custo_mes_brl), rate: f.pp(b.taxa_pct, 1) }),
          }}
        >
          <BottleCharts />
        </Section>

        <Section
          id="monthly"
          index="05"
          eyebrow={t.monthly.eyebrow}
          title={fill(t.monthly.title, { monthly: f.brlCompact(meta.custo_medio_mensal_brl) })}
          lede={t.monthly.lede}
          takeaway={fill(t.monthly.takeaway, { rate: f.pp(meta.taxa_pct, 2) })}
        >
          <MonthlyChart />
        </Section>

        <Section
          id="trend"
          index="06"
          eyebrow={t.trend.eyebrow}
          title={fill(t.trend.title, { adj: f.spp(a.separacao_var_ajustada_pct, 0) })}
          lede={fill(t.trend.lede, {
            raw: f.spp(a.separacao_var_pct, 0),
            adj: f.spp(a.separacao_var_ajustada_pct, 0),
            planted: f.pp(a.tendencia_plantada_pct, 0),
          })}
          takeaway={t.trend.takeaway}
          stat={{ value: a.separacao_var_ajustada_pct, format: "spp0", label: t.trend.stat }}
        >
          <TrendChart />
        </Section>

        <Section
          id="abc"
          index="07"
          eyebrow={t.abc.eyebrow}
          title={fill(t.abc.title, { aItems: f.int(classA.itens), aCost: f.pp(classA.pct_custo, 0) })}
          lede={fill(t.abc.lede, {
            aItems: f.int(classA.itens),
            aVol: f.pp(classA.pct_volume, 0),
            aCost: f.pp(classA.pct_custo, 0),
          })}
          takeaway={t.abc.takeaway}
          stat={{ value: classA.pct_custo, format: "pct0", label: fill(t.abc.stat, { n: f.int(classA.itens) }) }}
        >
          <AbcCharts />
        </Section>

        <Section
          id="robust"
          index="08"
          eyebrow={t.robust.eyebrow}
          title={fill(t.robust.title, { glass: f.pp(a.long_neck_pct_custo, 0) })}
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
          index="09"
          eyebrow={t.simulator.eyebrow}
          title={t.simulator.title}
          lede={t.simulator.lede}
          takeaway={fill(t.simulator.takeaway, savings)}
        >
          <Simulator />
        </Section>

        <Section
          id="actions"
          index="10"
          eyebrow={t.actions.eyebrow}
          title={t.actions.title}
          lede={fill(t.actions.lede, savings)}
        >
          <Actions />
        </Section>

        <Section id="method" index="11" eyebrow={t.method.eyebrow} title={t.method.title} lede={t.method.lede}>
          <Method />
        </Section>

        <About />
      </main>
      <Footer generatedAt={meta.gerado_em} />
    </Providers>
  );
}
