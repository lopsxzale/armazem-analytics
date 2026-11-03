"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment, useId, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "./providers";

/** Um termo do glossário: sublinhado pontilhado; ao passar o mouse (ou focar), mostra a definição. */
function Term({ children, definition }: { children: ReactNode; definition: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline">
      <span
        tabIndex={0}
        aria-describedby={id}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-help rounded-sm underline decoration-accent/70 decoration-dotted decoration-2 underline-offset-[3px] outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
      >
        {children}
      </span>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-64 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs font-normal leading-snug text-ink-2 shadow-xl"
          >
            <span className="mb-0.5 block font-semibold text-ink">{children}</span>
            {definition}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Texto com os termos do glossário destacados (só a 1ª ocorrência de cada termo, para não poluir).
 * Os termos e as definições ficam no i18n (`glossary`).
 */
export function Glossed({ text }: { text: string }) {
  const { t } = useI18n();
  const terms = t.glossary;
  const pattern = useMemo(() => {
    const keys = Object.keys(terms).sort((a, b) => b.length - a.length).map(escape);
    // Sem \b: ele não entende acentos. Letra antes/depois do termo bloqueia o casamento (aceita plural em -s).
    return new RegExp(`(?<!\\p{L})(${keys.join("|")})(s?)(?!\\p{L})`, "giu");
  }, [terms]);

  const seen = new Set<string>();
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const key = m[1].toLowerCase();
    if (seen.has(key) || !(key in terms)) continue;
    seen.add(key);
    parts.push(<Fragment key={`t${last}`}>{text.slice(last, m.index)}</Fragment>);
    parts.push(
      <Term key={`g${m.index}`} definition={terms[key]}>
        {m[0]}
      </Term>,
    );
    last = m.index + m[0].length;
  }
  parts.push(<Fragment key="end">{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}
