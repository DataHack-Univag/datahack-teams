// Chamados: pedidos de ajuda das equipes durante o evento.

export type TipoChamado = "duvida" | "problema";
export type SituacaoChamado = "aberto" | "em_atendimento" | "resolvido" | "cancelado";

export type Chamado = {
  id: string;
  equipe_id: string;
  tipo: TipoChamado;
  mensagem: string | null;
  situacao: SituacaoChamado;
  aberto_em: string;
  atendido_em: string | null;
  /** Nome de quem está indo atender (em atendimento). */
  atendente: string | null;
  equipe: { nome: string; icone: string | null } | null;
};

export const TIPOS_CHAMADO: Record<TipoChamado, { rotulo: string; frase: string; tom: "alerta" | "erro" }> = {
  duvida: { rotulo: "Dúvida", frase: "Estamos com uma dúvida", tom: "alerta" },
  problema: { rotulo: "Problema", frase: "Estamos com um problema", tom: "erro" },
};

/** "agora", "há 3 min", "há 1 h 05 min": quanto tempo a equipe está esperando. */
export function espera(desde: string, agora: Date = new Date()): string {
  const min = Math.max(0, Math.floor((agora.getTime() - new Date(desde).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

/** Ordem de atendimento: problemas primeiro, depois quem espera há mais tempo. */
export function ordemDeAtendimento(a: Chamado, b: Chamado): number {
  if (a.situacao !== b.situacao) return a.situacao === "aberto" ? -1 : 1;
  if (a.tipo !== b.tipo) return a.tipo === "problema" ? -1 : 1;
  return a.aberto_em.localeCompare(b.aberto_em);
}
