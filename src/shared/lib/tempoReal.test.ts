import { describe, expect, it } from "vitest";
import { agruparAvisos, casaRegra, type RegraAviso } from "@/shared/lib/tempoReal";

const agora = Date.parse("2026-10-30T15:00:00Z");

describe("casaRegra", () => {
  const inscricao: RegraAviso = { tabela: "inscricoes", evento: "INSERT", onde: { origem: "formulario" }, texto: "Nova inscrição recebida" };

  it("avisa a inscrição pelo formulário, não a importada", () => {
    expect(casaRegra(inscricao, { tabela: "inscricoes", evento: "INSERT", linha: { origem: "formulario" } }, agora)).toBe(true);
    expect(casaRegra(inscricao, { tabela: "inscricoes", evento: "INSERT", linha: { origem: "importacao" } }, agora)).toBe(false);
    expect(casaRegra(inscricao, { tabela: "inscricoes", evento: "UPDATE", linha: { origem: "formulario" } }, agora)).toBe(false);
    expect(casaRegra(inscricao, { tabela: "chamados", evento: "INSERT", linha: { origem: "formulario" } }, agora)).toBe(false);
  });

  it("'diferente' ignora o que a própria pessoa fez", () => {
    const r: RegraAviso = { tabela: "trocas", evento: "INSERT", onde: { solicitante: { diferente: "eu@x.com" } }, texto: "Troca" };
    expect(casaRegra(r, { tabela: "trocas", evento: "INSERT", linha: { solicitante: "outro@x.com" } }, agora)).toBe(true);
    expect(casaRegra(r, { tabela: "trocas", evento: "INSERT", linha: { solicitante: "eu@x.com" } }, agora)).toBe(false);
  });

  it("'recente' só avisa mudança de agora há pouco", () => {
    const r: RegraAviso = { tabela: "chamados", evento: "UPDATE", onde: { situacao: "em_atendimento" }, recente: "atendido_em", texto: "A caminho" };
    const linha = (min: number) => ({ situacao: "em_atendimento", atendido_em: new Date(agora - min * 60_000).toISOString() });
    expect(casaRegra(r, { tabela: "chamados", evento: "UPDATE", linha: linha(1) }, agora)).toBe(true);
    expect(casaRegra(r, { tabela: "chamados", evento: "UPDATE", linha: linha(10) }, agora)).toBe(false);
    expect(casaRegra(r, { tabela: "chamados", evento: "UPDATE", linha: { situacao: "em_atendimento" } }, agora)).toBe(false);
  });

  it("sem evento: inserção ou alteração", () => {
    const r: RegraAviso = { tabela: "equipes", onde: { situacao: "aguardando_aprovacao" }, texto: "Proposta" };
    expect(casaRegra(r, { tabela: "equipes", evento: "INSERT", linha: { situacao: "aguardando_aprovacao" } }, agora)).toBe(true);
    expect(casaRegra(r, { tabela: "equipes", evento: "UPDATE", linha: { situacao: "aguardando_aprovacao" } }, agora)).toBe(true);
    expect(casaRegra(r, { tabela: "equipes", evento: "DELETE", linha: { situacao: "aguardando_aprovacao" } }, agora)).toBe(false);
  });
});

describe("agruparAvisos", () => {
  it("junta os iguais com o plural", () => {
    const r: RegraAviso = { tabela: "inscricoes", texto: "Nova inscrição recebida", plural: "{n} novas inscrições recebidas", link: "/admin/inscricoes" };
    const c: RegraAviso = { tabela: "chamados", texto: "Novo pedido de ajuda" };
    expect(agruparAvisos([r, r, r, c])).toEqual([
      { texto: "3 novas inscrições recebidas", link: "/admin/inscricoes" },
      { texto: "Novo pedido de ajuda", link: undefined },
    ]);
    expect(agruparAvisos([r])).toEqual([{ texto: "Nova inscrição recebida", link: "/admin/inscricoes" }]);
  });
});
