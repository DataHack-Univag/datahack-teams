import type { Chamado, TipoChamado } from "@/modules/chamados/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

// Chamados ativos (aberto ou em atendimento). A tabela tem três ligações com pessoas:
// o nome de quem atende vem pela de atendido_por.
const COLUNAS =
  "id, equipe_id, tipo, mensagem, situacao, aberto_em, atendido_em, equipe:equipes(nome, icone), atendente:pessoas!chamados_atendido_por_fkey(nome)";

type Linha = Omit<Chamado, "atendente"> & { atendente: { nome: string } | null };
const paraChamado = (l: Linha): Chamado => ({ ...l, atendente: l.atendente?.nome ?? null });

export async function listarChamadosAtivos(cliente: Cliente, edicaoId: string): Promise<Chamado[]> {
  const r = await cliente
    .from("chamados")
    .select(COLUNAS)
    .eq("edicao_id", edicaoId)
    .in("situacao", ["aberto", "em_atendimento"])
    .order("aberto_em")
    .overrideTypes<Linha[], { merge: false }>();
  return (exigir(r, "os pedidos de ajuda") ?? []).map(paraChamado);
}

/** O pedido de ajuda aberto da equipe (ou null). Sem a tabela (migração 015), a tela segue sem ele. */
export async function chamadoAtivoDaEquipe(cliente: Cliente, equipeId: string): Promise<Chamado | null> {
  const r = await cliente
    .from("chamados")
    .select(COLUNAS)
    .eq("equipe_id", equipeId)
    .in("situacao", ["aberto", "em_atendimento"])
    .maybeSingle()
    .overrideTypes<Linha | null, { merge: false }>();
  if (r.error) return null;
  return r.data ? paraChamado(r.data) : null;
}

/** Quantos pedidos de ajuda estão abertos (contador do menu); 0 se o banco ainda não tem chamados. */
export async function contarChamadosAbertos(cliente: Cliente, edicaoId: string): Promise<number> {
  const r = await cliente
    .from("chamados")
    .select("*", { count: "exact", head: true })
    .eq("edicao_id", edicaoId)
    .eq("situacao", "aberto");
  return r.error ? 0 : (r.count ?? 0);
}

export const abrirChamado = (cliente: Cliente, tipo: TipoChamado, mensagem: string | null, como?: string) =>
  cliente.rpc("abrir_chamado", { p_tipo: tipo, p_mensagem: mensagem ?? undefined, p_como: como });

export const fecharChamadoDaEquipe = (cliente: Cliente, id: string, resolvido: boolean, como?: string) =>
  cliente.rpc("fechar_chamado_da_equipe", { p_chamado: id, p_resolvido: resolvido, p_como: como });

export const atenderChamado = (cliente: Cliente, id: string, resolver: boolean) =>
  cliente.rpc("atender_chamado", { p_chamado: id, p_resolver: resolver });

export const reabrirChamado = (cliente: Cliente, id: string) => cliente.rpc("reabrir_chamado", { p_chamado: id });
