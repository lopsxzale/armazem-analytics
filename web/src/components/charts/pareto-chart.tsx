"use client";

import { scaleBand, scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import { useState } from "react";
import { pareto } from "@/lib/data";
import { comboLabel, reasonLabel, stageLabel } from "@/lib/labels";
import { useWidth } from "@/lib/use-size";
import { ChartFrame, ChartTooltip, Segmented, TooltipRow } from "../chart-frame";
import { useChartInView } from "../motion";
import { useI18n } from "../providers";

type View = "combo" | "reason" | "stage";
type Row = { key: string; label: string; cost: number; pct: number; cum: number; boxes?: number };

function useRows(view: View): Row[] {
  const { lang } = useI18n();
  if (view === "reason")
    return pareto.motivos.map((r) => ({
      key: r.motivo_id,
      label: reasonLabel(r.motivo_id, lang),
      cost: r.custo_brl,
      pct: r.pct,
      cum: r.pct_acum,
    }));
  if (view === "stage")
    return pareto.etapas.map((r) => ({
      key: r.etapa_id,
      label: stageLabel(r.etapa_id, lang),
      cost: r.custo_brl,
      pct: r.pct,
      cum: r.pct_acum,
    }));
  return pareto.combos.map((r) => ({
    key: `${r.motivo_id}-${r.etapa_id}`,
    label: comboLabel(r.motivo_id, r.etapa_id, lang),
    cost: r.custo_brl,
    pct: r.pct,
    cum: r.pct_acum,
    boxes: r.caixas,
  }));
}

function ParetoBars({ rows }: { rows: Row[] }) {
  const { t, f } = useI18n();
  const [box, width] = useWidth<HTMLDivElement>();
  const [ref, inView] = useChartInView<SVGSVGElement>();
  const [hover, setHover] = useState<string | null>(null);
  const narrow = width < 560;
  const ROW = narrow ? 46 : 32;
  const M = { left: narrow ? 0 : 230, right: 112 };
  const height = rows.length * ROW + 8;
  // Itens até cruzar 80%: a última barra que ainda é necessária para chegar ao corte.
  const cut = rows.findIndex((r) => r.cum >= 80);
  const x = scaleLinear()
    .domain([0, Math.max(...rows.map((r) => r.cost))])
    .range([M.left, width - M.right]);
  const y = scaleBand<string>()
    .domain(rows.map((r) => r.key))
    .range([0, rows.length * ROW])
    .paddingInner(narrow ? 0.55 : 0.3);
  const barY = (key: string) => y(key)! + (narrow ? 17 : 0);
  const hovered = rows.find((r) => r.key === hover);

  return (
    <div ref={box} className="relative">
      <svg ref={ref} width={width} height={height} role="img" aria-label={t.pareto.chartTitle} className="block overflow-visible">
        {rows.map((r, i) => {
          const inCore = i <= cut;
          const by = barY(r.key);
          return (
            <g
              key={r.key}
              tabIndex={0}
              role="graphics-symbol"
              aria-label={`${r.label}: ${f.brlCompact(r.cost)}, ${f.pp(r.pct)}, ${t.pareto.cumulative} ${f.pp(r.cum)}`}
              className="outline-none"
              onPointerEnter={() => setHover(r.key)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(r.key)}
              onBlur={() => setHover(null)}
            >
              <rect x={0} y={y(r.key)! - 4} width={width} height={ROW - 2} rx={8} fill={hover === r.key ? "var(--surface-2)" : "transparent"} />
              <text
                x={narrow ? 0 : M.left - 12}
                y={narrow ? y(r.key)! + 4 : by + y.bandwidth() / 2}
                dy="0.32em"
                textAnchor={narrow ? "start" : "end"}
                className={`text-[12.5px] ${inCore ? "fill-ink" : "fill-muted"}`}
              >
                {r.label}
              </text>
              <motion.rect
                x={M.left}
                y={by}
                height={narrow ? 10 : y.bandwidth()}
                rx={4}
                fill={inCore ? "var(--series-1)" : "var(--series-rest)"}
                initial={{ width: 0 }}
                animate={{ width: inView ? Math.max(x(r.cost) - M.left, 2) : 0 }}
                transition={{ duration: 0.8, delay: 0.05 + i * 0.04 }}
              />
              <motion.text
                x={x(r.cost) + 8}
                y={by + (narrow ? 5 : y.bandwidth() / 2)}
                dy="0.32em"
                className="text-[12px] tabular"
                initial={{ opacity: 0 }}
                animate={{ opacity: inView ? 1 : 0 }}
                transition={{ delay: 0.6 + i * 0.03 }}
              >
                <tspan className="fill-ink font-semibold">{f.pp(r.pct)}</tspan>
                <tspan className="fill-muted"> · {f.pp(r.cum, 0)}</tspan>
              </motion.text>
            </g>
          );
        })}
        {cut >= 0 && cut < rows.length - 1 && (
          <g aria-hidden>
            <line
              x1={0}
              x2={width}
              y1={y(rows[cut].key)! + ROW - 3}
              y2={y(rows[cut].key)! + ROW - 3}
              stroke="var(--ink-2)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text x={width} y={y(rows[cut].key)! + ROW - 8} textAnchor="end" className="fill-ink-2 text-[11px] font-medium">
              80%
            </text>
          </g>
        )}
      </svg>
      {hovered && (
        <ChartTooltip x={x(hovered.cost)} y={barY(hovered.key) + 6} width={width}>
          <p className="mb-1 font-medium text-ink">{hovered.label}</p>
          <TooltipRow value={f.brl0(hovered.cost)} label="" color="var(--series-1)" />
          <TooltipRow value={f.pp(hovered.pct)} label="" />
          <TooltipRow value={f.pp(hovered.cum)} label={t.pareto.cumulative} />
        </ChartTooltip>
      )}
    </div>
  );
}

export function ParetoChart() {
  const { t, f } = useI18n();
  const [view, setView] = useState<View>("combo");
  const rows = useRows(view);

  return (
    <ChartFrame
      title={t.pareto.chartTitle}
      subtitle={t.pareto.chartSubtitle}
      sqlId="q1"
      controls={
        <Segmented
          label={t.pareto.chartTitle}
          value={view}
          onChange={setView}
          options={[
            { value: "combo", label: t.pareto.byCombo },
            { value: "reason", label: t.pareto.byReason },
            { value: "stage", label: t.pareto.byStage },
          ]}
        />
      }
      table={{
        columns: ["", "R$", "%", t.pareto.cumulative],
        rows: rows.map((r) => [r.label, f.brl0(r.cost), f.pp(r.pct), f.pp(r.cum)]),
      }}
    >
      <ParetoBars key={view} rows={rows} />
    </ChartFrame>
  );
}
