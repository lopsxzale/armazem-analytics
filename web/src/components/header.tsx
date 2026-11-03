"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lockScroll, scrollToId } from "@/lib/lenis";
import { Logo } from "./logo";
import { useI18n } from "./providers";

const SECTIONS = ["real", "pareto", "packaging", "bottles", "monthly", "trend", "abc", "robust", "simulator", "method"] as const;

function useActiveSection(sections: readonly string[]) {
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);
  return active;
}

function ThemeToggle({ label }: { label: string }) {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const apply = () => {
      root.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {}
    };
    // View Transitions dão um crossfade suave entre os temas, quando suportadas.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doc.startViewTransition(apply);
    } else apply();
  };

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="12" cy="12" r="4.2" className="hidden dark:block" />
        <path
          className="hidden dark:block"
          d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
          strokeLinecap="round"
        />
        <path className="dark:hidden" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function Header({
  sections = SECTIONS,
  labels,
  page = "v1",
}: {
  sections?: readonly string[];
  labels?: Record<string, string>;
  page?: "v1" | "v2";
} = {}) {
  const { lang, t } = useI18n();
  const active = useActiveSection(sections);
  const label = (id: string) => labels?.[id] ?? (t.nav as Record<string, string>)[id];
  const subpath = page === "v2" ? "inventario/" : "";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const otherLang = lang === "pt" ? "en" : "pt";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    // Espera o menu fechar e liberar o scroll antes de navegar.
    requestAnimationFrame(() => scrollToId(id));
  };

  return (
    <>
      <a
        href="#summary"
        className="sr-only z-[70] rounded-full bg-accent px-4 py-2 text-brand-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.nav.skip}
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-500 ${
          scrolled || open ? "border-b border-line bg-page/75 backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <button
            onClick={() => go("top")}
            aria-label={t.brand}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold tracking-tight text-ink"
          >
            <Logo />
            <span className="hidden sm:inline">{t.brand}</span>
          </button>

          <nav aria-label="Seções" className="ml-auto hidden 2xl:block">
            <ul className="flex items-center text-sm">
              {sections.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(id);
                    }}
                    aria-current={active === id ? "true" : undefined}
                    className={`relative whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors ${
                      active === id ? "text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {active === id && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-surface-2"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <span className="relative">{label(id)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 2xl:ml-2">
            {/* Link para a outra página do projeto (avarias <-> inventário) */}
            <Link
              href={page === "v1" ? `/${lang}/inventario/` : `/${lang}/`}
              className="mr-1 hidden whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-ink-2 ring-1 ring-line transition hover:bg-surface-2 hover:text-ink sm:inline-flex"
            >
              {page === "v1" ? `${t.inv.goInventory} →` : `← ${t.inv.goDamage}`}
            </Link>
            <Link
              href={`/${otherLang}/${subpath}`}
              hrefLang={otherLang}
              prefetch={false}
              aria-label={t.nav.language}
              title={t.nav.language}
              className="rounded-full px-2.5 py-1.5 font-mono text-xs font-semibold uppercase text-ink-2 ring-1 ring-line transition hover:bg-surface-2 hover:text-ink"
            >
              {otherLang}
            </Link>
            <ThemeToggle label={t.nav.theme} />
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.nav.close : t.nav.menu}
              className="grid size-9 place-items-center rounded-full text-ink transition hover:bg-surface-2 2xl:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <motion.path
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  animate={{ d: open ? "M4 4L14 14" : "M3 6h12" }}
                />
                <motion.path
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  animate={{ d: open ? "M4 14L14 4" : "M3 12h12" }}
                />
              </svg>
            </button>
          </div>
        </div>
        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-accent via-accent to-[var(--glow-b)]"
          style={{ scaleX: progress }}
        />
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label={t.nav.menu}
            className="fixed inset-0 z-40 bg-page/95 px-6 pt-24 backdrop-blur-xl overflow-y-auto pb-10 2xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              href={page === "v1" ? `/${lang}/inventario/` : `/${lang}/`}
              className="mb-6 inline-flex rounded-full px-4 py-2 text-sm font-medium text-ink ring-1 ring-line"
            >
              {page === "v1" ? `${t.inv.goInventory} →` : `← ${t.inv.goDamage}`}
            </Link>
            <ul className="space-y-1">
              {sections.map((id, i) => (
                <motion.li
                  key={id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.45 }}
                >
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(id);
                    }}
                    className="flex items-baseline gap-4 border-b border-line py-3 text-xl font-semibold tracking-tight text-ink"
                  >
                    <span className="font-mono text-xs text-muted">{String(i).padStart(2, "0")}</span>
                    {label(id)}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
