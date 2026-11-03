"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { pareto, STAGES, type Stage } from "@/lib/data";
import { stageLabel } from "@/lib/labels";
import { Glossed } from "./glossary";
import { useI18n } from "./providers";

const STEP = 0.55; // segundos entre uma etapa e a próxima

function StageIcon({ stage }: { stage: Stage }) {
  const common = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6 } as const;
  if (stage === "doca")
    // caminhão chegando, seta para dentro
    return (
      <svg {...common} aria-hidden>
        <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7" strokeLinejoin="round" />
        <circle cx="6" cy="17.5" r="1.7" />
        <circle cx="17" cy="17.5" r="1.7" />
        <path d="M9 2.5v3.5M7.3 4.5 9 6.2l1.7-1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (stage === "armazenagem")
    // estante com caixas
    return (
      <svg {...common} aria-hidden>
        <path d="M3 3v18M21 3v18M3 12h18M3 21h18" strokeLinecap="round" />
        <path d="M6 7h4v5H6zM12 8h4v4h-4zM7 16h5v5H7z" strokeLinejoin="round" />
      </svg>
    );
  if (stage === "separacao")
    // caixas do pedido com checklist
    return (
      <svg {...common} aria-hidden>
        <path d="M4 9h8v11H4zM4 13h8" strokeLinejoin="round" />
        <path d="M15 4h6v8h-6zM16.5 7l1 1 2-2M16.5 10h3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  // caminhão saindo, seta para fora
  return (
    <svg {...common} aria-hidden>
      <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7" strokeLinejoin="round" />
      <circle cx="6" cy="17.5" r="1.7" />
      <circle cx="17" cy="17.5" r="1.7" />
      <path d="M17 2.5h4M19.3 1 21 2.5 19.3 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** O caminho do produto no armazém: as 4 etapas em ordem, com o peso de cada uma no custo da avaria. */
export function StageMap() {
  const { lang, t, f } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const share = (s: Stage) => pareto.etapas.find((e) => e.etapa_id === s)!.pct;
  const max = Math.max(...STAGES.map(share));
  const total = STAGES.length;

  return (
    <section id="stages" className="scroll-mt-20 px-4 pt-20 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-accent-ink">{t.stages.eyebrow}</p>
        <h2 className="max-w-3xl text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t.stages.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-base">
          <Glossed text={t.stages.lede} />
        </p>

        <div ref={ref} className="card relative mt-8 overflow-hidden p-5 sm:p-8">
          {/* Trilho: a linha que liga as etapas se desenha da esquerda para a direita, e uma caixa a percorre. */}
          <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[63px] hidden h-0.5 bg-surface-2 md:block">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-accent to-[var(--series-focus)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: inView ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : STEP * (total - 1), ease: "linear", delay: 0.2 }}
            />
            <motion.span
              className="absolute -top-[7px] size-4 rounded-[4px] border-2 border-[var(--brand)] bg-surface shadow-md"
              initial={{ left: "0%", opacity: 0 }}
              animate={inView ? { left: "100%", opacity: [0, 1, 1, 0] } : {}}
              transition={{ duration: reduce ? 0 : STEP * (total - 1), ease: "linear", delay: 0.2 }}
              style={{ translateX: "-50%" }}
            />
          </div>

          <ol className="relative grid gap-6 md:grid-cols-4 md:gap-4">
            {STAGES.map((s, i) => {
              const pct = share(s);
              const delay = reduce ? 0 : 0.2 + i * STEP;
              return (
                <motion.li
                  key={s}
                  className="flex gap-4 md:flex-col md:items-center md:text-center"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 16 }}
                  transition={{ duration: 0.5, delay }}
                >
                  <motion.span
                    className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-ink sm:size-16"
                    animate={inView && !reduce ? { scale: [1, 1.12, 1] } : {}}
                    transition={{ duration: 0.45, delay: delay + 0.15 }}
                  >
                    <StageIcon stage={s} />
                    <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-accent font-mono text-[10px] font-bold text-brand-ink">
                      {i + 1}
                    </span>
                  </motion.span>
                  <div className="min-w-0 flex-1 md:mt-4 md:w-full">
                    <p className="text-base font-semibold text-ink">{stageLabel(s, lang)}</p>
                    <p className="mt-1 text-sm leading-snug text-ink-2">{t.stages.steps[s]}</p>
                    <div className="mt-3 md:mx-auto md:max-w-48">
                      <div className="h-2 rounded-full bg-surface-2">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: pct === max ? "var(--series-focus)" : "var(--series-1)" }}
                          initial={{ width: 0 }}
                          animate={{ width: inView ? `${(pct / max) * 100}%` : 0 }}
                          transition={{ duration: 0.7, delay: delay + 0.2 }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted tabular">
                        <span className="font-semibold text-ink">{f.pp(pct, 0)}</span> {t.stages.ofCost}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
          <p className="mt-6 border-t border-line pt-4 text-sm text-ink-2">
            <Glossed text={t.stages.note} />
          </p>
        </div>
      </div>
    </section>
  );
}
