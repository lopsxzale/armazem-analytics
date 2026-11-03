"use client";

import { scaleBand, scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import { useState } from "react";
import { meta, monthly } from "@/lib/data";
import { useWidth } from "@/lib/use-size";
import { ChartFrame, ChartTooltip, TooltipRow } from "../chart-frame";
import { useChartInView } from "../motion";
import { fill } from "@/lib/format";
import { useI18n } from "../providers";

type Slot = { kind: "month"; key: string; i: number } | { kind: "gap"; key: string; months: number };

/** Meses na ordem, com um espaço marcado onde a fonte pula meses (nunca liga meses distantes). */
function slots(): Slot[] {
  const out: Slot[] = [];
  monthly.meses.forEach((m, i) => {
    if (m.meses_desde_anterior && m.meses_desde_anterior > 1) {
      out.push({ kind: "gap", key: `gap-${m.periodo}`, months: m.meses_desde_anterior - 1 });
    }
    out.push({ kind: "month", key: m.periodo, i });
  });
  return out;
}

export function MonthlyChart() {
  const { t, f } = useI18n();
  const [box, width] = useWidth<HTMLDivElement>();
  const [ref, inView] = useChartInView<SVGSVGElement>();
  const [hover, setHover] = useState<number | null>(null);
  const data = monthly.meses;
  const all = slots();
  const height = 300;
  const M = { top: 16, right: 8, bottom: 44, left: 52 };
  const x = scaleBand<string>()
    .domain(all.map((s) => s.key))
    .range([M.left, width - M.right])
    .paddingInner(0.22);
  const y = scaleLinear()
    .domain([0, Math.max(...data.map((d) => d.custo_brl)) * 1.1])
    .nice()
    .range([height - M.bottom, M.top]);
  const ticks = y.ticks(4);
  const avg = data.reduce((s, d) => s + d.custo_brl, 0) / data.length;
  const hovered = hover !== null ? data[hover] : null;
  // Rótulo no eixo x: primeiro mês de cada bloco contínuo.
  const blockStarts = new Set(data.filter((d, i) => i === 0 || (d.meses_desde_anterior ?? 1) > 1).map((d) => d.periodo));

  return (
    <ChartFrame
      title={t.monthly.chartTitle}
      subtitle={t.monthly.chartSubtitle}
      sqlId="q2"
      note={fill(t.monthly.comment, { rate: f.pp(meta.taxa_pct, 2) })}
      table={{
        columns: ["", "R$", t.monthly.rate, t.monthly.moved],
        rows: data.map((d) => [f.month(d.periodo), f.brl0(d.custo_brl), f.pp(d.taxa_pct, 2), f.int(d.caixas_movimentadas)]),
      }}
    >
      <div ref={box} className="relative">
        <svg ref={ref} width={width} height={height} role="img" aria-label={t.monthly.chartTitle} className="block overflow-visible">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
              <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">
                {f.brlCompact(v)}
              </text>
            </g>
          ))}
          <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke="var(--axis)" />
          {all.map((s) => {
            if (s.kind === "gap") {
              const cx = x(s.key)! + x.bandwidth() / 2;
              return (
                <g key={s.key} aria-hidden>
                  <line x1={cx} x2={cx} y1={M.top + 10} y2={y(0)} stroke="var(--axis)" strokeDasharray="2 4" />
                  {/* Só lacunas longas ganham rótulo; as de 1-2 meses ficam só com a linha tracejada. */}
                  {s.months >= 3 && (
                    <text x={cx} y={M.top} textAnchor="middle" className="fill-muted text-[10px]">
                      {s.months >= 6 && width > 640 ? `${s.months}m ${t.monthly.gap}` : `${s.months}m`}
                    </text>
                  )}
                </g>
              );
            }
            const d = data[s.i];
            const bx = x(s.key)!;
            // Em tela estreita, só o início dos blocos após lacunas longas (evita rótulos sobrepostos em 2020).
            const showLabel =
              blockStarts.has(d.periodo) && (width > 640 || s.i === 0 || (d.meses_desde_anterior ?? 0) >= 6);
            return (
              <g
                key={s.key}
                tabIndex={0}
                role="graphics-symbol"
                aria-label={`${f.month(d.periodo)}: ${f.brl0(d.custo_brl)}`}
                className="outline-none"
                onPointerEnter={() => setHover(s.i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(s.i)}
                onBlur={() => setHover(null)}
              >
                <rect x={bx - 2} y={M.top} width={x.bandwidth() + 4} height={y(0) - M.top} fill="transparent" />
                <motion.rect
                  x={bx}
                  width={x.bandwidth()}
                  rx={Math.min(4, x.bandwidth() / 2)}
                  fill="var(--series-1)"
                  opacity={hover === null || hover === s.i ? 1 : 0.45}
                  initial={{ y: y(0), height: 0 }}
                  animate={{ y: inView ? y(d.custo_brl) : y(0), height: inView ? y(0) - y(d.custo_brl) : 0 }}
                  transition={{ duration: 0.8, delay: 0.02 * s.i }}
                />
                {showLabel && (
                  <text x={bx} y={height - M.bottom + 16} className="fill-muted text-[10.5px]">
                    {f.month(d.periodo)}
                  </text>
                )}
              </g>
            );
          })}
          {/* Média do período: referência para ler cada barra contra o "normal". */}
          <g aria-hidden pointerEvents="none">
            <line x1={M.left} x2={width - M.right} y1={y(avg)} y2={y(avg)} stroke="var(--ink)" strokeDasharray="5 4" strokeWidth={1.25} />
            <text
              x={width - M.right}
              y={y(avg) - 7}
              textAnchor="end"
              className="fill-ink text-[11.5px] font-semibold"
              style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 4, strokeLinejoin: "round" }}
            >
              {fill(t.monthly.avgNote, { v: f.brlCompact(avg) })}
            </text>
          </g>
        </svg>
        {hovered && hover !== null && (
          <ChartTooltip x={x(hovered.periodo)! + x.bandwidth() / 2} y={y(hovered.custo_brl)} width={width}>
            <p className="mb-1 font-medium text-ink">{f.month(hovered.periodo, "long")}</p>
            <TooltipRow value={f.brl0(hovered.custo_brl)} label="" color="var(--series-1)" />
            <TooltipRow value={f.pp(hovered.taxa_pct, 2)} label={t.monthly.rate} />
            <TooltipRow value={f.compact(hovered.caixas_movimentadas)} label={t.monthly.moved} />
          </ChartTooltip>
        )}
      </div>
    </ChartFrame>
  );
}
