// Repositório de equipes, integrantes, links e configuração do evento.

import type { Configuracao, Equipe, EquipeResumo, LinkEntrega } from "@/modules/equipes/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

export const SELECT_EQUIPE =
  "id, nome, repo_github, repo_publico, repo_verificado_em, lider_email, criado_em, atualizado_em," +
  " membros(email, inscritos(nome, curso, semestre))," +
  " links(id, categoria, titulo, url)";

// ---------------------------------------------------------------- leitura

export async function lerConfiguracao(cliente: Cliente): Promise<Configuracao> {
  const data = exigir(
    await cliente.from("configuracao").select("max_membros, edicao_bloqueada").eq("id", 1).maybeSingle(),
    "a configuração do evento",
  );
  return data ?? { max_membros: 5, edicao_bloqueada: false };
}

export async function listarEquipes(cliente: Cliente): Promise<Equipe[]> {
  const r = await cliente
    .from("equipes")
    .select(SELECT_EQUIPE)
    .order("nome")
    .order("criado_em", { referencedTable: "links" })
    .overrideTypes<Equipe[], { merge: false }>();
  return exigir(r, "as equipes") ?? [];
}

export async function buscarEquipe(cliente: Cliente, id: string): Promise<Equipe | null> {
  const r = await cliente
    .from("equipes")
    .select(SELECT_EQUIPE)
    .eq("id", id)
    .order("criado_em", { referencedTable: "links" })
    .maybeSingle<Equipe>();
  return exigir(r, "a equipe") ?? null;
}

/** Equipe de um aluno numa consulta só, ou null se ele não tem equipe. */
export async function equipeDoAluno(cliente: Cliente, email: string): Promise<Equipe | null> {
  const r = await cliente
    .from("membros")
    .select(`equipes(${SELECT_EQUIPE})`)
    .eq("email", email)
    .maybeSingle<{ equipes: Equipe | null }>();
  return exigir(r, "a sua equipe")?.equipes ?? null;
}

/** Todas as equipes com o número de integrantes. */
export async function listarResumo(cliente: Cliente): Promise<EquipeResumo[]> {
  const r = await cliente
    .from("equipes")
    .select("id, nome, membros(count)")
    .order("nome")
    .overrideTypes<{ id: string; nome: string; membros: { count: number }[] }[], { merge: false }>();
  return (exigir(r, "a lista de equipes") ?? []).map((e) => ({ id: e.id, nome: e.nome, total: e.membros?.[0]?.count ?? 0 }));
}

export async function contarEquipes(cliente: Cliente): Promise<number> {
  const { count } = await cliente.from("equipes").select("*", { count: "exact", head: true });
  return count ?? 0;
}

// ---------------------------------------------------------------- gravação

export async function criarEquipe(cliente: Cliente, nome: string, repo: string) {
  return cliente.rpc("criar_equipe", { p_nome: nome, p_repo: repo });
}

/** Atualiza campos da equipe. `alterou` = false quando o banco recusou em silêncio (RLS). */
export async function atualizarEquipe(
  cliente: Cliente,
  id: string,
  dados: { nome?: string; repo_github?: string; repo_publico?: boolean | null; repo_verificado_em?: string | null; lider_email?: string | null },
) {
  const { data, error } = await cliente.from("equipes").update(dados).eq("id", id).select("id");
  return { alterou: !!data?.length, error };
}

export async function excluirEquipe(cliente: Cliente, id: string) {
  const { data, error } = await cliente.from("equipes").delete().eq("id", id).select("id");
  return { alterou: !!data?.length, error };
}

export async function adicionarMembro(cliente: Cliente, equipeId: string, email: string) {
  const { error } = await cliente.from("membros").insert({ email, equipe_id: equipeId });
  return { error };
}

export async function removerMembro(cliente: Cliente, equipeId: string, email: string) {
  const { data, error } = await cliente.from("membros").delete().eq("email", email).eq("equipe_id", equipeId).select("email");
  return { alterou: !!data?.length, error };
}

export async function adicionarLink(
  cliente: Cliente,
  link: { equipe_id: string; categoria: string; titulo: string | null; url: string; criado_por: string | null },
) {
  const { error } = await cliente.from("links").insert(link);
  return { error };
}

/** Remove o link e devolve os dados dele (para poder desfazer). */
export async function removerLink(cliente: Cliente, id: string) {
  const { data, error } = await cliente
    .from("links")
    .delete()
    .eq("id", id)
    .select("equipe_id, categoria, titulo, url")
    .overrideTypes<(Omit<LinkEntrega, "id"> & { equipe_id: string })[], { merge: false }>();
  return { removido: data?.[0] ?? null, error };
}

export async function salvarConfiguracao(cliente: Cliente, dados: Partial<Configuracao> & { avaliacao_encerrada?: boolean }) {
  const { data, error } = await cliente.from("configuracao").update(dados).eq("id", 1).select("id");
  return { alterou: !!data?.length, error };
}

/** Grava as equipes montadas pelo gerador numa transação só (RPC aplicar_equipes). */
export async function aplicarEquipes(cliente: Cliente, equipes: { nome: string; emails: string[] }[], substituir: boolean) {
  return cliente.rpc("aplicar_equipes", { p_equipes: equipes, p_substituir: substituir });
}
