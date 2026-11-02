import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { getDictionary } from "@/i18n";
import { hasLocale } from "@/i18n/config";
import { findings as fd, meta, pareto, real, sensitivity as sens } from "@/lib/data";
import { fill, formatters } from "@/lib/format";
import { comboLabel } from "@/lib/labels";
import { site } from "@/site.config";

export async function generateMetadata({ params }: PageProps<"/[lang]/resumo">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang);
  return { title: `${t.onePager.title} · ${t.brand}`, description: t.meta.description };
}

/** Resumo de 1 página: mesmo conteúdo do docs/resumo-executivo.md, pensado para imprimir/salvar em PDF (A4). */
export default async function OnePager({ params }: PageProps<"/[lang]/resumo">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const f = formatters(lang);
  const a = fd.achados;
  const range = (k: keyof typeof sens.faixas) => `${f.pp(sens.faixas[k].p5, 0)}–${f.pp(sens.faixas[k].p95, 0)}`;
  const [c1, c2, c3] = a.top3.map((c) => comboLabel(c.motivo_id, c.etapa_id, lang).toLowerCase());
  const cardVars: Record<string, Record<string, string | number>> = {
    top3: { top1: c1.charAt(0).toUpperCase() + c1.slice(1), top2: c2, top3: c3, range: range("top3_pct") },
    glass: {
      glassVol: f.pp(a.long_neck_pct_volume, 0),
      ratio: `${f.dec(a.long_neck_taxa_pct / a.lata_taxa_pct, 1)}×`,
      range: range("long_neck_pct_custo"),
    },
    picking: {
      raw: f.spp(a.separacao_var_pct, 0),
      othersAdj: f.spp(a.outras_var_ajustada_media_pct, 0),
      planted: f.pp(a.tendencia_plantada_pct, 0),
    },
  };
  const headline: Record<string, string> = {
    top3: f.pp(a.top3_pct, 0),
    glass: f.pp(a.long_neck_pct_custo, 0),
    picking: f.spp(a.separacao_var_ajustada_pct, 0),
  };
  const actionVars = {
    sep: f.brl0(fd.acoes.economia_separacao_mes),
    glass: f.brl0(fd.acoes.economia_long_neck_mes),
    top3: f.brl0(fd.acoes.economia_top3_mes),
  };
  const keg = real.estornos.find((e) => e.embalagem_id === "barril")!;
  const realFacts = [
    fill(t.real.mixFact, {
      canStart: f.pp(real.lata_inicio_pct, 0),
      canEnd: f.pp(real.lata_fim_pct, 0),
      y0: real.ano_inicio,
      y1: real.ano_fim,
    }),
    fill(t.real.concText, { a: f.int(real.itens_a), total: f.int(real.itens_total), pct: f.pp(real.pct_volume_a, 0) }),
    fill(t.real.estText, { rate: f.pp(real.estornos_taxa_pct, 3), months: keg.meses_com_estorno, all: meta.meses }),
  ];
  const url = site.url ? new URL(`/${lang}/`, site.url).toString() : "";

  return (
    <main className="onepager mx-auto max-w-[820px] bg-white px-6 py-8 text-[13px] leading-snug text-neutral-900 sm:px-10 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link href={`/${lang}/`} className="text-sm text-neutral-600 underline-offset-4 hover:underline">
          ← {t.onePager.back}
        </Link>
        <PrintButton label={t.onePager.print} />
      </div>

      <header className="border-b-2 border-amber-500 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700">
          {t.brand} · {t.onePager.title}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.hero.title}</h1>
        <p className="mt-1 text-[12px] text-neutral-600">
          {fill(t.onePager.source, {
            start: f.month(meta.periodo_inicio),
            end: f.month(meta.periodo_fim),
            months: meta.meses,
            runs: sens.rodadas,
          })}
        </p>
      </header>

      <section className="mt-4 grid grid-cols-3 gap-3">
        <Stat value={f.brlCompact(meta.custo_medio_mensal_brl)} label={t.hero.kpis.monthly} />
        <Stat value={f.pp(meta.taxa_pct, 2)} label={t.hero.kpis.rate} />
        <Stat value={`${pareto.combos_ate_80}/${pareto.total_combos}`} label={t.onePager.combos80} />
      </section>

      <h2 className="mt-5 text-[11px] font-bold uppercase tracking-widest text-neutral-500">{t.real.badge}</h2>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        {realFacts.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <h2 className="mt-5 text-[11px] font-bold uppercase tracking-widest text-neutral-500">{t.onePager.findings}</h2>
      <ol className="mt-1.5 space-y-2">
        {t.summary.cards.map((c, i) => (
          <li key={c.value} className="flex gap-3">
            <span className="w-16 shrink-0 text-lg font-bold text-amber-700">{headline[c.value]}</span>
            <span>
              <b>
                {i + 1}. {c.title}.
              </b>{" "}
              {fill(c.text, cardVars[c.value])}
            </span>
          </li>
        ))}
      </ol>

      <h2 className="mt-5 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
        {fill(t.actions.lede, { pct: `${fd.acoes.reducao_pct}%` })}
      </h2>
      <table className="mt-1.5 w-full border-collapse">
        <tbody>
          {t.actions.items.map((it) => (
            <tr key={it.title} className="border-t border-neutral-200 align-top">
              <td className="py-1.5 pr-3 font-semibold">{it.title}</td>
              <td className="py-1.5 pr-3 text-neutral-700">{it.text}</td>
              <td className="whitespace-nowrap py-1.5 text-right font-semibold">{fill(it.impact, actionVars)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-5 border-t border-neutral-200 pt-2 text-[11px] text-neutral-500">
        {t.footer.data} {url && <span>· {url}</span>} · {site.repo.replace("https://", "")}
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-3 py-2">
      <p className="text-xl font-bold tracking-tight">{value}</p>
      <p className="text-[11px] text-neutral-600">{label}</p>
    </div>
  );
}
