"use client";

import { scaleBand, scaleLinear } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { BOTTLE_REASONS, BOTTLE_STAGES, BOTTLES, bottles, type BottleStage } from "@/lib/data";
import { fill } from "@/lib/format";
import { bottleColor, bottleLabel, bottleReasonLabel, bottleShort, bottleStageLabel, seqColor } from "@/lib/labels";
import { useWidth } from "@/lib/use-size";
import { ChartFrame, ChartTooltip, Details, SeqLegend, TooltipRow } from "../chart-frame";
import { useChartInView } from "../motion";
import { useI18n } from "../providers";
import { Annotation } from "./annotation";

const a = bottles.achados;
const tipo = (b: (typeof BOTTLES)[number]) => bottles.tipos.find((r) => r.tipo_id === b)!;

/** Gráfico principal: taxa de refugo de cada tipo, com a média geral como referência. */
function RateBars() {
  const { lang, t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...bottles.tipos.map((r) => r.taxa_pct)) * 1.12;
  const avgPos = (a.taxa_pct / max) * 100;
  const dim = (b: string) => hover !== null && hover !== b;

  return (
    <div ref={ref}>
      <div className="relative space-y-4">
        {BOTTLES.map((b, i) => {
          const r = tipo(b);
          return (
            <div
              key={b}
              tabIndex={0}
              aria-label={`${bottleLabel(b, lang)}: ${f.pp(r.taxa_pct, 2)}`}
              onPointerEnter={() => setHover(b)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(b)}
              onBlur={() => setHover(null)}
              className="rounded-xl outline-none transition-opacity duration-300 focus-visible:ring-2 focus-visible:ring-accent"
              style={{ opacity: dim(b) ? 0.28 : 1 }}
            >
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: bottleColor(b) }} />
                  {bottleLabel(b, lang)}
                </p>
                <p className="text-xs text-muted tabular">
                  {fill(t.bottles.rowDetail, { bottles: f.pp(r.pct_cascos, 0), cost: f.pp(r.pct_custo, 0) })}
                </p>
              </div>
              <div className="grid grid-cols-[1fr_56px] items-center gap-3">
                <div className="relative h-5 rounded-md bg-surface-2">
                  <motion.div
                    className="h-full rounded-md"
                    style={{ background: bottleColor(b) }}
                    initial={{ width: 0 }}
                    animate={{ width: inView ? `${(r.taxa_pct / max) * 100}%` : 0 }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.1 }}
                  />
                  {/* Média geral: marca tracejada no mesmo ponto de todas as barras. */}
                  <span
                    aria-hidden
                    className="absolute -inset-y-1 border-l-2 border-dashed border-ink"
                    style={{ left: `${avgPos}%` }}
                  />
                </div>
                <span className="text-right text-base font-semibold text-ink tabular">{f.pp(r.taxa_pct, 1)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="relative mr-[68px] mt-2 h-4">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-ink-2"
          style={{ left: `${avgPos}%` }}
        >
          {fill(t.bottles.avg, { v: f.pp(a.taxa_pct, 1) })}
        </span>
      </div>
    </div>
  );
}

const PATH_STEP = 0.6; // segundos entre uma parada do casco e a próxima

/** Casco âmbar em miniatura (o "marcador" que anda pelas etapas). */
function BottleIcon() {
  return (
    <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
      <path d="M4.5 1h3v4.2c0 .8 2.5 2 2.5 4.6V18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9.8c0-2.6 2.5-3.8 2.5-4.6z" fill="var(--bt-600A)" stroke="var(--ink)" strokeWidth="0.8" />
    </svg>
  );
}

/** O caminho do casco: as 4 etapas em ordem, separando o que chega do cliente do que quebra aqui dentro. */
function BottlePath() {
  const { lang, t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLDivElement>();
  const reduce = useReducedMotion();
  const max = Math.max(...bottles.etapas.map((e) => e.pct));
  const outside: BottleStage[] = ["retorno_rota", "triagem"];

  return (
    <div ref={ref} className="space-y-4">
      {[
        { key: "outside", stages: outside, pct: a.de_fora_pct, label: t.bottles.outside, hint: t.bottles.outsideHint },
        {
          key: "inside",
          stages: BOTTLE_STAGES.filter((s) => !outside.includes(s)),
          pct: a.interno_pct,
          label: t.bottles.inside,
          hint: t.bottles.insideHint,
        },
      ].map((g, gi) => (
        <motion.div
          key={g.key}
          className={`rounded-2xl border p-4 ${gi === 1 ? "border-accent/40 bg-accent/[0.06]" : "border-line bg-surface-2/50"}`}
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{g.label}</p>
            <p className="text-2xl font-semibold tracking-tight text-ink tabular">{f.pp(g.pct, 0)}</p>
          </div>
          <ol className="space-y-2.5">
            {g.stages.map((s) => {
              const e = bottles.etapas.find((r) => r.etapa_id === s)!;
              const n = BOTTLE_STAGES.indexOf(s) + 1;
              // O casco chega nesta etapa em `arrive`, fica um instante e segue (na última, ele fica).
              const arrive = reduce ? 0 : 0.3 + (n - 1) * PATH_STEP;
              const lastStop = n === BOTTLE_STAGES.length;
              return (
                <li key={s} className="grid grid-cols-[22px_minmax(0,1fr)_48px] items-center gap-2.5 text-xs">
                  <span className="relative grid size-[22px] place-items-center">
                    <motion.span
                      className="absolute inset-0 rounded-full ring-1 ring-line"
                      initial={{ backgroundColor: "var(--surface)" }}
                      animate={inView ? { backgroundColor: "var(--brand)" } : {}}
                      transition={{ duration: 0.3, delay: arrive }}
                    />
                    <motion.span
                      className="relative font-mono text-[10.5px] font-semibold"
                      initial={{ color: "var(--ink)" }}
                      animate={inView ? { color: "var(--brand-ink)" } : {}}
                      transition={{ duration: 0.3, delay: arrive }}
                    >
                      {n}
                    </motion.span>
                    <motion.span
                      className="absolute -left-4 top-0.5"
                      initial={{ opacity: 0, y: -6 }}
                      animate={
                        inView && !reduce
                          ? { opacity: lastStop ? [0, 1, 1] : [0, 1, 1, 0], y: lastStop ? [-6, 0, 0] : [-6, 0, 0, 6] }
                          : {}
                      }
                      transition={{ duration: lastStop ? 0.4 : PATH_STEP, delay: arrive, times: lastStop ? [0, 0.5, 1] : [0, 0.25, 0.75, 1] }}
                    >
                      <BottleIcon />
                    </motion.span>
                  </span>
                  <div className="min-w-0">
                    <p className="mb-1 flex flex-wrap justify-between gap-x-2 text-ink-2">
                      <span className="font-medium text-ink">{bottleStageLabel(s, lang)}</span>
                      <span className="text-muted">{t.bottles.stageNotes[s]}</span>
                    </p>
                    <div className="h-2 rounded-full bg-surface">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: gi === 1 ? "var(--series-focus)" : "var(--series-rest)" }}
                        initial={{ width: 0 }}
                        animate={{ width: inView ? `${(e.pct / max) * 100}%` : 0 }}
                        transition={{ duration: 0.6, delay: arrive + 0.1 }}
                      />
                    </div>
                  </div>
                  <motion.span
                    className="text-right font-semibold text-ink tabular"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: inView ? 1 : 0 }}
                    transition={{ duration: 0.3, delay: arrive + 0.2 }}
                  >
                    {f.pp(e.pct, 0)}
                  </motion.span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs leading-snug text-muted">{g.hint}</p>
        </motion.div>
      ))}
    </div>
  );
}

/** Tipo × motivo: taxa de refugo em cada célula (sequencial de um matiz). */
function ReasonHeatmap() {
  const { lang, t, f } = useI18n();
  const [ref, inView] = useChartInView<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const cell = (b: string, m: string) => bottles.celulas.find((c) => c.tipo_id === b && c.motivo_id === m);
  const max = Math.max(...bottles.celulas.map((c) => c.taxa_pct));

  return (
    <div ref={ref} className="overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[520px] border-separate border-spacing-[3px] text-sm" aria-label={t.bottles.heatTitle}>
        <thead>
          <tr>
            <th scope="col" />
            {BOTTLE_REASONS.map((m) => (
              <th key={m} scope="col" className="pb-1 text-center text-xs font-medium text-muted">
                {bottleReasonLabel(m, lang)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BOTTLES.map((b, bi) => (
            <tr key={b}>
              <th scope="row" className="whitespace-nowrap pr-2 text-left text-xs font-medium text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-[2px]" style={{ background: bottleColor(b) }} />
                  {bottleShort(b)}
                </span>
              </th>
              {BOTTLE_REASONS.map((m, mi) => {
                const c = cell(b, m);
                const v = c?.taxa_pct ?? 0;
                const color = seqColor(v, max);
                const key = `${b}-${m}`;
                return (
                  <motion.td
                    key={m}
                    tabIndex={0}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: inView ? 1 : 0, scale: inView ? 1 : 0.9 }}
                    transition={{ duration: 0.45, delay: 0.04 * (bi * BOTTLE_REASONS.length + mi) }}
                    onPointerEnter={() => setHover(key)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(key)}
                    onBlur={() => setHover(null)}
                    className={`h-12 rounded-lg text-center align-middle outline-none ring-offset-2 ring-offset-surface transition-shadow ${
                      hover === key ? "ring-2 ring-ink" : ""
                    }`}
                    style={{ background: color.fill }}
                  >
                    <span className="block text-[13px] font-semibold tabular" style={{ color: color.ink }}>
                      {f.pp(v, 2)}
                    </span>
                    <span className="block text-[10.5px] tabular opacity-80" style={{ color: color.ink }}>
                      {f.int(c?.cascos_refugados ?? 0)}
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

/** Cascos refugados por mês (série única), com o pico anotado. */
function MonthlyBars() {
  const { t, f } = useI18n();
  const [box, width] = useWidth<HTMLDivElement>();
  const [ref, inView] = useChartInView<SVGSVGElement>();
  const [hover, setHover] = useState<number | null>(null);
  const data = bottles.mensal;
  const height = 240;
  const M = { top: 40, right: 8, bottom: 28, left: 44 };
  const x = scaleBand<string>()
    .domain(data.map((d) => d.periodo))
    .range([M.left, width - M.right])
    .paddingInner(0.25);
  const y = scaleLinear()
    .domain([0, Math.max(...data.map((d) => d.cascos_refugados)) * 1.1])
    .nice()
    .range([height - M.bottom, M.top]);
  const peak = data.findIndex((d) => d.periodo === a.pico_periodo);
  const hovered = hover !== null ? data[hover] : null;
  const px = x(data[peak].periodo)! + x.bandwidth() / 2;

  return (
    <div ref={box} className="relative">
      <svg ref={ref} width={width} height={height} role="img" aria-label={t.bottles.monthTitle} className="block overflow-visible">
        {y.ticks(4).map((v) => (
          <g key={v}>
            <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">
              {f.compact(v)}
            </text>
          </g>
        ))}
        <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke="var(--axis)" />
        {data.map((d, i) => (
          <g
            key={d.periodo}
            tabIndex={0}
            role="graphics-symbol"
            aria-label={`${f.month(d.periodo)}: ${f.int(d.cascos_refugados)}`}
            className="outline-none"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <rect x={x(d.periodo)! - 2} y={M.top} width={x.bandwidth() + 4} height={y(0) - M.top} fill="transparent" />
            <motion.rect
              x={x(d.periodo)}
              width={x.bandwidth()}
              rx={Math.min(4, x.bandwidth() / 2)}
              fill="var(--series-1)"
              opacity={hover === null || hover === i ? 1 : 0.45}
              initial={{ y: y(0), height: 0 }}
              animate={{ y: inView ? y(d.cascos_refugados) : y(0), height: inView ? y(0) - y(d.cascos_refugados) : 0 }}
              transition={{ duration: 0.8, delay: 0.03 * i }}
            />
            {(width > 520 || i % 2 === 0) && (
              <text x={x(d.periodo)! + x.bandwidth() / 2} y={height - M.bottom + 16} textAnchor="middle" className="fill-muted text-[10.5px]">
                {f.month(d.periodo)}
              </text>
            )}
          </g>
        ))}
        <Annotation
          x={px}
          y={y(data[peak].cascos_refugados)}
          side={px > width * 0.6 ? "left" : "right"}
          dx={18}
          dy={-14}
          lines={[fill(t.bottles.peakNote, { n: f.int(a.pico_refugados) }), t.bottles.peakNote2]}
          show={inView}
        />
      </svg>
      {hovered && hover !== null && (
        <ChartTooltip x={x(hovered.periodo)! + x.bandwidth() / 2} y={y(hovered.cascos_refugados)} width={width}>
          <p className="mb-1 font-medium text-ink">{f.month(hovered.periodo, "long")}</p>
          <TooltipRow value={f.int(hovered.cascos_refugados)} label={t.bottles.refused} color="var(--series-1)" />
          <TooltipRow value={f.pp(hovered.taxa_pct, 2)} label={t.bottles.rate} />
          <TooltipRow value={f.brl0(hovered.custo_brl)} label="" />
        </ChartTooltip>
      )}
    </div>
  );
}

export function BottleCharts() {
  const { lang, t, f } = useI18n();

  return (
    <div>
      <p className="mb-4 inline-flex rounded-lg border border-dashed border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-muted">
        {t.bottles.badge}
      </p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <ChartFrame
            title={t.bottles.rateTitle}
            subtitle={t.bottles.rateSubtitle}
            note={fill(t.bottles.worstNote, {
              worst: bottleShort(a.pior_tipo),
              rate: f.pp(a.pior_taxa_pct, 1),
              bottles: f.pp(a.pior_pct_cascos, 0),
              cost: f.pp(a.pior_pct_custo, 0),
              ratio: `${f.dec(a.pior_vs_melhor, 1)}×`,
              best: bottleShort(a.melhor_tipo),
            })}
            sqlId="q13"
            className="h-full"
            table={{
              columns: ["", t.bottles.rate, t.bottles.refused, t.bottles.ofBottles, t.bottles.ofCost, t.bottles.price],
              rows: BOTTLES.map((b) => {
                const r = tipo(b);
                return [bottleLabel(b, lang), f.pp(r.taxa_pct, 2), f.int(r.cascos_refugados), f.pp(r.pct_cascos), f.pp(r.pct_custo), f.brl(r.preco_casco_brl)];
              }),
            }}
          >
            <RateBars />
          </ChartFrame>
        </div>
        <div className="min-w-0">
          <ChartFrame
            title={t.bottles.pathTitle}
            subtitle={t.bottles.pathSubtitle}
            note={fill(t.bottles.pathComment, { outside: f.pp(a.de_fora_pct, 0), inside: f.pp(a.interno_pct, 0) })}
            sqlId="q14"
            className="h-full"
            table={{
              columns: ["", t.bottles.refused, "%", t.bottles.cost],
              rows: bottles.etapas.map((e) => [bottleStageLabel(e.etapa_id, lang), f.int(e.cascos_refugados), f.pp(e.pct), f.brl0(e.custo_brl)]),
            }}
          >
            <BottlePath />
          </ChartFrame>
        </div>
      </div>
      <Details>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartFrame
            title={t.bottles.heatTitle}
            subtitle={t.bottles.heatSubtitle}
            note={t.bottles.heatComment}
            sqlId="q13"
            table={{
              columns: ["", ...BOTTLE_REASONS.map((m) => bottleReasonLabel(m, lang))],
              rows: BOTTLES.map((b) => [
                bottleShort(b),
                ...BOTTLE_REASONS.map((m) => f.pp(bottles.celulas.find((c) => c.tipo_id === b && c.motivo_id === m)?.taxa_pct ?? 0, 3)),
              ]),
            }}
          >
            <ReasonHeatmap />
          </ChartFrame>
          <ChartFrame
            title={t.bottles.monthTitle}
            subtitle={t.bottles.monthSubtitle}
            note={fill(t.bottles.monthComment, { rate: f.pp(a.taxa_pct, 1) })}
            table={{
              columns: ["", t.bottles.refused, t.bottles.rate, t.bottles.cost],
              rows: bottles.mensal.map((d) => [f.month(d.periodo), f.int(d.cascos_refugados), f.pp(d.taxa_pct, 2), f.brl0(d.custo_brl)]),
            }}
          >
            <MonthlyBars />
          </ChartFrame>
        </div>
      </Details>
    </div>
  );
}
