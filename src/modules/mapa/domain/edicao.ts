import { encaixar, GRADE_CM } from "./catalogo";
import { caixa, type Elemento, type Sala } from "./tipos";

// Geometria do editor: redimensionar pelas alças, mover vários juntos e selecionar com um
// retângulo. Tudo em centímetros, na caixa como ela aparece (já girada).

export type Caixa = { x: number; y: number; largura: number; profundidade: number };
/** Alças de redimensionar: cantos e meios das bordas (n = em cima, s = embaixo, l = direita, o = esquerda). */
export type Alca = "n" | "s" | "l" | "o" | "nl" | "no" | "sl" | "so";
export const ALCAS: Alca[] = ["no", "n", "nl", "l", "sl", "s", "so", "o"];

const MINIMO = GRADE_CM;

/** Nova caixa ao puxar uma alça (dx, dy desde o início), encaixada na grade e dentro da sala. */
export function redimensionar(original: Caixa, alca: Alca, dx: number, dy: number, sala: Pick<Sala, "largura_cm" | "profundidade_cm">): Caixa {
  let { x, y, largura, profundidade } = original;
  const direita = original.x + original.largura;
  const baixo = original.y + original.profundidade;
  if (alca.includes("o")) {
    x = Math.min(Math.max(0, encaixar(original.x + dx)), direita - MINIMO);
    largura = direita - x;
  }
  if (alca.includes("l")) largura = Math.max(MINIMO, Math.min(sala.largura_cm - original.x, encaixar(original.largura + dx)));
  if (alca.includes("n")) {
    y = Math.min(Math.max(0, encaixar(original.y + dy)), baixo - MINIMO);
    profundidade = baixo - y;
  }
  if (alca.includes("s")) profundidade = Math.max(MINIMO, Math.min(sala.profundidade_cm - original.y, encaixar(original.profundidade + dy)));
  return { x, y, largura, profundidade };
}

/** Caixa (como aparece) de volta para as medidas guardadas, que são de antes de girar. */
export function medidasDaCaixa(e: Pick<Elemento, "rotacao">, c: Caixa) {
  const deitado = e.rotacao % 180 === 90;
  return { x_cm: c.x, y_cm: c.y, largura_cm: deitado ? c.profundidade : c.largura, profundidade_cm: deitado ? c.largura : c.profundidade };
}

/** Caixa que envolve vários elementos. */
export function caixaDoGrupo(elementos: Elemento[]): Caixa {
  const cs = elementos.map(caixa);
  const x = Math.min(...cs.map((c) => c.x));
  const y = Math.min(...cs.map((c) => c.y));
  return {
    x,
    y,
    largura: Math.max(...cs.map((c) => c.x + c.largura)) - x,
    profundidade: Math.max(...cs.map((c) => c.y + c.profundidade)) - y,
  };
}

/** Quanto o grupo pode andar (encaixado na grade) sem que nenhum saia da sala. */
export function deslocamentoDoGrupo(grupo: Caixa, dx: number, dy: number, sala: Pick<Sala, "largura_cm" | "profundidade_cm">) {
  return {
    dx: Math.min(Math.max(encaixar(dx), -grupo.x), sala.largura_cm - grupo.x - grupo.largura),
    dy: Math.min(Math.max(encaixar(dy), -grupo.y), sala.profundidade_cm - grupo.y - grupo.profundidade),
  };
}

/** Retângulo de seleção (de qualquer canto para qualquer canto) em formato de caixa. */
export function caixaEntre(a: { x: number; y: number }, b: { x: number; y: number }): Caixa {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), largura: Math.abs(a.x - b.x), profundidade: Math.abs(a.y - b.y) };
}

/** Elementos que o retângulo de seleção toca. */
export function tocados(elementos: Elemento[], r: Caixa): string[] {
  return elementos
    .filter((e) => {
      const c = caixa(e);
      return c.x < r.x + r.largura && r.x < c.x + c.largura && c.y < r.y + r.profundidade && r.y < c.y + c.profundidade;
    })
    .map((e) => e.id);
}
