import type { Locale } from "@/i18n/config";
import type { Package, Reason, Stage } from "./data";

const PACKAGE_LABELS: Record<Package, Record<Locale, string>> = {
  long_neck: { pt: "Long neck (vidro)", en: "Long neck (glass)" },
  lata: { pt: "Lata", en: "Can" },
  barril: { pt: "Barril", en: "Keg" },
  outras: { pt: "Outras", en: "Other" },
};

const STAGE_LABELS: Record<Stage, Record<Locale, string>> = {
  doca: { pt: "Doca", en: "Dock" },
  armazenagem: { pt: "Armazenagem", en: "Storage" },
  separacao: { pt: "Separação", en: "Picking" },
  carregamento: { pt: "Carregamento", en: "Loading" },
};

// Frases do tipo "quebra no manuseio na separação" / "handling breakage at picking".
const STAGE_IN: Record<Stage, Record<Locale, string>> = {
  doca: { pt: "na doca", en: "at the dock" },
  armazenagem: { pt: "na armazenagem", en: "in storage" },
  separacao: { pt: "na separação", en: "at picking" },
  carregamento: { pt: "no carregamento", en: "at loading" },
};

const REASON_LABELS: Record<Reason, Record<Locale, string>> = {
  quebra_manuseio: { pt: "Quebra no manuseio", en: "Handling breakage" },
  queda_palete: { pt: "Queda de palete", en: "Pallet fall" },
  amassado: { pt: "Embalagem amassada", en: "Crushed packaging" },
  empilhamento: { pt: "Empilhamento excessivo", en: "Over-stacking" },
  colisao_empilhadeira: { pt: "Colisão de empilhadeira", en: "Forklift collision" },
  vazamento: { pt: "Vazamento", en: "Leak" },
  vencimento: { pt: "Vencimento", en: "Expiry" },
  avaria_fornecedor: { pt: "Avaria do fornecedor", en: "Inbound transit damage" },
};

export const packageLabel = (p: Package, lang: Locale) => PACKAGE_LABELS[p][lang];
export const stageLabel = (s: Stage, lang: Locale) => STAGE_LABELS[s][lang];
export const stageIn = (s: Stage, lang: Locale) => STAGE_IN[s][lang];
export const reasonLabel = (r: Reason, lang: Locale) => REASON_LABELS[r][lang];

/** "Quebra no manuseio na separação" */
export const comboLabel = (r: Reason, s: Stage, lang: Locale) =>
  `${reasonLabel(r, lang)} ${stageIn(s, lang)}`;

export const packageColor = (p: Package) => `var(--pk-${p})`;

/** Cor sequencial (6 passos) para um valor entre 0 e max. */
export const seqColor = (value: number, max: number) => {
  const step = Math.min(5, Math.max(0, Math.round((value / max) * 5)));
  return { fill: `var(--seq-${step})`, ink: `var(--seq-ink-${step})` };
};
