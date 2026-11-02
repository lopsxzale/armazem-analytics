import "../globals.css";

export const metadata = { title: "Armazém Analytics · Refugo e avarias" };

export default function RootRedirectLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
