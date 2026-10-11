import { describe, expect, it } from "vitest";
import { composicao, gerarEquipes, tamanhosEquipes, type AlunoGerador, type OpcoesGerador } from "./algoritmo";

const alunos: AlunoGerador[] = Array.from({ length: 23 }, (_, i) => ({
  email: `a${i}@x.com`,
  nome: `Aluno ${i}`,
  sem: (i % 8) + 1,
  nota: i % 5 === 0 ? null : 5 + (i % 5),
  semNota: i % 5 === 0,
  curso: i % 2 ? "ADS" : "SI",
}));
const opcoes: OpcoesGerador = { usarNota: true, pesoSem: 0.5, imputacao: "med", tamanho: 5, semente: "datahack", variacao: 0 };

describe("tamanhosEquipes", () => {
  it("sobras viram equipes de +1", () => {
    expect(tamanhosEquipes(23, 5)).toEqual([6, 6, 6, 5]);
    expect(tamanhosEquipes(20, 5)).toEqual([5, 5, 5, 5]);
    expect(tamanhosEquipes(3, 5)).toEqual([3]);
    expect(composicao([6, 6, 6, 5])).toBe("3 de 6 + 1 de 5");
  });
});

describe("gerarEquipes", () => {
  const emails = (o: OpcoesGerador) => gerarEquipes(alunos, o).equipes.map((e) => e.m.map((p) => p.email).sort());

  it("é determinístico para a mesma semente", () => {
    expect(emails(opcoes)).toEqual(emails(opcoes));
  });
  it("coloca cada aluno em exatamente uma equipe, nos tamanhos calculados", () => {
    const r = gerarEquipes(alunos, opcoes);
    const todos = r.equipes.flatMap((e) => e.m.map((p) => p.email));
    expect(todos).toHaveLength(alunos.length);
    expect(new Set(todos).size).toBe(alunos.length);
    expect(r.equipes.map((e) => e.m.length).sort()).toEqual([...tamanhosEquipes(alunos.length, 5)].sort());
  });
});
