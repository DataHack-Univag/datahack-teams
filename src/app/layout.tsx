import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { RedeDados } from "@/components/RedeDados";
import "./globals.css";

export const metadata: Metadata = {
  title: "DATAHack Univag 2026 — Equipes",
  description: "Equipes, entregas e materiais do DATAHack Univag 2026",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000b38",
};

// Aplica o tema salvo (ou o do sistema) antes da primeira pintura, sem "piscar".
const SCRIPT_TEMA = `try{var t=localStorage.getItem("dh-theme");if(t!=="dark"&&t!=="light")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased" data-theme="dark" suppressHydrationWarning>
      <head>
        <Script id="tema" strategy="beforeInteractive">
          {SCRIPT_TEMA}
        </Script>
        {/* Fontes do DATAHack. Se não carregarem, cai na fonte do sistema. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;600&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <RedeDados />
        {/* Conteúdo acima da rede animada. */}
        <div className="relative z-[1] flex min-h-full flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
