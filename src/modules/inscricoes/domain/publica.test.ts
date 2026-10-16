import { describe, expect, it } from "vitest";
import { limparNome, problemaNoNome } from "@/modules/inscricoes/domain/publica";

describe("nome na inscrição pública", () => {
  it("pede nome e sobrenome, como o banco", () => {
    expect(problemaNoNome("Maria Silva")).toBeNull();
    expect(problemaNoNome("  Maria   da  Silva ")).toBeNull();
    expect(problemaNoNome("teste")).toMatch(/sobrenome/);
    expect(problemaNoNome("Jo")).toMatch(/completo/);
    expect(problemaNoNome("a ".repeat(70))).toMatch(/120/);
  });
  it("junta espaços repetidos e invisíveis", () => {
    expect(limparNome(" Maria  Silva\t")).toBe("Maria Silva");
  });
});
