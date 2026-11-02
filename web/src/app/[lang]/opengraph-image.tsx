import { ImageResponse } from "next/og";
import { getDictionary } from "@/i18n";
import { hasLocale, locales } from "@/i18n/config";
import { findings, meta } from "@/lib/data";
import { formatters } from "@/lib/format";

// Imagem de compartilhamento (LinkedIn, WhatsApp): gerada no build, uma por idioma.
export const alt = "Armazém Analytics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = hasLocale(raw) ? raw : "pt";
  const t = getDictionary(lang);
  const f = formatters(lang);
  const a = findings.achados;
  const stats = [
    { value: f.brlCompact(meta.custo_medio_mensal_brl), label: t.hero.kpis.monthly },
    { value: f.pp(a.long_neck_pct_custo, 0), label: t.summary.cards[1].title },
    { value: f.spp(a.separacao_var_ajustada_pct, 0), label: t.summary.cards[2].title },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "radial-gradient(900px circle at 15% 10%, #3a2a0e 0%, #0d0c0a 60%)",
          color: "#f1efe9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #fbbf24, #d97706)",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 700 }}>{t.brand}</div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 20,
              color: "#98938a",
              border: "1px dashed #5a564c",
              borderRadius: 10,
              padding: "6px 14px",
            }}
          >
            {t.hero.simulatedBadge}
          </div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>
          {t.hero.title}
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "22px 26px",
                borderRadius: 20,
                background: "#17150f",
                border: "1px solid #2a2720",
              }}
            >
              <div style={{ fontSize: 46, fontWeight: 700, color: "#fbbf24" }}>{s.value}</div>
              <div style={{ fontSize: 21, color: "#c6c1b5", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
