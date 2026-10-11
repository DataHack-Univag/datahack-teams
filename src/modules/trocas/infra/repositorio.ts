// Repositório dos pedidos de troca de equipe. As regras (quem pode, troca de lugar)
// ficam nas funções SQL pedir/aceitar/recusar/cancelar_troca, que rodam numa transação.

import type { Troca } from "@/modules/trocas/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

const SELECT_TROCA =
  "id, solicitante, equipe_origem, equipe_destino, status, mensagem, criado_em, respondido_em," +
  " quem:inscritos!trocas_solicitante_fkey(nome)";

const SELECT_HISTORICO =
  SELECT_TROCA +
  ", respondido_por, respondeu:inscritos!trocas_respondido_por_fkey(nome)," +
  " solicitante_nome, origem_nome, destino_nome, respondido_nome";

/**
 * Pedidos que interessam a um aluno: os que ele fez (aguardando, ou respondidos nas últimas 24 h)
 * e os aguardando que o banco deixa ver (os da equipe dele).
 */
export async function trocasDoAluno(cliente: Cliente, email: string): Promise<Troca[]> {
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const r = await cliente
    .from("trocas")
    .select(SELECT_TROCA)
    .or(`solicitante.eq."${email}",status.eq.pendente`)
    .or(`status.eq.pendente,respondido_em.gte."${desde}"`)
    .order("criado_em", { ascending: false })
    .limit(50)
    .overrideTypes<Troca[], { merge: false }>();
  return exigir(r, "os pedidos de troca") ?? [];
}

export async function trocasPendentes(cliente: Cliente): Promise<Troca[]> {
  const r = await cliente
    .from("trocas")
    .select(SELECT_TROCA)
    .eq("status", "pendente")
    .order("criado_em", { ascending: true })
    .overrideTypes<Troca[], { merge: false }>();
  return exigir(r, "os pedidos de troca") ?? [];
}

/** Histórico completo (auditoria da organização), mais recentes primeiro. */
export async function historicoTrocas(cliente: Cliente): Promise<Troca[]> {
  const r = await cliente
    .from("trocas")
    .select(SELECT_HISTORICO)
    .order("criado_em", { ascending: false })
    .limit(500)
    .overrideTypes<Troca[], { merge: false }>();
  return exigir(r, "o histórico de trocas") ?? [];
}

// "como": e-mail do aluno em nome de quem a organização age no "ver como" (o banco ignora para alunos).
export const pedirTroca = (cliente: Cliente, destino: string, mensagem: string | null, como?: string) =>
  cliente.rpc("pedir_troca", { p_destino: destino, p_mensagem: mensagem ?? undefined, p_como: como });

export const cancelarTroca = (cliente: Cliente, pedido: string, como?: string) =>
  cliente.rpc("cancelar_troca", { p_pedido: pedido, p_como: como });

export const recusarTroca = (cliente: Cliente, pedido: string, como?: string) =>
  cliente.rpc("recusar_troca", { p_pedido: pedido, p_como: como });

export const aceitarTroca = (cliente: Cliente, pedido: string, como?: string) =>
  cliente.rpc("aceitar_troca", { p_pedido: pedido, p_como: como });
