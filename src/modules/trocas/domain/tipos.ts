export type StatusTroca = "pendente" | "aceita" | "recusada" | "cancelada";

export const STATUS_TROCA: { valor: StatusTroca; rotulo: string; tom: "alerta" | "sucesso" | "erro" | "neutro" }[] = [
  { valor: "pendente", rotulo: "Aguardando", tom: "alerta" },
  { valor: "aceita", rotulo: "Aceita", tom: "sucesso" },
  { valor: "recusada", rotulo: "Recusada", tom: "erro" },
  { valor: "cancelada", rotulo: "Cancelada", tom: "neutro" },
];

/** Pedido de troca de equipe. */
export type Troca = {
  id: string;
  /** null quando a pessoa ou a equipe foi apagada (o histórico guarda cópias dos nomes). */
  solicitante: string | null;
  equipe_origem: string | null;
  equipe_destino: string | null;
  status: StatusTroca;
  mensagem: string | null;
  criado_em: string;
  respondido_em: string | null;
  quem: { nome: string } | null;
  respondido_por?: string | null;
  respondeu?: { nome: string } | null;
  solicitante_nome?: string | null;
  origem_nome?: string | null;
  destino_nome?: string | null;
  respondido_nome?: string | null;
};

/** Separa, para um aluno, o que interessa a ele nos pedidos que o banco deixou ver. */
export function separarTrocas(lista: Troca[], email: string, equipeId: string) {
  return {
    /** pedido meu aguardando resposta */
    meuPedido: lista.find((t) => t.solicitante === email && t.status === "pendente") ?? null,
    /** último pedido meu já respondido (para avisar "foi aceito/recusado") */
    meuUltimo: lista.find((t) => t.solicitante === email && t.status !== "pendente") ?? null,
    /** pedidos de gente de outras equipes querendo entrar na minha */
    recebidos: lista.filter((t) => t.equipe_destino === equipeId && t.status === "pendente" && t.solicitante !== email),
  };
}

export const nomeSolicitante = (t: Troca) => t.quem?.nome ?? t.solicitante_nome ?? t.solicitante ?? "Participante removido";
export const nomeRespondeu = (t: Troca) => t.respondido_nome ?? t.respondeu?.nome ?? t.respondido_por ?? null;
