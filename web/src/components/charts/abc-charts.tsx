"use client";

import { motion } from "motion/react";
import { abc } from "@/lib/data";
import { packageColor, packageLabel, reasonLabel } from "@/lib/labels";
import { ChartFrame } from "../chart-frame";
import { useChartInView } from "../motion";
import { useI18n } from "../providers";

function ClassBars() {
  const { t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLDivElement>();

  return (
    <div ref={ref} className="space-y-6">
      {abc.classes.map((c, i) => (
        <div key={c.classe}>
          <p className="mb-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-ink">{c.classe}</span>
            <span className="text-xs text-muted">
              {f.int(c.itens)} {t.abc.items} · {f.pp(c.taxa_pct, 2)}
            </span>
          </p>
          {[
            { label: t.packaging.volume, value: c.pct_volume, color: "var(--series-rest)" },
            { label: t.packaging.cost, value: c.pct_custo, color: "var(--series-1)" },
          ].map((b) => (
            <div key={b.label} className="mt-1 grid grid-cols-[56px_1fr_52px] items-center gap-2 text-xs">
              <span className="text-muted">{b.label}</span>
              <div className="h-2.5 rounded-full bg-surface-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: b.color }}
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${b.value}%` : 0 }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.1 }}
                />
              </div>
              <span className="text-right font-semibold text-ink tabular">{f.pp(b.value, 0)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TopItems() {
  const { lang, t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLOListElement>();
  const max = abc.top_itens[0].custo_brl;

  return (
    <ol ref={ref} className="divide-y divide-line">
      {abc.top_itens.map((r, i) => (
        <li key={r.item_code} className="grid grid-cols-[20px_1fr_auto] items-center gap-3 py-2.5">
          <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <p className="truncate text-sm text-ink" title={r.descricao}>
              {r.descricao}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="size-2 rounded-[2px]" style={{ background: packageColor(r.embalagem_id) }} />
                {packageLabel(r.embalagem_id, lang)}
              </span>
              <span>· {reasonLabel(r.motivo_id, lang)}</span>
            </p>
            <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full bg-[var(--series-1)]"
                initial={{ width: 0 }}
                animate={{ width: inView ? `${(r.custo_brl / max) * 100}%` : 0 }}
                transition={{ duration: 0.8, delay: 0.05 * i }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-ink tabular">{f.brlCompact(r.custo_brl)}</p>
            <p className="text-xs text-muted tabular">
              {t.abc.rate} {f.pp(r.taxa_pct, 2)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AbcCharts() {
  const { lang, t, f } = useI18n();

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <ChartFrame
        title={t.abc.classesTitle}
        subtitle={t.abc.classesSubtitle}
        sqlId="q5"
        table={{
          columns: ["", t.abc.items, t.packaging.volume, t.packaging.cost, t.abc.rate],
          rows: abc.classes.map((c) => [c.classe, f.int(c.itens), f.pp(c.pct_volume), f.pp(c.pct_custo), f.pp(c.taxa_pct, 3)]),
        }}
      >
        <ClassBars />
      </ChartFrame>
      <ChartFrame
        title={t.abc.topTitle}
        subtitle={t.abc.topSubtitle}
        sqlId="q6"
        table={{
          columns: [t.abc.item, t.abc.package, t.abc.reason, t.abc.cost, t.abc.rate],
          rows: abc.top_itens.map((r) => [
            r.descricao,
            packageLabel(r.embalagem_id, lang),
            reasonLabel(r.motivo_id, lang),
            f.brl0(r.custo_brl),
            f.pp(r.taxa_pct, 2),
          ]),
        }}
      >
        <TopItems />
      </ChartFrame>
    </div>
  );
}
