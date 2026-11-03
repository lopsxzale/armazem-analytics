"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Anotação direta num gráfico SVG: ponto no dado, linha-guia curta e uma frase de até 2 linhas.
 * O texto usa as cores de texto (nunca a cor da série); o ponto carrega a identidade.
 * `side` escolhe para onde a frase vai; `dx`/`dy` deslocam a frase em relação ao ponto.
 */
export function Annotation({
  x,
  y,
  lines,
  side = "right",
  dx = 28,
  dy = -22,
  show = true,
  delay = 0.9,
}: {
  x: number;
  y: number;
  lines: string[];
  side?: "left" | "right";
  dx?: number;
  dy?: number;
  show?: boolean;
  delay?: number;
}) {
  const tx = side === "right" ? x + dx : x - dx;
  const ty = y + dy;
  const anchor = side === "right" ? "start" : "end";
  return (
    <motion.g
      aria-hidden
      pointerEvents="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.45, delay: show ? delay : 0 }}
    >
      <circle cx={x} cy={y} r={4.5} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
      <path
        d={`M${x + (side === "right" ? 5 : -5)},${y - 3} L${tx + (side === "right" ? -4 : 4)},${ty + 4}`}
        stroke="var(--ink-2)"
        strokeWidth={1}
        fill="none"
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={tx}
          y={ty + i * 15}
          textAnchor={anchor}
          className={`text-[12px] ${i === 0 ? "fill-ink font-semibold" : "fill-ink-2"}`}
          style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 4, strokeLinejoin: "round" }}
        >
          {line}
        </text>
      ))}
    </motion.g>
  );
}

/** Anotação em HTML (para gráficos feitos com divs): uma etiqueta curta com seta. */
export function Note({ children, show = true, className = "" }: { children: ReactNode; show?: boolean; className?: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 4 }}
      transition={{ duration: 0.45, delay: show ? 0.8 : 0 }}
      className={`flex items-start gap-1.5 text-xs leading-snug text-ink-2 ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-px shrink-0 text-ink">
        <path d="M3 3v6.5a2 2 0 0 0 2 2h7.5M10 9l2.5 2.5L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </motion.p>
  );
}
