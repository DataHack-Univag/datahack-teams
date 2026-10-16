import { describe, expect, it } from "vitest";
import { duracao, espera, mediaAteResolver, ordemDeAtendimento, type Chamado } from "./tipos";

const agora = new Date("2026-10-10T15:00:00Z");
const chamado = (id: string, tipo: Chamado["tipo"], aberto_em: string, situacao: Chamado["situacao"] = "aberto"): Chamado => ({
  id, equipe_id: id, tipo, mensagem: null, situacao, aberto_em, atendido_em: null, atendente: null, equipe: null,
});

describe("chamados", () => {
  it("mostra quanto tempo a equipe espera", () => {
    expect(espera("2026-10-10T14:59:40Z", agora)).toBe("agora");
    expect(espera("2026-10-10T14:57:00Z", agora)).toBe("há 3 min");
    expect(espera("2026-10-10T13:55:00Z", agora)).toBe("há 1 h 05 min");
  });

  it("atende primeiro os abertos, problemas antes de dúvidas, e quem espera há mais tempo", () => {
    const lista = [
      chamado("d-antiga", "duvida", "2026-10-10T14:00:00Z"),
      chamado("p-nova", "problema", "2026-10-10T14:50:00Z"),
      chamado("indo", "problema", "2026-10-10T13:00:00Z", "em_atendimento"),
      chamado("p-antiga", "problema", "2026-10-10T14:30:00Z"),
    ].sort(ordemDeAtendimento);
    expect(lista.map((c) => c.id)).toEqual(["p-antiga", "p-nova", "d-antiga", "indo"]);
  });
});

describe("chamados encerrados", () => {
  it("mostra quanto tempo o pedido ficou aberto e a média até resolver", () => {
    expect(duracao("2026-10-10T12:00:00Z", "2026-10-10T12:00:20Z")).toBe("menos de 1 min");
    expect(duracao("2026-10-10T12:00:00Z", "2026-10-10T13:05:00Z")).toBe("1 h 05 min");
    expect(duracao("2026-10-10T12:00:00Z", null)).toBeNull();
    const base = { equipe_id: "e", tipo: "duvida" as const, mensagem: null, atendido_em: null, atendente: null, equipe: null, fechado_por: null };
    expect(
      mediaAteResolver([
        { ...base, id: "1", situacao: "resolvido", aberto_em: "2026-10-10T12:00:00Z", fechado_em: "2026-10-10T12:10:00Z" },
        { ...base, id: "2", situacao: "resolvido", aberto_em: "2026-10-10T12:00:00Z", fechado_em: "2026-10-10T12:20:00Z" },
        { ...base, id: "3", situacao: "cancelado", aberto_em: "2026-10-10T12:00:00Z", fechado_em: "2026-10-10T15:00:00Z" },
      ]),
    ).toBe(15);
  });
});
