import { describe, expect, it } from "vitest";
import canonico from "../../../../config/regulamento_2026.json";
import { montarRanking } from "./consolidacao";
import { compararRanking, consolidarEquipe, consolidarRubrica, notaFicha } from "./nota";
import { conferirRegulamento, regulamentoDoCanonico, type RegulamentoCanonico, type Rubrica } from "./regulamento";
import type { Ficha } from "./tipos";

const REG = regulamentoDoCanonico(canonico as RegulamentoCanonico);
const PROFICIENTE = REG.niveis.find((n) => n.nome === "Proficiente")!.fator;
const MAXIMO = Math.max(...REG.niveis.map((n) => n.fator));

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
const todas = (equipe: string, nivel: number) => REG.rubricas.map((r) => ficha(equipe, r, nivel));

describe("regulamento de 2026", () => {
  it("é consistente: rubricas somam 100, critérios de cada rubrica somam 100, fases batem", () => {
    expect(conferirRegulamento(REG)).toEqual([]);
    expect(REG.rubricas).toHaveLength(6);
    expect(REG.desempate.map((d) => d.tipo)).toEqual(["rubrica", "criterio", "criterio", "manual"]);
  });
  it("aponta problemas num regulamento torto", () => {
    const torto = { ...REG, rubricas: REG.rubricas.map((r, i) => (i === 0 ? { ...r, pesoFinal: r.pesoFinal + 1 } : r)) };
    expect(conferirRegulamento(torto).length).toBeGreaterThan(0);
  });
});

describe("notaFicha", () => {
  it("tudo Proficiente = 80; critério sem nível conta 0", () => {
    const r = REG.rubricas[0];
    expect(notaFicha(r, ficha("e", r, PROFICIENTE).notas)).toBeCloseTo(80);
    expect(notaFicha(r, {})).toBe(0);
  });
});

describe("consolidarRubrica", () => {
  it("usa a média por critério entre avaliadores", () => {
    const r = REG.rubricas[0];
    const res = consolidarRubrica(r, [ficha("e", r, MAXIMO, "a@x"), ficha("e", r, PROFICIENTE, "b@x")]);
    expect(res.avaliadores).toBe(2);
    expect(res.nota).toBeCloseTo(((MAXIMO + PROFICIENTE) / 2) * 100);
    expect(res.completa).toBe(true);
  });
  it("sem fichas: nota null; ficha parcial: incompleta", () => {
    const r = REG.rubricas[0];
    expect(consolidarRubrica(r, []).nota).toBeNull();
    expect(consolidarRubrica(r, [ficha("e", r, MAXIMO, "a@x", true)]).completa).toBe(false);
  });
});

describe("consolidarEquipe", () => {
  it("tudo Proficiente = 80 e fica completa", () => {
    const res = consolidarEquipe(REG, todas("e", PROFICIENTE), []);
    expect(res.final).toBeCloseTo(80);
    expect(res.completa).toBe(true);
  });
  it("penalidade de −3 desconta da nota final (80 → 77)", () => {
    const p = REG.penalidades.find((x) => x.pontos === -3)!;
    expect(consolidarEquipe(REG, todas("e", PROFICIENTE), [p.id]).final).toBeCloseTo(77);
  });
  it("nota final nunca fica negativa", () => {
    expect(consolidarEquipe(REG, [], REG.penalidades.map((p) => p.id)).final).toBe(0);
  });
  it("desempate segue as regras do regulamento (só as automáticas)", () => {
    expect(consolidarEquipe(REG, todas("e", PROFICIENTE), []).desempate).toEqual([80, PROFICIENTE, PROFICIENTE]);
  });
});

describe("ranking", () => {
  it("ordena pela nota final e numera as posições", () => {
    const linhas = montarRanking(
      REG,
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
    const a = consolidarEquipe(REG, [], []);
    const b = { ...a, desempate: [10, 0, 0] };
    expect(compararRanking(a, b)).toBeGreaterThan(0);
    expect(compararRanking(b, a)).toBeLessThan(0);
    expect(compararRanking(a, { ...a })).toBe(0);
  });
});
