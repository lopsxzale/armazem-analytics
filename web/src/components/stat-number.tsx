"use client";

import { CountUp } from "./motion";
import { useI18n } from "./providers";

export type StatFormat = "pct0" | "spp0" | "int";

/** Número grande de seção que conta do zero ao valor quando aparece (formatado no idioma da página). */
export function StatNumber({ value, format }: { value: number; format: StatFormat }) {
  const { f } = useI18n();
  const fmt = (v: number) =>
    format === "pct0" ? f.pp(v, 0) : format === "spp0" ? f.spp(v, 0) : f.int(Math.round(v));
  return <CountUp value={value} format={fmt} duration={1.6} />;
}
