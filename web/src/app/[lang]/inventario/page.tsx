import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { codeToHtml } from "shiki";
import { CausesChart, FrequencyCharts, InventoryMethod, InventoryTopItems, IraChart } from "@/components/charts/inventory-charts";
import { About, Footer } from "@/components/closing";
import { Header } from "@/components/header";
import { Providers, type HighlightedSql } from "@/components/providers";
import { Section } from "@/components/section";
import { getDictionary } from "@/i18n";
import { hasLocale } from "@/i18n/config";
import { inventory, meta, sqlFiles } from "@/lib/data";
import { fill, formatters } from "@/lib/format";

const SECTIONS = ["inv-ira", "inv-causas", "inv-freq", "inv-itens", "inv-metodo"] as const;

export async function generateMetadata({ params }: PageProps<"/[lang]/inventario">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.inv.tabTitle,
    description: t.inv.description,
    openGraph: { title: t.inv.title, description: t.inv.description },
  };
}

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

export default async function InventoryPage({ params }: PageProps<"/[lang]/inventario">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const f = formatters(lang);
  const sql = await highlightSql();
  const a = inventory.achados;
  const p = inventory.premissas;
  const kpis = [
    { value: f.pp(a.ira_a_mensal_pct, 0), label: t.inv.kpis.iraA },
    { value: f.pp(a.avaria_nao_baixada_pct, 0), label: t.inv.kpis.cause },
    { value: f.brlCompact(a.custo_recomendado_mes), label: t.inv.kpis.cost },
    { value: f.int(a.itens_ativos), label: t.inv.kpis.items },
  ];

  return (
    <Providers lang={lang} sql={sql}>
      <Header page="v2" sections={SECTIONS} labels={t.inv.nav} />
      <main>
        <section id="top" className="relative isolate overflow-hidden px-4 pb-10 pt-28 sm:px-6 sm:pt-36">
          <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-60" />
          <div className="mx-auto max-w-6xl">
            <p className="rise mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1.5 text-xs font-medium text-ink-2">
              <span className="size-2 rounded-full bg-accent" />
              {t.inv.eyebrow}
            </p>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl">
              {t.inv.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">{t.inv.lede}</p>
            <p className="mt-4 inline-flex rounded-lg border border-dashed border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-muted">
              {t.inv.badge}
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.label} className="bg-surface/80 p-4 sm:p-6">
                  <dd className="text-2xl font-semibold tracking-tight text-ink sm:text-4xl">{k.value}</dd>
                  <dt className="mt-1 text-xs text-muted sm:text-sm">{k.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <Section
          id="inv-ira"
          index="01"
          eyebrow={t.inv.ira.eyebrow}
          title={t.inv.ira.title}
          lede={fill(t.inv.ira.lede, {
            iraA: f.pp(a.ira_a_mensal_pct, 0),
            iraC: f.pp(a.ira_c_mensal_pct, 1),
            meta: f.pp(p.ira_meta_pct, 0),
          })}
          takeaway={t.inv.ira.takeaway}
        >
          <IraChart />
        </Section>

        <Section
          id="inv-causas"
          index="02"
          eyebrow={t.inv.causes.eyebrow}
          title={t.inv.causes.title}
          lede={fill(t.inv.causes.lede, {
            pct: f.pp(a.avaria_nao_baixada_pct, 0),
            frac: f.pp(p.fracao_avaria_nao_baixada * 100, 0),
          })}
          takeaway={t.inv.causes.takeaway}
        >
          <CausesChart />
        </Section>

        <Section
          id="inv-freq"
          index="03"
          eyebrow={t.inv.freq.eyebrow}
          title={fill(t.inv.freq.title, { a: a.intervalo_a })}
          lede={fill(t.inv.freq.lede, {
            meta: f.pp(p.ira_meta_pct, 0),
            model: f.pp(a.ira_a_modelo_mensal_pct, 1),
            measured: f.pp(a.ira_a_mensal_pct, 1),
          })}
          takeaway={fill(t.inv.freq.takeaway, { ira: f.pp(a.ira_a_recomendada_pct, 0) })}
        >
          <FrequencyCharts />
        </Section>

        <Section id="inv-itens" index="04" eyebrow={t.inv.items.eyebrow} title={t.inv.items.title} lede={t.inv.items.lede}>
          <InventoryTopItems />
        </Section>

        <Section id="inv-metodo" index="05" eyebrow={t.inv.method.eyebrow} title={t.inv.method.title} lede={t.inv.method.lede}>
          <InventoryMethod />
        </Section>

        <About />
      </main>
      <Footer generatedAt={meta.gerado_em} />
    </Providers>
  );
}
