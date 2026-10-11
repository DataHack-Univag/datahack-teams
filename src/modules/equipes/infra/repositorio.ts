// Repositório de equipes, integrantes e links (por edição). Nada é apagado: equipe arquivada,
// integrante que sai (saiu_em) e link removido (removido_em) continuam no banco e no histórico.

import type { Equipe, EquipeResumo, LinkEntrega, Membro } from "@/modules/equipes/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";
import type { Json } from "@/shared/db/tipos-banco";

const SELECT_EQUIPE =
  "id, edicao_id, nome, repo_github, repo_publico, repo_verificado_em, lider_email, situacao, origem, proposta_por, motivo_analise, criado_em, atualizado_em," +
  " membros(email, situacao, saiu_em, inscritos:pessoas!membros_email_fkey(nome))," +
  " links(id, categoria, titulo, url, removido_em, criado_em)";

type LinhaEquipe = Omit<Equipe, "membros" | "links"> & {
  membros: (Omit<Membro, "inscritos"> & { saiu_em: string | null; inscritos: { nome: string } | null })[];
  links: (LinkEntrega & { removido_em: string | null; criado_em: string })[];
};

/** Curso e semestre vêm da participação na edição; integrantes e links só os ativos. */
async function completar(cliente: Cliente, edicaoId: string, linhas: LinhaEquipe[]): Promise<Equipe[]> {
  if (!linhas.length) return [];
  const r = await cliente.from("participacoes").select("email, curso, semestre").eq("edicao_id", edicaoId);
  const part = new Map((exigir(r, "os integrantes") ?? []).map((p) => [p.email, p]));
  return linhas.map((e) => ({
    ...e,
    membros: e.membros
      .filter((m) => !m.saiu_em)
      .map((m) => ({
        email: m.email,
        situacao: m.situacao,
        inscritos: { nome: m.inscritos?.nome ?? m.email, curso: part.get(m.email)?.curso ?? null, semestre: part.get(m.email)?.semestre ?? null },
      }))
      .sort((a, b) => (a.inscritos.nome ?? "").localeCompare(b.inscritos.nome ?? "", "pt-BR")),
    links: e.links
      .filter((l) => !l.removido_em)
      .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
      .map(({ id, categoria, titulo, url }) => ({ id, categoria, titulo, url })),
  }));
}

// ---------------------------------------------------------------- leitura

/** Equipes da edição. Padrão: só as aprovadas; `incluirPropostas` traz também as em formação. */
export async function listarEquipes(cliente: Cliente, edicaoId: string, opcoes: { incluirPropostas?: boolean } = {}): Promise<Equipe[]> {
  let q = cliente.from("equipes").select(SELECT_EQUIPE).eq("edicao_id", edicaoId).is("removido_em", null);
  q = opcoes.incluirPropostas ? q.in("situacao", ["aprovada", "formando", "aguardando_aprovacao"]) : q.eq("situacao", "aprovada");
  const r = await q.order("nome").overrideTypes<LinhaEquipe[], { merge: false }>();
  return completar(cliente, edicaoId, exigir(r, "as equipes") ?? []);
}

export async function buscarEquipe(cliente: Cliente, id: string): Promise<Equipe | null> {
  const r = await cliente.from("equipes").select(SELECT_EQUIPE).eq("id", id).is("removido_em", null).maybeSingle<LinhaEquipe>();
  const linha = exigir(r, "a equipe");
  return linha ? (await completar(cliente, linha.edicao_id, [linha]))[0] : null;
}

/**
 * Equipe ativa do aluno na edição (confirmado ou com convite aguardando), ou null.
 * Inclui propostas em formação e aguardando aprovação.
 */
export async function equipeDoAluno(cliente: Cliente, email: string, edicaoId: string): Promise<Equipe | null> {
  const r = await cliente
    .from("membros")
    .select("equipe_id")
    .eq("email", email)
    .eq("edicao_id", edicaoId)
    .is("saiu_em", null)
    .maybeSingle();
  const id = exigir(r, "a sua equipe")?.equipe_id;
  return id ? buscarEquipe(cliente, id) : null;
}

/** Propostas que a organização ainda precisa analisar (e as que estão em formação). */
export async function listarPropostas(cliente: Cliente, edicaoId: string): Promise<Equipe[]> {
  const r = await cliente
    .from("equipes")
    .select(SELECT_EQUIPE)
    .eq("edicao_id", edicaoId)
    .is("removido_em", null)
    .in("situacao", ["formando", "aguardando_aprovacao"])
    .order("criado_em")
    .overrideTypes<LinhaEquipe[], { merge: false }>();
  return completar(cliente, edicaoId, exigir(r, "as propostas de equipe") ?? []);
}

/** Equipes aprovadas da edição com o número de integrantes. */
export async function listarResumo(cliente: Cliente, edicaoId: string): Promise<EquipeResumo[]> {
  const r = await cliente
    .from("equipes")
    .select("id, nome, membros(saiu_em)")
    .eq("edicao_id", edicaoId)
    .eq("situacao", "aprovada")
    .is("removido_em", null)
    .order("nome")
    .overrideTypes<{ id: string; nome: string; membros: { saiu_em: string | null }[] }[], { merge: false }>();
  return (exigir(r, "a lista de equipes") ?? []).map((e) => ({ id: e.id, nome: e.nome, total: e.membros.filter((m) => !m.saiu_em).length }));
}

export async function contarEquipes(cliente: Cliente, edicaoId: string): Promise<number> {
  const { count } = await cliente
    .from("equipes")
    .select("*", { count: "exact", head: true })
    .eq("edicao_id", edicaoId)
    .eq("situacao", "aprovada")
    .is("removido_em", null);
  return count ?? 0;
}

// ---------------------------------------------------------------- gravação

export const criarEquipe = (cliente: Cliente, edicaoId: string, nome: string, repo: string) =>
  cliente.rpc("criar_equipe", { p_nome: nome, p_repo: repo, p_edicao: edicaoId });

/** Atualiza campos da equipe. `alterou` = false quando o banco recusou em silêncio (RLS). */
export async function atualizarEquipe(
  cliente: Cliente,
  id: string,
  dados: { nome?: string; repo_github?: string; repo_publico?: boolean | null; repo_verificado_em?: string | null; lider_email?: string | null },
) {
  const { data, error } = await cliente.from("equipes").update(dados).eq("id", id).select("id");
  return { alterou: !!data?.length, error };
}

export const arquivarEquipe = (cliente: Cliente, id: string) => cliente.rpc("arquivar_equipe", { p_equipe: id });

export async function adicionarMembro(cliente: Cliente, edicaoId: string, equipeId: string, email: string) {
  const { error } = await cliente.from("membros").insert({ edicao_id: edicaoId, email, equipe_id: equipeId });
  return { error };
}

export const removerMembro = (cliente: Cliente, equipeId: string, email: string) =>
  cliente.rpc("remover_integrante", { p_equipe: equipeId, p_email: email });

export async function adicionarLink(
  cliente: Cliente,
  link: { equipe_id: string; categoria: string; titulo: string | null; url: string; criado_por: string | null },
) {
  const { error } = await cliente.from("links").insert(link);
  return { error };
}

/** Arquiva o link e devolve os dados dele (para poder desfazer). */
export async function removerLink(cliente: Cliente, id: string, removidoPor: string | null) {
  const { data, error } = await cliente
    .from("links")
    .update({ removido_em: new Date().toISOString(), removido_por: removidoPor })
    .eq("id", id)
    .is("removido_em", null)
    .select("equipe_id, categoria, titulo, url")
    .overrideTypes<(Omit<LinkEntrega, "id"> & { equipe_id: string })[], { merge: false }>();
  return { removido: data?.[0] ?? null, error };
}

/** Grava as equipes montadas pelo gerador numa transação só (RPC aplicar_equipes). */
export const aplicarEquipes = (cliente: Cliente, edicaoId: string, equipes: { nome: string; emails: string[] }[], substituir: boolean) =>
  cliente.rpc("aplicar_equipes", { p_equipes: equipes as Json, p_substituir: substituir, p_edicao: edicaoId });

// ---------------------------------------------------------------- proposta de equipe (alunos)

export const proporEquipe = (cliente: Cliente, nome: string, emails: string[], repo: string | null, como?: string) =>
  cliente.rpc("propor_equipe", { p_nome: nome, p_emails: emails, p_repo: repo ?? undefined, p_como: como });

export const convidarIntegrante = (cliente: Cliente, equipeId: string, email: string, como?: string) =>
  cliente.rpc("convidar_integrante", { p_equipe: equipeId, p_email: email, p_como: como });

export const responderConvite = (cliente: Cliente, equipeId: string, aceitar: boolean, como?: string) =>
  cliente.rpc("responder_convite", { p_equipe: equipeId, p_aceitar: aceitar, p_como: como });

export const cancelarProposta = (cliente: Cliente, equipeId: string, como?: string) =>
  cliente.rpc("cancelar_proposta", { p_equipe: equipeId, p_como: como });

export const analisarEquipe = (cliente: Cliente, equipeId: string, aprovar: boolean, motivo: string | null) =>
  cliente.rpc("analisar_equipe", { p_equipe: equipeId, p_aprovar: aprovar, p_motivo: motivo ?? undefined });

/** Última proposta do aluno recusada pela organização nesta edição (para mostrar o motivo). */
export async function ultimaRecusa(cliente: Cliente, email: string, edicaoId: string): Promise<{ nome: string; motivo: string | null } | null> {
  const r = await cliente
    .from("membros")
    .select("saiu_em, equipe:equipes(nome, motivo_analise)")
    .eq("email", email)
    .eq("edicao_id", edicaoId)
    .eq("motivo_saida", "equipe_recusada")
    .order("saiu_em", { ascending: false })
    .limit(1)
    .overrideTypes<{ saiu_em: string; equipe: { nome: string; motivo_analise: string | null } | null }[], { merge: false }>();
  const linha = exigir(r, "as propostas recusadas")?.[0];
  return linha?.equipe ? { nome: linha.equipe.nome, motivo: linha.equipe.motivo_analise } : null;
}
