"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { PACKAGES, real } from "@/lib/data";
import { fill } from "@/lib/format";
import { packageColor, packageLabel } from "@/lib/labels";
import { ChartFrame } from "../chart-frame";
import { CountUp, Reveal, useChartInView } from "../motion";
import { useI18n } from "../providers";

/** Barras 100% empilhadas: um ano por linha, um segmento por embalagem (ordem fixa, com 2px de respiro). */
function MixBars() {
  const { lang, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const years = [...new Set(real.mix.map((m) => m.ano))];

  return (
    <div ref={ref} className="space-y-2.5">
      {years.map((y, i) => (
        <div key={y} className="grid grid-cols-[40px_1fr] items-center gap-3">
          <span className="text-xs font-medium text-ink-2 tabular">{y}</span>
          <div className="flex h-7 gap-[2px] overflow-hidden rounded-md">
            {PACKAGES.map((p) => {
              const row = real.mix.find((m) => m.ano === y && m.embalagem_id === p);
              if (!row) return null;
              const key = `${y}-${p}`;
              return (
                <motion.div
                  key={p}
                  tabIndex={0}
                  title={`${y} · ${packageLabel(p, lang)}: ${f.pp(row.pct, 1)}`}
                  aria-label={`${y} · ${packageLabel(p, lang)}: ${f.pp(row.pct, 1)}`}
                  onPointerEnter={() => setHover(key)}
                  onPointerLeave={() => setHover(null)}
                  className="flex h-full items-center justify-center overflow-hidden outline-none"
                  style={{ background: packageColor(p), opacity: hover && hover !== key ? 0.55 : 1 }}
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${row.pct}%` : 0 }}
                  transition={{ duration: 0.8, delay: 0.08 * i }}
                >
                  {row.pct >= 9 && (
                    <span className={`text-[11px] font-semibold tabular ${p === "outras" ? "text-[#0b0b0b]" : "text-white"}`}>
                      {f.pp(row.pct, 0)}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReversalBars() {
  const { lang, t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLUListElement>();
  const max = Math.max(...real.estornos.map((e) => e.taxa_pct));

  return (
    <ul ref={ref} className="space-y-3">
      {real.estornos.map((e, i) => (
        <li key={e.embalagem_id} className="grid grid-cols-[96px_1fr_64px] items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: packageColor(e.embalagem_id) }} />
            {packageLabel(e.embalagem_id, lang)}
          </span>
          <div className="h-2.5 rounded-full bg-surface-2">
            <motion.div
              className="h-full rounded-full"
              style={{ background: packageColor(e.embalagem_id) }}
              initial={{ width: 0 }}
              animate={{ width: inView ? `${Math.max((e.taxa_pct / max) * 100, 1.5)}%` : 0 }}
              transition={{ duration: 0.8, delay: 0.08 * i }}
            />
          </div>
          <span className="text-right text-ink tabular">
            <span className="font-semibold">{f.pp(e.taxa_pct, 3)}</span>
            <span className="block text-[10.5px] text-muted">
              {e.meses_com_estorno} {t.real.months}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RealCharts({ months }: { months: number }) {
  const { lang, t, f } = useI18n();
  const keg = real.estornos.find((e) => e.embalagem_id === "barril")!;

  return (
    <div className="space-y-4">
      <ChartFrame
        title={t.real.mixTitle}
        subtitle={t.real.mixSubtitle}
        sqlId="q7"
        legend={PACKAGES.map((p) => ({ label: packageLabel(p, lang), color: packageColor(p) }))}
        table={{
          columns: ["", ...PACKAGES.map((p) => packageLabel(p, lang))],
          rows: [...new Set(real.mix.map((m) => m.ano))].map((y) => [
            String(y),
            ...PACKAGES.map((p) => f.pp(real.mix.find((m) => m.ano === y && m.embalagem_id === p)?.pct ?? 0, 1)),
          ]),
        }}
      >
        <MixBars />
      </ChartFrame>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Reveal>
          <div className="card h-full p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{t.real.concTitle}</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-ink">
              <CountUp value={(real.itens_a / real.itens_total) * 100} format={(v) => f.pp(v, 1)} />
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {fill(t.real.concText, { a: f.int(real.itens_a), total: f.int(real.itens_total), pct: f.pp(real.pct_volume_a, 0) })}
            </p>
          </div>
        </Reveal>
        <ChartFrame
          title={t.real.estTitle}
          subtitle={fill(t.real.estText, {
            rate: f.pp(real.estornos_taxa_pct, 3),
            months: keg.meses_com_estorno,
            all: months,
          })}
          sqlId="q8"
          table={{
            columns: ["", "%", t.real.months],
            rows: real.estornos.map((e) => [packageLabel(e.embalagem_id, lang), f.pp(e.taxa_pct, 4), e.meses_com_estorno]),
          }}
        >
          <ReversalBars />
        </ChartFrame>
      </div>
    </div>
  );
}
