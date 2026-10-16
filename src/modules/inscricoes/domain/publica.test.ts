import { describe, expect, it } from "vitest";
import type { Campo } from "@/modules/inscricoes/domain/campos";
import { comAceiteDoTermo, limparNome, perguntasNaTela, problemaNoNome } from "@/modules/inscricoes/domain/publica";

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

describe("um aceite só quando há termo", () => {
  const campos: Campo[] = [
    { chave: "curso", rotulo: "Curso", tipo: "texto", obrigatorio: true },
    { chave: "termo", rotulo: "Li e aceito o uso dos meus dados", tipo: "aceite", obrigatorio: true },
    { chave: "regulamento", rotulo: "Li o regulamento", tipo: "aceite", obrigatorio: true },
  ];
  it("com termo, esconde só a pergunta pronta de aceite dos dados", () => {
    expect(perguntasNaTela(campos, true).map((c) => c.chave)).toEqual(["curso", "regulamento"]);
    expect(perguntasNaTela(campos, false)).toHaveLength(3);
  });
  it("o aceite do termo responde a pergunta escondida", () => {
    expect(comAceiteDoTermo(campos, { curso: "SI" }, true, true)).toEqual({ curso: "SI", termo: true });
    expect(comAceiteDoTermo(campos, { curso: "SI", termo: true }, true, false)).toEqual({ curso: "SI" });
    expect(comAceiteDoTermo(campos, { curso: "SI" }, false, true)).toEqual({ curso: "SI" });
  });
});
