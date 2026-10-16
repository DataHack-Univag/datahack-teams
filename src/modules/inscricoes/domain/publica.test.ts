import { describe, expect, it } from "vitest";
import type { Campo } from "@/modules/inscricoes/domain/campos";
import { comAceiteDoTermo, fraseInscricoes, limparNome, perguntasNaTela, problemaNoNome, situacaoDasInscricoes } from "@/modules/inscricoes/domain/publica";

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

describe("situacaoDasInscricoes (mesma regra do banco, migração 028)", () => {
  const agora = Date.parse("2026-10-20T12:00:00Z");
  const base = { acesso: "aberto", situacao: "planejada", atual: true, inscricao_abre_em: null, inscricao_fecha_em: null };
  it("abre só na edição atual e dentro do prazo", () => {
    expect(situacaoDasInscricoes(base, agora)).toBe("aberta");
    expect(situacaoDasInscricoes({ ...base, atual: false }, agora)).toBe("em_breve");
    expect(situacaoDasInscricoes({ ...base, atual: false, situacao: "em_andamento" }, agora)).toBe("encerrada");
    expect(situacaoDasInscricoes({ ...base, atual: false, inscricao_abre_em: "2026-11-01T00:00:00Z" }, agora)).toBe("em_breve");
    expect(situacaoDasInscricoes({ ...base, inscricao_abre_em: "2026-10-01T00:00:00Z", inscricao_fecha_em: "2026-10-30T00:00:00Z" }, agora)).toBe("aberta");
    expect(situacaoDasInscricoes({ ...base, inscricao_fecha_em: "2026-10-19T00:00:00Z" }, agora)).toBe("encerrada");
    expect(situacaoDasInscricoes({ ...base, situacao: "encerrada" }, agora)).toBe("encerrada");
    expect(situacaoDasInscricoes({ ...base, acesso: "lista" }, agora)).toBe("fechada");
  });
});

describe("situação da edição na página de inscrição (migração 031)", () => {
  it("concluída e cancelada", () => {
    expect(fraseInscricoes({ situacao: "encerrada", situacao_edicao: "encerrada", inscricao_abre_em: null, inscricao_fecha_em: null })).toMatch(/concluída/);
    expect(fraseInscricoes({ situacao: "em_breve", situacao_edicao: "planejada", inscricao_abre_em: null, inscricao_fecha_em: null })).toMatch(/ainda não foram abertas/);
    expect(situacaoDasInscricoes({ acesso: "aberto", situacao: "cancelada", atual: false })).toBe("fechada");
  });
});
