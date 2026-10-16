import { describe, expect, it } from "vitest";
import { navAluno } from "./menus";

// O menu do aluno é o mesmo em todas as telas (inclusive a Ajuda): sem trocas na edição, sem a aba.
describe("menu do aluno", () => {
  it("só mostra Trocas quando a edição permite", () => {
    expect(navAluno("/", {}, true, false).map((i) => i.rotulo)).toEqual(["Minha equipe", "Materiais", "Ajuda"]);
    expect(navAluno("/", { trocas: 2 }, true, true).map((i) => i.rotulo)).toEqual(["Minha equipe", "Trocas", "Materiais", "Ajuda"]);
  });
});
