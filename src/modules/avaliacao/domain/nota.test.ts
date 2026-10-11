import { describe, expect, it } from "vitest";
import { montarRanking } from "./consolidacao";
import { compararRanking, consolidarEquipe, consolidarRubrica, notaFicha } from "./nota";
import { NIVEIS, PENALIDADES, RUBRICAS, type Rubrica } from "./rubricas";
import type { Ficha } from "./tipos";

const PROFICIENTE = NIVEIS.find((n) => n.nome === "Proficiente")!.fator;
const MAXIMO = Math.max(...NIVEIS.map((n) => n.fator));

let seq = 0;
/** Ficha com o mesmo nível em todos os critérios da rubrica (ou faltando o primeiro, se parcial). */
function ficha(equipe: string, r: Rubrica, nivel: number, avaliador = "a@x.com", parcial = false): Ficha {
  const criterios = parcial ? r.criterios.slice(1) : r.criterios;
  return {
    id: String(++seq),
    equipe_id: equipe,
    avaliador,
    rubrica: r.id,
    notas: Object.fromEntries(criterios.map((c) => [c.id, nivel])),
    comentario: null,
    atualizado_em: "2026-10-10T12:00:00Z",
  };
}
const todas = (equipe: string, nivel: number) => RUBRICAS.map((r) => ficha(equipe, r, nivel));

describe("regulamento", () => {
  it("pesos das rubricas somam 100 e os critérios de cada rubrica também", () => {
    expect(RUBRICAS.reduce((s, r) => s + r.pesoFinal, 0)).toBe(100);
    for (const r of RUBRICAS) expect(r.criterios.reduce((s, c) => s + c.peso, 0)).toBe(100);
  });
});

describe("notaFicha", () => {
  it("tudo Proficiente = 80; critério sem nível conta 0", () => {
    const r = RUBRICAS[0];
    expect(notaFicha(r, ficha("e", r, PROFICIENTE).notas)).toBeCloseTo(80);
    expect(notaFicha(r, {})).toBe(0);
  });
});

describe("consolidarRubrica", () => {
  it("usa a média por critério entre avaliadores", () => {
    const r = RUBRICAS[0];
    const res = consolidarRubrica(r, [ficha("e", r, MAXIMO, "a@x"), ficha("e", r, PROFICIENTE, "b@x")]);
    expect(res.avaliadores).toBe(2);
    expect(res.nota).toBeCloseTo(((MAXIMO + PROFICIENTE) / 2) * 100);
    expect(res.completa).toBe(true);
  });
  it("sem fichas: nota null; ficha parcial: incompleta", () => {
    const r = RUBRICAS[0];
    expect(consolidarRubrica(r, []).nota).toBeNull();
    expect(consolidarRubrica(r, [ficha("e", r, MAXIMO, "a@x", true)]).completa).toBe(false);
  });
});

describe("consolidarEquipe", () => {
  it("tudo Proficiente = 80 e fica completa", () => {
    const res = consolidarEquipe(todas("e", PROFICIENTE), []);
    expect(res.final).toBeCloseTo(80);
    expect(res.completa).toBe(true);
  });
  it("penalidade desconta da nota final", () => {
    const p = PENALIDADES[0];
    expect(consolidarEquipe(todas("e", PROFICIENTE), [p.id]).final).toBeCloseTo(80 + p.pontos);
  });
  it("nota final nunca fica negativa", () => {
    expect(consolidarEquipe([], PENALIDADES.map((p) => p.id)).final).toBe(0);
  });
});

describe("ranking", () => {
  it("ordena pela nota final e numera as posições", () => {
    const linhas = montarRanking(
      [
        { id: "a", nome: "A", integrantes: [] },
        { id: "b", nome: "B", integrantes: [] },
      ],
      [...todas("a", PROFICIENTE), ...todas("b", MAXIMO)],
      new Map(),
    );
    expect(linhas.map((l) => [l.equipe.id, l.posicao])).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });
  it("empate na nota final: desempata pelo primeiro critério do regulamento", () => {
    const a = consolidarEquipe([], []);
    const b = { ...a, desempate: [10, 0, 0] };
    expect(compararRanking(a, b)).toBeGreaterThan(0);
    expect(compararRanking(b, a)).toBeLessThan(0);
    expect(compararRanking(a, { ...a })).toBe(0);
  });
});
