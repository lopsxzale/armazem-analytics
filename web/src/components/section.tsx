import type { ReactNode } from "react";
import { Glossed } from "./glossary";
import { Reveal, SplitText } from "./motion";
import { StatNumber, type StatFormat } from "./stat-number";

export function Section({
  id,
  index,
  eyebrow,
  title,
  lede,
  takeaway,
  stat,
  children,
}: {
  id: string;
  index?: string;
  eyebrow: string;
  title: string;
  lede?: string;
  takeaway?: string;
  /** Número grande da seção (a ideia em um número); conta do zero ao valor quando aparece. */
  stat?: { value: number; format: StatFormat; label: string };
  children?: ReactNode;
}) {
  return (
    <section id={id} className="relative scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className={`mb-10 sm:mb-14 ${stat ? "grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12" : ""}`}>
        <header className="max-w-3xl">
          <Reveal>
            <p className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-accent-ink">
              {index && <span className="font-mono text-muted">{index}</span>}
              <span aria-hidden className="h-px w-8 bg-accent/60" />
              {eyebrow}
            </p>
          </Reveal>
          <SplitText
            text={title}
            className="text-balance text-3xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-4xl lg:text-5xl"
          />
          {lede && (
            <Reveal delay={0.15}>
              <p className="mt-5 text-base leading-relaxed text-ink-2 sm:text-lg">
                <Glossed text={lede} />
              </p>
            </Reveal>
          )}
        </header>
        {stat && (
          <Reveal delay={0.2}>
            <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 lg:min-w-72 lg:p-7">
              <div aria-hidden className="absolute -right-10 -top-10 size-36 rounded-full blur-2xl" style={{ background: "var(--glow-a)" }} />
              <p className="relative text-5xl font-semibold tracking-tight text-ink tabular sm:text-6xl">
                <StatNumber value={stat.value} format={stat.format} />
              </p>
              <p className="relative mt-2 max-w-64 text-sm leading-snug text-ink-2">{stat.label}</p>
            </div>
          </Reveal>
        )}
        </div>
        {children}
        {takeaway && <Takeaway text={takeaway} />}
      </div>
    </section>
  );
}

export function Takeaway({ text }: { text: string }) {
  return (
    <Reveal className="mt-8">
      <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-accent/[0.07] p-5 sm:p-6">
        <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent" />
        <p className="flex gap-3 text-sm leading-relaxed text-ink sm:text-base">
          <svg className="mt-0.5 shrink-0 text-accent-ink" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 2.5v2M4.7 4.7l1.4 1.4M2.5 10h2M15.3 4.7l-1.4 1.4M17.5 10h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M7 12.5a3.5 3.5 0 1 1 6 0c-.6.7-1 1.3-1 2v.5H8v-.5c0-.7-.4-1.3-1-2zM8.5 17.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>
            <Glossed text={text} />
          </span>
        </p>
      </div>
    </Reveal>
  );
}
