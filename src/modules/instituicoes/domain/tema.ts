// Tema do sistema a partir da cor da edição: o mesmo matiz em vários tons, para o tema claro e
// o escuro. Os tons de texto e de destaque são ajustados até terem contraste de leitura
// (WCAG AA: 4,5:1). Cores de aviso (erro, sucesso, pendência) não mudam: têm significado.

import { COR_PADRAO, corValida } from "@/modules/instituicoes/domain/tipos";

type Hsl = { h: number; s: number; l: number };

function hexParaHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslParaHex({ h, s, l }: Hsl): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lum = Math.min(100, Math.max(0, l)) / 100;
  const a = sat * Math.min(lum, 1 - lum);
  const canal = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lum - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${canal(0)}${canal(8)}${canal(4)}`;
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbTexto = (hex: string) => rgb(hex).join(" ");

function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre duas cores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Escurece (ou clareia) o tom até ler bem sobre o fundo. */
function legivel(cor: Hsl, fundo: string, minimo: number, direcao: -1 | 1): string {
  let c = { ...cor };
  for (let i = 0; i < 60 && contraste(hslParaHex(c), fundo) < minimo; i++) c = { ...c, l: c.l + direcao * 1.5 };
  return hslParaHex(c);
}

/** Gradiente da marca (abas e filtros ativos, com texto branco): tons que leem bem com branco. */
function gradiente(h: number, s: number, vizinho: (dh: number) => number): string {
  const tom = (dh: number, l: number) => legivel({ h: vizinho(dh), s: Math.min(s + 10, 95), l }, "#ffffff", 4.6, -1);
  return `linear-gradient(110deg, ${tom(-14, 42)} 0%, ${tom(0, 38)} 55%, ${tom(22, 34)} 100%)`;
}

/** Gradiente do botão principal: tons escuros da cor, com texto branco legível. */
function botao(h: number, s: number, vizinho: (dh: number) => number): Record<string, string> {
  const um = legivel({ h: vizinho(-10), s: Math.min(s + 10, 95), l: 34 }, "#ffffff", 4.6, -1);
  const tres = legivel({ h: vizinho(28), s: Math.min(s + 10, 95), l: 38 }, "#ffffff", 4.6, -1);
  return { "--botao-1": um, "--botao-3": tres, "--botao-sombra": `rgb(${rgbTexto(hslParaHex({ h, s, l: 45 }))} / 0.6)` };
}

export type Tema = { claro: Record<string, string>; escuro: Record<string, string> };

/**
 * Paleta completa a partir da cor da edição. null = tema padrão do DATAHack (sem cor, ou a cor
 * padrão azul-marinho, que é a da Edição 1).
 */
export function temaDaCor(cor: string | null | undefined): Tema | null {
  if (!cor || !corValida(cor) || cor.toLowerCase() === COR_PADRAO) return null;
  const { h, s: s0 } = hexParaHsl(cor);
  // Cor muito acinzentada ainda assim ganha um pouco de saturação, para o tema ter cara.
  const s = Math.max(s0, 45);
  const vizinho = (dh: number) => (h + dh + 360) % 360;

  // ------------------------------------------------ tema claro: fundo clarinho, cor escurecida
  const fundoClaro = hslParaHex({ h, s: Math.min(s, 70), l: 97 });
  // Conferido contra o fundo claro (mais escuro que o branco dos cartões): vale para os dois.
  const marcaClaro = legivel(hexParaHsl(cor), fundoClaro, 4.6, -1);
  const mClaro = hexParaHsl(marcaClaro);
  const claro: Record<string, string> = {
    "--background": fundoClaro,
    "--background-2": hslParaHex({ h, s: Math.min(s, 65), l: 93 }),
    "--foreground": hslParaHex({ h, s: Math.min(s, 70), l: 12 }),
    "--suave": legivel({ h, s: Math.min(s, 30), l: 40 }, fundoClaro, 4.6, -1),
    "--borda": `rgb(${rgbTexto(hslParaHex({ h, s, l: 30 }))} / 0.13)`,
    "--borda-forte": `rgb(${rgbTexto(hslParaHex({ h, s, l: 30 }))} / 0.26)`,
    "--marca": marcaClaro,
    "--marca-forte": hslParaHex({ ...mClaro, l: mClaro.l - 9 }),
    "--marca-fundo": `rgb(${rgbTexto(marcaClaro)} / 0.12)`,
    "--azul": legivel({ h: vizinho(18), s: Math.min(s + 10, 90), l: Math.min(mClaro.l, 40) }, "#ffffff", 4.6, -1),
    "--grad": gradiente(h, s, vizinho),
    "--glow": `0 0 0 1px rgb(${rgbTexto(marcaClaro)} / 0.25), 0 10px 30px -12px rgb(${rgbTexto(marcaClaro)} / 0.35)`,
    "--net": rgb(marcaClaro).join(", "),
    "--ponto": `rgb(${rgbTexto(hslParaHex({ h, s, l: 30 }))} / 0.09)`,
    "--brilho-1": `rgb(${rgbTexto(marcaClaro)} / 0.14)`,
    "--brilho-2": `rgb(${rgbTexto(hslParaHex({ h: vizinho(-14), s, l: 50 }))} / 0.1)`,
    ...botao(h, s, vizinho),
  };

  // ------------------------------------------------ tema escuro: fundo escuro, cor clareada
  const fundoEscuro = hslParaHex({ h, s: Math.min(s, 75), l: 8 });
  const marcaEscuro = legivel({ h, s: Math.min(s + 10, 95), l: 58 }, fundoEscuro, 7, 1);
  const mEscuro = hexParaHsl(marcaEscuro);
  const escuro: Record<string, string> = {
    "--background": fundoEscuro,
    "--background-2": hslParaHex({ h, s: Math.min(s, 70), l: 12 }),
    "--foreground": hslParaHex({ h, s: 40, l: 95 }),
    "--superficie": `rgb(${rgbTexto(hslParaHex({ h, s: Math.min(s, 60), l: 14 }))} / 0.78)`,
    "--superficie-solida": hslParaHex({ h, s: Math.min(s, 60), l: 14 }),
    "--suave": legivel({ h, s: Math.min(s, 35), l: 70 }, fundoEscuro, 4.6, 1),
    "--borda": `rgb(${rgbTexto(hslParaHex({ h, s, l: 65 }))} / 0.16)`,
    "--borda-forte": `rgb(${rgbTexto(hslParaHex({ h, s, l: 65 }))} / 0.3)`,
    "--marca": marcaEscuro,
    "--marca-forte": hslParaHex({ ...mEscuro, l: Math.min(mEscuro.l + 12, 92) }),
    "--marca-fundo": `rgb(${rgbTexto(marcaEscuro)} / 0.13)`,
    "--azul": legivel({ h: vizinho(18), s: Math.min(s + 10, 90), l: 42 }, "#ffffff", 4.6, -1),
    "--grad": gradiente(h, s, vizinho),
    "--glow": `0 0 0 1px rgb(${rgbTexto(marcaEscuro)} / 0.28), 0 10px 40px -10px rgb(${rgbTexto(hslParaHex({ h, s, l: 45 }))} / 0.55)`,
    "--net": rgb(marcaEscuro).join(", "),
    "--ponto": `rgb(${rgbTexto(hslParaHex({ h, s, l: 70 }))} / 0.13)`,
    "--brilho-1": `rgb(${rgbTexto(hslParaHex({ h, s, l: 45 }))} / 0.2)`,
    "--brilho-2": `rgb(${rgbTexto(marcaEscuro)} / 0.12)`,
    ...botao(h, s, vizinho),
  };
  return { claro, escuro };
}

/** As regras CSS do tema (mesmos seletores do globals.css, para valer por cima dele). */
export function cssDoTema(tema: Tema): string {
  const bloco = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
  return `:root,:root[data-theme="dark"]{${bloco(tema.escuro)}}:root[data-theme="light"]{${bloco(tema.claro)}}`;
}
