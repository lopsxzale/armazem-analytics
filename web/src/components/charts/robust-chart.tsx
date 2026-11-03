"use client";

import { scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import { findings, sensitivity as sens, type PremiseKey, type SensKey } from "@/lib/data";
import { useWidth } from "@/lib/use-size";
import { ChartFrame, Details, Legend } from "../chart-frame";
import { useChartInView } from "../motion";
import { useI18n } from "../providers";

const KEYS: SensKey[] = [
  "long_neck_pct_custo",
  "top3_pct",
  "foco_var_ajustada_pct",
  "foco_var_pct",
  "outras_var_ajustada_media_pct",
];
const PREMISES: PremiseKey[] = ["mult_long_neck", "participacao_separacao", "tendencia_separacao"];

/** Valor da v1 de cada achado (o ponto sobre a faixa). */
const v1: Record<SensKey, number> = {
  top3_pct: findings.achados.top3_pct,
  long_neck_pct_custo: findings.achados.long_neck_pct_custo,
  foco_var_pct: findings.achados.separacao_var_pct,
  foco_var_ajustada_pct: findings.achados.separacao_var_ajustada_pct,
  outras_var_ajustada_media_pct: findings.achados.outras_var_ajustada_media_pct,
};
// Participações (% do custo) e variações (% contra J1) vivem em escalas diferentes: um eixo por grupo.
const SHARE: SensKey[] = ["long_neck_pct_custo", "top3_pct"];

function RangeRows({ keys, domain }: { keys: SensKey[]; domain: [number, number] }) {
  const { t, f } = useI18n();
  const [box, width] = useWidth<HTMLDivElement>();
  const [ref, inView] = useChartInView<SVGSVGElement>();
  const narrow = width < 560;
  const ROW = narrow ? 52 : 40;
  const M = { left: narrow ? 0 : 250, right: 16, top: 22 };
  const height = M.top + keys.length * ROW;
  const x = scaleLinear().domain(domain).nice().range([M.left, width - M.right]);
  const isChange = !SHARE.includes(keys[0]);
  const fmt = (v: number) => (isChange ? f.spp(v, 0) : f.pp(v, 0));

  return (
    <div ref={box}>
      <svg ref={ref} width={width} height={height} role="img" aria-label={t.robust.chartTitle} className="block overflow-visible">
        {x.ticks(5).map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={M.top - 4} y2={height} stroke={v === 0 && isChange ? "var(--axis)" : "var(--grid)"} />
            <text x={x(v)} y={M.top - 10} textAnchor="middle" className="fill-muted text-[10.5px] tabular">
              {fmt(v)}
            </text>
          </g>
        ))}
        {keys.map((k, i) => {
          const r = sens.faixas[k];
          const n = sens.nulo[k];
          const cy = M.top + i * ROW + (narrow ? 34 : ROW / 2);
          return (
            <g key={k} role="graphics-symbol" aria-label={`${t.robust.keys[k]}: ${fmt(r.p5)} – ${fmt(r.p95)}`}>
              <text
                x={narrow ? 0 : M.left - 12}
                y={narrow ? cy - 18 : cy}
                dy="0.32em"
                textAnchor={narrow ? "start" : "end"}
                className="fill-ink text-[12.5px]"
              >
                {t.robust.keys[k]}
              </text>
              {/* faixa do cenário sem alta plantada: tracejada, por baixo */}
              <rect
                x={x(n.p5)}
                y={cy - 9}
                width={Math.max(x(n.p95) - x(n.p5), 2)}
                height={18}
                rx={4}
                fill="none"
                stroke="var(--ink-2)"
                strokeDasharray="3 3"
              />
              <motion.rect
                y={cy - 5}
                height={10}
                rx={4}
                fill="var(--series-1)"
                initial={{ x: x(r.p50), width: 0 }}
                animate={{ x: inView ? x(r.p5) : x(r.p50), width: inView ? Math.max(x(r.p95) - x(r.p5), 2) : 0 }}
                transition={{ duration: 0.8, delay: 0.1 * i }}
              />
              <circle cx={x(v1[k])} cy={cy} r={5} fill="var(--series-focus)" stroke="var(--surface)" strokeWidth={2} />
              <text x={Math.min(Math.max(x(r.p95), x(n.p95)) + 8, width - 40)} y={cy} dy="0.32em" className="fill-ink-2 text-[11px] tabular">
                {!narrow && `${fmt(r.p5)} a ${fmt(r.p95)}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Dependence() {
  const { t, f } = useI18n();
  return (
    <div className="overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[460px] text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" />
            {PREMISES.map((p) => (
              <th key={p} scope="col" className="px-2 pb-2 text-center font-medium">
                {t.robust.premises[p]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {KEYS.map((k) => (
            <tr key={k} className="border-t border-line">
              <th scope="row" className="py-2 pr-3 text-left text-xs font-medium text-ink-2">
                {t.robust.keys[k]}
              </th>
              {PREMISES.map((p) => {
                const v = sens.dependencia[k][p];
                const strong = Math.abs(v) >= 0.5;
                return (
                  <td key={p} className="px-2 py-2 text-center">
                    <span
                      className={`inline-block min-w-14 rounded-md px-2 py-1 text-xs tabular ${
                        strong ? "bg-[var(--series-1)] font-semibold text-white" : "text-ink-2"
                      }`}
                    >
                      {f.signed(v, 2)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RobustCharts() {
  const { t, f } = useI18n();
  const all = (keys: SensKey[]) => keys.flatMap((k) => [sens.faixas[k].p5, sens.faixas[k].p95, sens.nulo[k].p5, sens.nulo[k].p95, v1[k]]);
  const changes = KEYS.filter((k) => !SHARE.includes(k));
  const shareVals = all(SHARE);
  const changeVals = all(changes);

  return (
    <div>
      <ChartFrame
        title={t.robust.chartTitle}
        subtitle={t.robust.chartSubtitle}
        note={t.robust.comment}
        table={{
          columns: ["", t.robust.ranges, t.robust.nullScenario, t.robust.v1],
          rows: KEYS.map((k) => [
            t.robust.keys[k],
            `${f.dec(sens.faixas[k].p5, 1)} a ${f.dec(sens.faixas[k].p95, 1)}`,
            `${f.dec(sens.nulo[k].p5, 1)} a ${f.dec(sens.nulo[k].p95, 1)}`,
            f.dec(v1[k], 1),
          ]),
        }}
      >
        <div className="mb-4">
          <Legend
            items={[
              { label: t.robust.ranges, color: "var(--series-1)" },
              { label: t.robust.nullScenario, color: "var(--ink-2)", shape: "line" },
              { label: t.robust.v1, color: "var(--series-focus)", shape: "dot" },
            ]}
          />
        </div>
        <RangeRows keys={SHARE} domain={[Math.min(...shareVals) - 5, Math.max(...shareVals) + 5]} />
        <div className="h-6" />
        <RangeRows keys={changes} domain={[Math.min(...changeVals) - 5, Math.max(...changeVals) + 5]} />
      </ChartFrame>
      <Details label={t.robust.dependsTitle}>
        <ChartFrame title={t.robust.dependsTitle} subtitle={t.robust.dependsSubtitle} note={t.robust.dependsComment}>
          <Dependence />
        </ChartFrame>
      </Details>
    </div>
  );
}
