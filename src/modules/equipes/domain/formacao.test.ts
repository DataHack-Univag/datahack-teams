import { describe, expect, it } from "vitest";
import { estadosFormacao, resumoFormacao } from "./formacao";

const m = (email: string, situacao: "confirmado" | "convidado" = "confirmado") => ({ email, situacao, inscritos: null });
const equipes = [
  // Ana propôs; Bia aceitou; Caio ainda não respondeu
  { nome: "Pandas", situacao: "formando" as const, proposta_por: "ana", membros: [m("ana"), m("bia"), m("caio", "convidado")] },
  // Duda propôs e todos aceitaram (falta a organização aprovar)
  { nome: "Rota", situacao: "aguardando_aprovacao" as const, proposta_por: "duda", membros: [m("duda"), m("edu")] },
  // aprovada
  { nome: "DataMind", situacao: "aprovada" as const, proposta_por: "fabi", membros: [m("fabi"), m("gil")] },
  // recusada não conta
  { nome: "Velha", situacao: "recusada" as const, proposta_por: "hugo", membros: [m("hugo")] },
];
const alunos = ["ana", "bia", "caio", "duda", "edu", "fabi", "gil", "hugo", "ivo"];

describe("formação das equipes", () => {
  it("diz em que pé está cada aluno", () => {
    const e = estadosFormacao(equipes, alunos);
    expect([e.ana.estado, e.bia.estado, e.caio.estado, e.duda.estado, e.edu.estado, e.fabi.estado, e.hugo.estado, e.ivo.estado]).toEqual([
      "propos",
      "aceitou",
      "convidado",
      "propos",
      "aceitou",
      "em_equipe",
      "livre",
      "livre",
    ]);
    expect(e.caio.equipe).toBe("Pandas");
  });

  it("resume equipes e pessoas para o painel", () => {
    expect(resumoFormacao(equipes, alunos)).toEqual({
      equipes: { aguardandoAceite: 1, todosAceitaram: 1, aprovadas: 1 },
      pessoas: { propos: 2, convidado: 1, aceitou: 2, em_equipe: 2, livre: 2, total: 9 },
    });
  });
});
