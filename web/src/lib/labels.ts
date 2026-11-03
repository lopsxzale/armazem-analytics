import type { Locale } from "@/i18n/config";
import type { Bottle, BottleReason, BottleStage, Package, Reason, Stage } from "./data";

const PACKAGE_LABELS: Record<Package, Record<Locale, string>> = {
  long_neck: { pt: "Long neck (vidro)", en: "Long neck (glass)" },
  lata: { pt: "Lata", en: "Can" },
  barril: { pt: "Barril", en: "Keg" },
  outras: { pt: "Outras", en: "Other" },
};

const STAGE_LABELS: Record<Stage, Record<Locale, string>> = {
  doca: { pt: "Descarga", en: "Unloading" },
  armazenagem: { pt: "Armazenagem", en: "Storage" },
  separacao: { pt: "Separação", en: "Picking" },
  carregamento: { pt: "Carregamento", en: "Loading" },
};

// Frases do tipo "quebra no manuseio na separação" / "handling breakage at picking".
const STAGE_IN: Record<Stage, Record<Locale, string>> = {
  doca: { pt: "na descarga", en: "at unloading" },
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

// ---------------------------------------------------------------- vasilhame retornável

const BOTTLE_LABELS: Record<Bottle, Record<Locale, string>> = {
  "1L": { pt: "1L · litrão", en: "1L · quart bottle" },
  "600A": { pt: "600A · 600 ml âmbar", en: "600A · 600 ml amber" },
  "600V": { pt: "600V · 600 ml verde", en: "600V · 600 ml green" },
  "300ml": { pt: "300 ml · litrinho", en: "300 ml · small bottle" },
};

const BOTTLE_SHORT: Record<Bottle, string> = { "1L": "1L", "600A": "600A", "600V": "600V", "300ml": "300 ml" };

const BOTTLE_REASON_LABELS: Record<BottleReason, Record<Locale, string>> = {
  quebrada: { pt: "Quebrada", en: "Broken" },
  trincada: { pt: "Trincada", en: "Cracked" },
  sujidade_interna: { pt: "Sujidade interna", en: "Dirty inside" },
  bicada_externa: { pt: "Bicada externa", en: "Chipped outside" },
  bicada_interna: { pt: "Bicada interna", en: "Chipped inside" },
};

const BOTTLE_STAGE_LABELS: Record<BottleStage, Record<Locale, string>> = {
  retorno_rota: { pt: "Retorno de rota", en: "Route return" },
  triagem: { pt: "Triagem", en: "Sorting" },
  armazenagem_vasilhame: { pt: "Armazenagem", en: "Empties storage" },
  separacao_carregamento: { pt: "Separação e carga", en: "Picking & loading" },
};

export const bottleLabel = (b: Bottle, lang: Locale) => BOTTLE_LABELS[b][lang];
export const bottleShort = (b: Bottle) => BOTTLE_SHORT[b];
export const bottleReasonLabel = (r: BottleReason, lang: Locale) => BOTTLE_REASON_LABELS[r][lang];
export const bottleStageLabel = (s: BottleStage, lang: Locale) => BOTTLE_STAGE_LABELS[s][lang];
/** Ordem fixa 1L, 600A, 600V, 300ml (validada nos pares vizinhos, claro e escuro). */
export const bottleColor = (b: Bottle) => `var(--bt-${b})`;
