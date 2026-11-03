"use client";

import { scaleLinear, scalePoint } from "d3-scale";
import { line } from "d3-shape";
import { motion } from "motion/react";
import { useState } from "react";
import { inventory, type AbcClass } from "@/lib/data";
import { fill } from "@/lib/format";
import { packageColor, packageLabel } from "@/lib/labels";
import { useWidth } from "@/lib/use-size";
import { ChartFrame, ChartTooltip, TooltipRow } from "../chart-frame";
import { useChartInView } from "../motion";
import { useI18n } from "../providers";

const CLASSES: AbcClass[] = ["A", "B", "C"];
const abcColor = (c: AbcClass) => `var(--abc-${c})`;
const META = inventory.premissas.ira_meta_pct;

/** IRA por classe (contagem mensal) contra a meta: barras horizontais com a linha da meta. */
export function IraChart() {
  const { t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLDivElement>();
  const lo = 80;
  const pos = (v: number) => `${((v - lo) / (100 - lo)) * 100}%`;

  return (
    <ChartFrame
      title={t.inv.ira.chartTitle}
      subtitle={fill(t.inv.ira.chartSubtitle, { tol: inventory.premissas.tolerancia_pct })}
      sqlId="q9"
      note={t.inv.ira.comment}
      table={{
        columns: ["", t.inv.ira.match, t.inv.ira.counts, t.inv.ira.events],
        rows: inventory.ira.map((r) => [r.classe, f.pp(r.ira_pct, 1), f.int(r.contagens), f.dec(r.eventos_por_contagem, 2)]),
      }}
    >
      <div ref={ref} className="relative space-y-5 pt-6">
        {/* faixa do eixo: 48px do rótulo + 12px de gap à esquerda; 52px do valor + 12px à direita */}
        <div aria-hidden className="pointer-events-none absolute bottom-0 top-0" style={{ left: 60, right: 64 }}>
          <div className="absolute bottom-0 top-0 border-l border-dashed border-ink-2" style={{ left: pos(META) }}>
            <span className="absolute -top-0.5 left-1 text-[11px] text-ink-2">
              {t.inv.ira.meta} {f.pp(META, 0)}
            </span>
          </div>
        </div>
        {inventory.ira.map((r, i) => (
          <div key={r.classe} className="grid grid-cols-[48px_1fr_52px] items-center gap-3">
            <span className="text-lg font-semibold text-ink">{r.classe}</span>
            <div className="h-4 rounded-md bg-surface-2">
              <motion.div
                className="h-full rounded-md"
                style={{ background: abcColor(r.classe) }}
                initial={{ width: 0 }}
                animate={{ width: inView ? pos(r.ira_pct) : 0 }}
                transition={{ duration: 0.9, delay: 0.1 * i }}
              />
            </div>
            <span className={`text-right text-sm font-semibold tabular ${r.ira_pct < META ? "text-[var(--abc-A)]" : "text-ink"}`}>
              {f.pp(r.ira_pct, 1)}
            </span>
          </div>
        ))}
        <p className="pl-[60px] text-[11px] text-muted">
          {f.pp(lo, 0)} → {f.pp(100, 0)}
        </p>
      </div>
    </ChartFrame>
  );
}

export function CausesChart() {
  const { t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLUListElement>();
  const max = Math.max(...inventory.causas.map((c) => c.valor_brl));

  return (
    <ChartFrame
      title={t.inv.causes.chartTitle}
      subtitle={t.inv.causes.chartSubtitle}
      sqlId="q11"
      note={fill(t.inv.causes.comment, { pct: f.pp(inventory.achados.avaria_nao_baixada_pct, 0) })}
      table={{
        columns: ["", "R$", "%", "%"],
        rows: inventory.causas.map((c) => [t.inv.causes.names[c.causa_id], f.brl0(c.valor_brl), f.pp(c.pct), f.pp(c.pct_acum)]),
      }}
    >
      <ul ref={ref} className="space-y-4">
        {inventory.causas.map((c, i) => (
          <li key={c.causa_id}>
            <p className="mb-1 flex justify-between text-sm">
              <span className={i === 0 ? "font-semibold text-ink" : "text-ink-2"}>{t.inv.causes.names[c.causa_id]}</span>
              <span className="tabular text-ink">
                <b>{f.pp(c.pct, 0)}</b> <span className="text-muted">· {f.brlCompact(c.valor_brl)}</span>
              </span>
            </p>
            <div className="h-3 rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full"
                style={{ background: i === 0 ? "var(--series-focus)" : "var(--series-1)" }}
                initial={{ width: 0 }}
                animate={{ width: inView ? `${(c.valor_brl / max) * 100}%` : 0 }}
                transition={{ duration: 0.8, delay: 0.1 * i }}
              />
            </div>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}

/** IRA esperada x intervalo de contagem, uma linha por classe, com a meta e o intervalo recomendado. */
function FrequencyLines() {
  const { t, f } = useI18n();
  const [box, width] = useWidth<HTMLDivElement>();
  const [ref, inView] = useChartInView<SVGSVGElement>();
  const [hover, setHover] = useState<number | null>(null);
  const days = inventory.premissas.intervalos_dias;
  const height = 280;
  const M = { top: 16, right: width < 560 ? 16 : 56, bottom: 36, left: 44 };
  const x = scalePoint<number>().domain(days).range([M.left, width - M.right]).padding(0.1);
  const allIra = inventory.frequencia.flatMap((r) => Object.values(r.ira_por_intervalo));
  const y = scaleLinear()
    .domain([Math.max(0, Math.floor(Math.min(...allIra) / 10) * 10), 100])
    .range([height - M.bottom, M.top]);

  return (
    <div ref={box} className="relative">
      <svg ref={ref} width={width} height={height} role="img" aria-label={t.inv.freq.chartTitle} className="block overflow-visible">
        {y.ticks(5).map((v) => (
          <g key={v}>
            <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">
              {f.pp(v, 0)}
            </text>
          </g>
        ))}
        <line x1={M.left} x2={width - M.right} y1={y(META)} y2={y(META)} stroke="var(--ink-2)" strokeDasharray="4 4" />
        <text x={M.left + 6} y={y(META) + 14} className="fill-ink-2 text-[11px]">
          {t.inv.ira.meta} {f.pp(META, 0)}
        </text>
        {days.map((d) => (
          <g key={d}>
            <rect
              x={x(d)! - x.step() / 2}
              y={M.top}
              width={x.step()}
              height={height - M.top - M.bottom}
              fill={hover === d ? "var(--surface-2)" : "transparent"}
              onPointerEnter={() => setHover(d)}
              onPointerLeave={() => setHover(null)}
            />
            <text x={x(d)} y={height - M.bottom + 18} textAnchor="middle" className="fill-muted text-[11px] tabular">
              {d} {t.inv.freq.days}
            </text>
          </g>
        ))}
        {inventory.frequencia.map((r) => {
          const vals = days.map((d) => r.ira_por_intervalo[String(d)]);
          const pts = vals.map((v, i) => [x(days[i])!, y(v)] as const);
          return (
            <g key={r.classe} pointerEvents="none">
              <motion.path
                d={line()(pts.map(([a, b]) => [a, b])) ?? ""}
                fill="none"
                stroke={abcColor(r.classe)}
                strokeWidth={r.classe === "A" ? 2.5 : 2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: inView ? 1 : 0 }}
                transition={{ duration: 1.1 }}
              />
              <circle
                cx={x(r.intervalo_dias)}
                cy={y(r.ira_recomendada_pct)}
                r={6}
                fill={abcColor(r.classe)}
                stroke="var(--surface)"
                strokeWidth={2}
              />
              {width >= 560 && (
                <text x={width - M.right + 8} y={pts[pts.length - 1][1]} dy="0.32em" className="fill-ink text-[12px] font-semibold">
                  {r.classe}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <ChartTooltip x={x(hover)!} y={height / 2} width={width}>
          <p className="mb-1 font-medium text-ink">{fill(t.inv.freq.every, { d: hover })}</p>
          {inventory.frequencia.map((r) => (
            <TooltipRow key={r.classe} value={f.pp(r.ira_por_intervalo[String(hover)], 1)} label={r.classe} color={abcColor(r.classe)} />
          ))}
        </ChartTooltip>
      )}
    </div>
  );
}

export function FrequencyCharts() {
  const { t, f } = useI18n();
  const a = inventory.achados;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <ChartFrame
        title={t.inv.freq.chartTitle}
        subtitle={t.inv.freq.chartSubtitle}
        sqlId="q12"
        note={fill(t.inv.freq.comment, { a: inventory.achados.intervalo_a, c: inventory.achados.intervalo_c })}
        legend={CLASSES.map((c) => ({ label: c, color: abcColor(c), shape: "line" as const }))}
        table={{
          columns: ["", ...inventory.premissas.intervalos_dias.map((d) => `${d} ${t.inv.freq.days}`)],
          rows: inventory.frequencia.map((r) => [
            r.classe,
            ...inventory.premissas.intervalos_dias.map((d) => f.pp(r.ira_por_intervalo[String(d)], 1)),
          ]),
        }}
      >
        <FrequencyLines />
      </ChartFrame>
      <div className="card flex flex-col p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{t.inv.freq.recommended}</p>
        <ul className="mt-3 divide-y divide-line">
          {inventory.frequencia.map((r) => (
            <li key={r.classe} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 py-3">
              <span className="grid size-8 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: abcColor(r.classe) }}>
                {r.classe}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{fill(t.inv.freq.every, { d: r.intervalo_dias })}</p>
                <p className="text-xs text-muted">
                  {f.int(r.itens_ativos)} × {r.posicoes} {t.inv.freq.positions} · IRA {f.pp(r.ira_mensal_pct, 0)} → {f.pp(r.ira_recomendada_pct, 0)}
                </p>
              </div>
              <p className="text-right text-sm font-semibold text-ink tabular">
                {f.brl0(r.custo_mes_brl)}
                <span className="block text-[11px] font-normal text-muted">{t.inv.freq.perMonth}</span>
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-auto rounded-xl bg-surface-2 p-4 text-sm text-ink-2">
          {fill(t.inv.freq.total, { rec: f.brl0(a.custo_recomendado_mes), all: f.brl0(a.custo_todos_mensal_mes) })}
        </div>
      </div>
    </div>
  );
}

export function InventoryTopItems() {
  const { lang, t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLOListElement>();
  const max = inventory.top_itens[0].valor_brl;

  return (
    <ChartFrame
      title={t.inv.items.chartTitle}
      subtitle={t.inv.items.chartSubtitle}
      sqlId="q10"
      note={t.inv.items.comment}
      legend={[{ label: t.inv.causes.names.avaria_nao_baixada, color: "var(--series-focus)" }]}
      table={{
        columns: ["", "", t.inv.items.cause, t.inv.items.events, "R$"],
        rows: inventory.top_itens.map((r) => [
          r.descricao,
          r.classe,
          t.inv.causes.names[r.causa_principal],
          f.int(r.eventos),
          f.brl0(r.valor_brl),
        ]),
      }}
    >
      <ol ref={ref} className="grid gap-x-8 md:grid-cols-2">
        {inventory.top_itens.map((r, i) => (
          <li key={r.item_code} className="grid grid-cols-[20px_1fr_auto] items-center gap-3 border-b border-line py-2.5">
            <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <p className="truncate text-sm text-ink" title={r.descricao}>
                {r.descricao}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden className="size-2 rounded-[2px]" style={{ background: packageColor(r.embalagem_id) }} />
                {packageLabel(r.embalagem_id, lang)} · {r.classe} · {t.inv.causes.names[r.causa_principal]}
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: r.causa_principal === "avaria_nao_baixada" ? "var(--series-focus)" : "var(--series-1)" }}
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${(r.valor_brl / max) * 100}%` : 0 }}
                  transition={{ duration: 0.8, delay: 0.04 * i }}
                />
              </div>
            </div>
            <p className="text-right text-sm font-semibold text-ink tabular">{f.brlCompact(r.valor_brl)}</p>
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}

export function InventoryMethod() {
  const { t, f } = useI18n();
  const p = inventory.premissas;
  const vars = {
    ca: p.cobertura_dias.A,
    cb: p.cobertura_dias.B,
    cc: p.cobertura_dias.C,
    pa: p.posicoes.A,
    pb: p.posicoes.B,
    pc: p.posicoes.C,
    sep: f.pp(p.taxa_erro_separacao * 100, 2),
    rec: f.pp(p.taxa_erro_recebimento * 100, 2),
    frac: f.pp(p.fracao_avaria_nao_baixada * 100, 0),
    cost: f.brl(p.custo_contagem_posicao_brl),
  };
  return (
    <div className="card p-5 sm:p-6">
      <ul className="divide-y divide-line">
        {t.inv.method.rows.map((o) => (
          <li key={o.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-ink-2">{fill(o.label, vars)}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                o.kind === "real"
                  ? "bg-[var(--series-1)] text-white"
                  : o.kind === "premise"
                    ? "border border-dashed border-ink-2 text-ink-2"
                    : "bg-surface-2 text-ink-2"
              }`}
            >
              {t.method.kinds[o.kind]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
