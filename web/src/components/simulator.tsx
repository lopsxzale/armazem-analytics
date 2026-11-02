"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { PACKAGES, simulator, STAGES, type Package, type Stage } from "@/lib/data";
import { fill } from "@/lib/format";
import { packageColor, packageLabel, stageLabel } from "@/lib/labels";
import { ChartFrame, Legend } from "./chart-frame";
import { useI18n } from "./providers";

/** Economia mensal: caixas avariadas/mês x preço x redução (mesma fórmula de src/metrics.py:economia_simulada). */
const monthlyCost = (rows: typeof simulator.caixas_mes, prices: Record<Package, number>) =>
  rows.reduce((sum, r) => sum + r.caixas * prices[r.embalagem_id], 0);

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Simulator() {
  const { lang, t, f } = useI18n();
  const [stage, setStage] = useState<Stage | "all">("separacao");
  const [pkg, setPkg] = useState<Package | "all">("all");
  const [reduction, setReduction] = useState(simulator.reducao_padrao);
  const [prices, setPrices] = useState<Record<Package, number>>(simulator.precos);

  const slice = useMemo(
    () =>
      simulator.caixas_mes.filter(
        (r) => (stage === "all" || r.etapa_id === stage) && (pkg === "all" || r.embalagem_id === pkg),
      ),
    [stage, pkg],
  );
  const cost = monthlyCost(slice, prices);
  const boxes = slice.reduce((s, r) => s + r.caixas, 0);
  const saving = (cost * reduction) / 100;
  // O gráfico mostra todas as etapas da embalagem escolhida; só a etapa selecionada recebe a redução.
  const byStage = STAGES.map((s) => ({
    stage: s,
    active: stage === "all" || stage === s,
    cost: monthlyCost(
      simulator.caixas_mes.filter((r) => r.etapa_id === s && (pkg === "all" || r.embalagem_id === pkg)),
      prices,
    ),
  }));
  const maxStage = Math.max(...byStage.map((b) => b.cost), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="card space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t.simulator.stage}
            value={stage}
            onChange={setStage}
            options={[{ value: "all" as const, label: t.simulator.all }, ...STAGES.map((s) => ({ value: s, label: stageLabel(s, lang) }))]}
          />
          <Select
            label={t.simulator.package}
            value={pkg}
            onChange={setPkg}
            options={[{ value: "all" as const, label: t.simulator.all }, ...PACKAGES.map((p) => ({ value: p, label: packageLabel(p, lang) }))]}
          />
        </div>

        <label className="block">
          <span className="flex items-baseline justify-between text-xs font-medium text-muted">
            {t.simulator.reduction}
            <span className="text-lg font-semibold text-ink tabular">{reduction}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={reduction}
            onChange={(e) => setReduction(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--brand)]"
          />
        </label>

        <fieldset>
          <legend className="text-xs font-medium text-muted">{t.simulator.prices}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PACKAGES.map((p) => (
              <label key={p} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: packageColor(p) }} />
                <span className="min-w-0 flex-1 truncate text-xs text-ink-2">{packageLabel(p, lang)}</span>
                <span className="text-xs text-muted">R$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={prices[p]}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [p]: Math.max(0, Number(e.target.value) || 0) }))}
                  className="w-16 bg-transparent text-right text-sm font-semibold text-ink outline-none tabular"
                  aria-label={`${t.simulator.prices}: ${packageLabel(p, lang)}`}
                />
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              setPrices(simulator.precos);
              setReduction(simulator.reducao_padrao);
            }}
            className="mt-3 text-xs font-medium text-accent-ink underline-offset-4 hover:underline"
          >
            {t.simulator.reset}
          </button>
        </fieldset>
      </div>

      <div className="grid gap-4">
        <div className="card relative overflow-hidden p-5 sm:p-6">
          <div aria-hidden className="absolute -right-20 -top-20 size-56 rounded-full blur-3xl" style={{ background: "var(--glow-a)" }} />
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{t.simulator.result}</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl" aria-live="polite">
            {f.brl0(saving)}
            <span className="ml-2 text-base font-medium text-muted">{t.simulator.perMonth}</span>
          </p>
          <p className="mt-2 text-sm text-ink-2">
            <span className="font-semibold text-ink tabular">{f.brl0(saving * 12)}</span> {t.simulator.perYear} ·{" "}
            <span className="font-semibold text-ink tabular">{f.int((boxes * reduction) / 100)}</span> {t.simulator.boxes}
          </p>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            {fill(t.simulator.base, { cost: f.brl0(cost), boxes: f.int(boxes) })}
          </p>
        </div>

        <ChartFrame title={t.simulator.chartTitle} subtitle={t.simulator.chartSubtitle}>
          <div className="mb-4">
            <Legend
              items={[
                { label: t.simulator.saved, color: "var(--series-1)" },
                { label: t.simulator.remaining, color: "var(--series-rest)" },
              ]}
            />
          </div>
          <ul className="space-y-3">
            {byStage.map((b) => {
              const saved = b.active ? (b.cost * reduction) / 100 : 0;
              return (
                <li key={b.stage} className="grid grid-cols-[92px_1fr_76px] items-center gap-3 text-xs">
                  <span className={b.active ? "font-semibold text-ink" : "text-ink-2"}>{stageLabel(b.stage, lang)}</span>
                  <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-surface-2">
                    <motion.div
                      className="h-full rounded-l-full bg-[var(--series-1)]"
                      animate={{ width: `${(saved / maxStage) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                    <motion.div
                      className="h-full rounded-r-full bg-[var(--series-rest)]"
                      animate={{ width: `${((b.cost - saved) / maxStage) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="text-right font-semibold text-ink tabular">{f.brlCompact(b.cost)}</span>
                </li>
              );
            })}
          </ul>
        </ChartFrame>
      </div>
    </div>
  );
}
