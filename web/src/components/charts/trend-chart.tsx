"use client";

import { scaleLinear, scalePoint } from "d3-scale";
import { line } from "d3-shape";
import { motion } from "motion/react";
import { useState } from "react";
import { STAGES, trend, type Stage } from "@/lib/data";
import { stageLabel } from "@/lib/labels";
import { useWidth } from "@/lib/use-size";
import { ChartFrame, ChartTooltip, Segmented, TooltipRow } from "../chart-frame";
import { useChartInView } from "../motion";
import { useI18n } from "../providers";

const FOCUS: Stage = "separacao";
type Mode = "adjusted" | "raw";
const FIELD = { raw: "var_vs_inicio_pct", adjusted: "var_ajustada_vs_inicio_pct" } as const;
const RATE = { raw: "taxa_pct", adjusted: "taxa_ajustada_pct" } as const;
const color = (s: Stage) => (s === FOCUS ? "var(--series-focus)" : "var(--series-rest)");

export function TrendChart() {
  const { lang, t, f } = useI18n();
  const [box, width] = useWidth<HTMLDivElement>();
  const [ref, inView] = useChartInView<SVGSVGElement>();
  const [hover, setHover] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("adjusted");
  const val = (d: (typeof trend.series)[number]) => d[FIELD[mode]];
  const windows = trend.janelas.map((j) => j.id);
  const narrow = width < 560;
  const height = 320;
  const M = { top: 20, right: narrow ? 16 : 120, bottom: 40, left: 48 };
  // Eixo fixo para os dois modos: a troca bruta/ajustada mostra as linhas se movendo, não a escala.
  const values = trend.series.flatMap((s) => [s.var_vs_inicio_pct, s.var_ajustada_vs_inicio_pct]);
  const x = scalePoint<string>().domain(windows).range([M.left, width - M.right]).padding(0.2);
  const y = scaleLinear()
    .domain([Math.min(-20, ...values), Math.max(...values) + 5])
    .nice()
    .range([height - M.bottom, M.top]);
  const series = (s: Stage) => windows.map((w) => trend.series.find((r) => r.etapa_id === s && r.janela === w)!);
  const path = line<(typeof trend.series)[number]>()
    .x((d) => x(d.janela)!)
    .y((d) => y(val(d)));
  const winLabel = (id: string) => t.trend.windows[id] ?? id;
  // A separação desenha por último, por cima das outras.
  const order = [...STAGES.filter((s) => s !== FOCUS), FOCUS];
  // Rótulos no fim das linhas: empurra para baixo os que ficariam a menos de 15px do anterior.
  const labelY: Partial<Record<Stage, number>> = {};
  [...STAGES]
    .map((s) => ({ s, y: y(val(series(s)[windows.length - 1])) }))
    .sort((a, b) => a.y - b.y)
    .forEach((l, i, arr) => {
      const prev = i > 0 ? labelY[arr[i - 1].s]! : -Infinity;
      labelY[l.s] = Math.max(l.y, prev + 15);
    });

  return (
    <ChartFrame
      title={t.trend.chartTitle}
      subtitle={t.trend.chartSubtitle}
      sqlId="q4"
      controls={
        <Segmented
          label={t.trend.chartTitle}
          value={mode}
          onChange={setMode}
          options={[
            { value: "adjusted", label: t.trend.adjusted },
            { value: "raw", label: t.trend.raw },
          ]}
        />
      }
      legend={[
        { label: stageLabel(FOCUS, lang), color: color(FOCUS), shape: "line" },
        { label: STAGES.filter((s) => s !== FOCUS).map((s) => stageLabel(s, lang)).join(" · "), color: "var(--series-rest)", shape: "line" },
      ]}
      table={{
        columns: ["", ...windows.map(winLabel)],
        rows: STAGES.map((s) => [stageLabel(s, lang), ...series(s).map((d) => `${f.pp(d[RATE[mode]], 3)} (${f.spp(val(d), 0)})`)]),
      }}
    >
      <div ref={box} className="relative">
        <svg ref={ref} width={width} height={height} role="img" aria-label={t.trend.chartTitle} className="block overflow-visible">
          {y.ticks(5).map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--axis)" : "var(--grid)"} />
              <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">
                {f.spp(v, 0)}
              </text>
            </g>
          ))}
          {windows.map((w) => (
            <g key={w}>
              <rect
                x={x(w)! - x.step() / 2}
                y={M.top}
                width={x.step()}
                height={height - M.bottom - M.top}
                fill={hover === w ? "var(--surface-2)" : "transparent"}
                onPointerEnter={() => setHover(w)}
                onPointerLeave={() => setHover(null)}
              />
              <text x={x(w)} y={height - M.bottom + 18} textAnchor="middle" className="fill-muted text-[10.5px]">
                {narrow ? `${winLabel(w).split(" ")[0]}` : winLabel(w)}
              </text>
            </g>
          ))}
          {order.map((s) => {
            const d = series(s);
            const last = d[d.length - 1];
            return (
              <g key={s} pointerEvents="none">
                <motion.path
                  d={path(d) ?? ""}
                  fill="none"
                  stroke={color(s)}
                  strokeWidth={s === FOCUS ? 2.5 : 2}
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: inView ? 1 : 0, d: path(d) ?? "" }}
                  transition={{ duration: 1.2, delay: s === FOCUS ? 0.4 : 0 }}
                />
                {d.map((p) => (
                  <motion.circle key={p.janela} cx={x(p.janela)} animate={{ cy: y(val(p)) }} initial={false} r={4} fill={color(s)} stroke="var(--surface)" strokeWidth={2} />
                ))}
                {!narrow && (
                  <text
                    x={x(last.janela)! + 10}
                    y={labelY[s]}
                    dy="0.32em"
                    className={`text-[12px] tabular ${s === FOCUS ? "fill-ink font-semibold" : "fill-ink-2"}`}
                  >
                    {stageLabel(s, lang)} {f.spp(val(last), 0)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <ChartTooltip x={x(hover)!} y={height / 2} width={width}>
            <p className="mb-1 font-medium text-ink">{winLabel(hover)}</p>
            {[FOCUS, ...STAGES.filter((s) => s !== FOCUS)].map((s) => {
              const d = trend.series.find((r) => r.etapa_id === s && r.janela === hover)!;
              return (
                <TooltipRow
                  key={s}
                  value={f.spp(val(d), 1)}
                  label={`${stageLabel(s, lang)} · ${f.pp(d[RATE[mode]], 2)}`}
                  color={color(s)}
                />
              );
            })}
          </ChartTooltip>
        )}
      </div>
    </ChartFrame>
  );
}
