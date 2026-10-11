import { describe, expect, it } from "vitest";
import { separarTrocas, type Troca } from "./tipos";

let seq = 0;
const troca = (t: Partial<Troca>): Troca => ({
  id: String(++seq),
  solicitante: "eu@x.com",
  equipe_origem: "minha",
  equipe_destino: "outra",
  status: "pendente",
  mensagem: null,
  criado_em: "2026-10-09T12:00:00Z",
  respondido_em: null,
  quem: null,
  ...t,
});

describe("separarTrocas", () => {
  it("separa meu pedido pendente, meu último respondido e os recebidos pela minha equipe", () => {
    const meu = troca({});
    const respondido = troca({ status: "recusada" });
    const recebido = troca({ solicitante: "ze@x.com", equipe_origem: "outra", equipe_destino: "minha" });
    const jaAceito = troca({ solicitante: "lu@x.com", equipe_destino: "minha", status: "aceita" });
    const r = separarTrocas([meu, respondido, recebido, jaAceito], "eu@x.com", "minha");
    expect(r.meuPedido).toBe(meu);
    expect(r.meuUltimo).toBe(respondido);
    expect(r.recebidos).toEqual([recebido]);
  });
  it("sem pedidos: tudo vazio", () => {
    expect(separarTrocas([], "eu@x.com", "minha")).toEqual({ meuPedido: null, meuUltimo: null, recebidos: [] });
  });
});
