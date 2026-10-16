import { describe, expect, it } from "vitest";
import { navAluno, navOrganizacao } from "./menus";

// O menu do aluno é o mesmo em todas as telas (inclusive a Ajuda): sem trocas na edição, sem a aba.
describe("menu do aluno", () => {
  it("só mostra Trocas quando a edição permite", () => {
    expect(navAluno("/", {}, true, false).map((i) => i.rotulo)).toEqual(["Minha equipe", "Materiais", "Ajuda"]);
    expect(navAluno("/", { trocas: 2 }, true, true).map((i) => i.rotulo)).toEqual(["Minha equipe", "Trocas", "Materiais", "Ajuda"]);
  });
});

// A bolinha de Equipes soma as trocas pedidas e as propostas prontas para aprovar.
describe("menu da organização", () => {
  const equipes = (c: Parameters<typeof navOrganizacao>[0]) => navOrganizacao(c).itens.find((i) => i.rotulo === "Equipes")?.contagem;
  it("soma trocas e propostas para aprovar", () => {
    expect(equipes({ trocas: 1, paraAprovar: 2 })).toBe(3);
    expect(equipes({ paraAprovar: 1 })).toBe(1);
    expect(equipes({})).toBeUndefined();
  });
});
