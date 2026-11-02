"use client";

import { motion } from "motion/react";
import { findings as fd, pareto } from "@/lib/data";
import { fill } from "@/lib/format";
import { comboLabel } from "@/lib/labels";
import { CountUp } from "./motion";
import { useI18n } from "./providers";

export function Summary() {
  const { lang, t, f } = useI18n();
  const a = fd.achados;
  const values: Record<string, { value: number; format: (v: number) => string }> = {
    top3: { value: a.top3_pct, format: (v) => f.pp(v, 0) },
    glass: { value: a.long_neck_pct_custo, format: (v) => f.pp(v, 0) },
    picking: { value: a.separacao_var_pct, format: (v) => f.spp(v, 0) },
  };
  const [c1, c2, c3] = a.top3.map((c) => comboLabel(c.motivo_id, c.etapa_id, lang).toLowerCase());
  const vars = {
    top1: c1.charAt(0).toUpperCase() + c1.slice(1),
    top2: c2,
    top3: c3,
    n80: a.combos_ate_80,
    total: pareto.total_combos,
    glassVol: f.pp(a.long_neck_pct_volume, 0),
    ratio: `${f.dec(a.long_neck_taxa_pct / a.lata_taxa_pct, 1)}×`,
    glassRate: f.pp(a.long_neck_taxa_pct, 2),
    canRate: f.pp(a.lata_taxa_pct, 2),
    others: f.pp(Math.abs(a.outras_var_media_pct), 0),
  };

  return (
    <section id="summary" className="scroll-mt-20 px-4 pt-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-accent-ink"
        >
          {t.summary.eyebrow}
        </motion.p>
        <h2 className="mb-8 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t.summary.title}</h2>
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="grid gap-4 md:grid-cols-3"
        >
          {t.summary.cards.map((card) => {
            const v = values[card.value];
            return (
              <motion.li
                key={card.value}
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.97 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8 } },
                }}
                whileHover={{ y: -4 }}
                className="card group relative overflow-hidden p-6"
              >
                <div
                  aria-hidden
                  className="absolute -right-16 -top-16 size-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "var(--glow-a)" }}
                />
                <p className="text-4xl font-semibold tracking-tight text-ink">
                  <CountUp value={v.value} format={v.format} />
                </p>
                <p className="mt-1 text-sm font-medium text-ink-2">{card.title}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">{fill(card.text, vars)}</p>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
