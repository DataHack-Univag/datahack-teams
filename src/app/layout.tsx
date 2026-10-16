import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { COOKIE_COR, cssDoTema, temaDaCor } from "@/modules/instituicoes/domain/tema";
import { AvisoOffline } from "@/shared/ui/AvisoOffline";
import { RedeDados } from "@/shared/ui/RedeDados";
import { ProvedorToast } from "@/shared/ui/Toast";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // A cor da última edição vista: carregamentos, erros e qualquer tela já saem com ela.
  const cor = decodeURIComponent((await cookies()).get(COOKIE_COR)?.value ?? "");
  const tema = temaDaCor(cor);
  return (
    <html lang="pt-BR" className="h-full antialiased" data-theme="dark" suppressHydrationWarning>
      <head>
        <Script id="tema" strategy="beforeInteractive">
          {SCRIPT_TEMA}
        </Script>
        {/* Só cores geradas por temaDaCor (o cookie é conferido antes); LembrarTema atualiza. */}
        <style id="tema-edicao-base" dangerouslySetInnerHTML={{ __html: tema ? cssDoTema(tema) : "" }} />
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
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-superficie-solida focus:px-3 focus:py-2">
          Pular para o conteúdo
        </a>
        <RedeDados />
        <ProvedorToast>
          <AvisoOffline />
          {/* Conteúdo acima da rede animada. */}
          <div className="relative z-[1] flex min-h-full flex-1 flex-col">{children}</div>
        </ProvedorToast>
      </body>
    </html>
  );
}
