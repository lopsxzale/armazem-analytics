"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { matrix, PACKAGES, STAGES, type Package, type Stage } from "@/lib/data";
import { packageColor, packageLabel, seqColor, stageLabel } from "@/lib/labels";
import { fill } from "@/lib/format";
import { ChartFrame, Details, SeqLegend } from "../chart-frame";
import { useChartInView } from "../motion";
import { useI18n } from "../providers";

/** Para cada embalagem: % do volume (barra neutra) contra % do custo (barra na cor da embalagem). */
function ShareBars() {
  const { lang, t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLDivElement>();
  const rows = PACKAGES.map((p) => matrix.embalagens.find((e) => e.embalagem_id === p)!);

  return (
    <div ref={ref}>
      <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div
          key={r.embalagem_id}
        >
          <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: packageColor(r.embalagem_id) }} />
            {packageLabel(r.embalagem_id, lang)}
          </p>
          {[
            { label: t.packaging.volume, value: r.pct_volume, color: "var(--series-rest)" },
            { label: t.packaging.cost, value: r.pct_custo, color: packageColor(r.embalagem_id) },
          ].map((b) => (
            <div key={b.label} className="mt-1 grid grid-cols-[56px_1fr_52px] items-center gap-2 text-xs">
              <span className="text-muted">{b.label}</span>
              <div className="h-2.5 rounded-full bg-surface-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: b.color }}
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${Math.max(b.value, 0.6)}%` : 0 }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.08 }}
                />
              </div>
              <span className="text-right font-semibold text-ink tabular">{f.pp(b.value, 0)}</span>
            </div>
          ))}
        </div>
      ))}
      </div>
    </div>
  );
}

function Heatmap() {
  const { lang, t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const cell = (p: Package, s: Stage) => matrix.celulas.find((c) => c.embalagem_id === p && c.etapa_id === s)!;
  const max = Math.max(...matrix.celulas.map((c) => c.taxa_pct));

  return (
    <div ref={ref} className="overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[420px] border-separate border-spacing-[3px] text-sm" aria-label={t.packaging.heatTitle}>
        <thead>
          <tr>
            <th scope="col" />
            {STAGES.map((s) => (
              <th key={s} scope="col" className="pb-1 text-center text-xs font-medium text-muted">
                {stageLabel(s, lang)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PACKAGES.map((p, i) => (
            <tr key={p}>
              <th scope="row" className="whitespace-nowrap pr-2 text-left text-xs font-medium text-ink-2">
                {packageLabel(p, lang)}
              </th>
              {STAGES.map((s, j) => {
                const c = cell(p, s);
                const color = seqColor(c.taxa_pct, max);
                const key = `${p}-${s}`;
                return (
                  <motion.td
                    key={s}
                    tabIndex={0}
                    onPointerEnter={() => setHover(key)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(key)}
                    onBlur={() => setHover(null)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: inView ? 1 : 0, scale: inView ? 1 : 0.9 }}
                    transition={{ duration: 0.5, delay: 0.05 * (i * 4 + j) }}
                    className={`h-14 rounded-lg text-center align-middle outline-none ring-offset-2 ring-offset-surface transition-shadow ${
                      hover === key ? "ring-2 ring-ink" : ""
                    }`}
                    style={{ background: color.fill }}
                  >
                    <span className="block text-[13px] font-semibold tabular" style={{ color: color.ink }}>
                      {f.pp(c.taxa_pct, 2)}
                    </span>
                    <span className="block text-[10.5px] tabular opacity-80" style={{ color: color.ink }}>
                      {f.brlCompact(c.custo_brl)}
                    </span>
                  </motion.td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <SeqLegend />
    </div>
  );
}

export function PackagingCharts() {
  const { lang, t, f } = useI18n();
  const glass = matrix.embalagens.find((e) => e.embalagem_id === "long_neck")!;

  return (
    <div>
      <ChartFrame
        title={t.packaging.shareTitle}
        subtitle={t.packaging.shareSubtitle}
        note={fill(t.packaging.note, { vol: f.pp(glass.pct_volume, 0), cost: f.pp(glass.pct_custo, 0) })}
        sqlId="q3"
        table={{
          columns: ["", t.packaging.volume, t.packaging.cost],
          rows: PACKAGES.map((p) => {
            const r = matrix.embalagens.find((e) => e.embalagem_id === p)!;
            return [packageLabel(p, lang), f.pp(r.pct_volume), f.pp(r.pct_custo)];
          }),
        }}
      >
        <ShareBars />
      </ChartFrame>
      <Details label={t.packaging.heatTitle}>
      <ChartFrame
        title={t.packaging.heatTitle}
        subtitle={t.packaging.heatSubtitle}
        note={t.packaging.heatComment}
        sqlId="q3"
        table={{
          columns: ["", ...STAGES.map((s) => stageLabel(s, lang))],
          rows: PACKAGES.map((p) => [
            packageLabel(p, lang),
            ...STAGES.map((s) => f.pp(matrix.celulas.find((c) => c.embalagem_id === p && c.etapa_id === s)!.taxa_pct, 3)),
          ]),
        }}
      >
        <Heatmap />
      </ChartFrame>
      </Details>
    </div>
  );
}
