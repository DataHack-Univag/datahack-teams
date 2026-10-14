import { describe, expect, it } from "vitest";
import { espera, ordemDeAtendimento, type Chamado } from "./tipos";

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
