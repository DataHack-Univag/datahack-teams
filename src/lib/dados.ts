import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Configuracao, Equipe, EquipeResumo, Inscrito, Material, Participante, Troca } from "@/lib/tipos";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Códigos de "coluna/tabela não existe": quase sempre falta rodar uma migração SQL.
const FALTA_MIGRACAO = ["42703", "42P01", "PGRST204", "PGRST205"];

/**
 * Erro de consulta vira exceção (aparece na tela) em vez de lista vazia silenciosa.
 */
export function exigir<T>(r: { data: T; error: { message: string; code?: string } | null }, contexto: string): T {
  if (r.error) {
    const dica = FALTA_MIGRACAO.includes(r.error.code ?? "")
      ? " Provavelmente falta rodar uma migração (supabase/00X_*.sql) no SQL Editor do Supabase."
      : "";
    throw new Error(`Erro ao carregar ${contexto}: ${r.error.message}.${dica}`);
  }
  return r.data;
}

export const SELECT_EQUIPE =
  "id, nome, repo_github, repo_publico, repo_verificado_em, lider_email, criado_em, atualizado_em," +
  " membros(email, inscritos(nome, curso, semestre))," +
  " links(id, categoria, titulo, url)";

/**
 * Carrega o usuário logado e seu registro na lista de inscritos.
 * Quem está logado mas não consta na lista é deslogado.
 */
export const sessaoAtual = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  // Caminho rápido: o e-mail do login quase sempre é igual ao da lista (1 consulta).
  // Só se não achar, normaliza (Gmail com/sem pontos) via email_atual() (2 consultas).
  const buscar = (email: string) =>
    supabase.from("inscritos").select("email, nome, curso, semestre, papel").eq("email", email).maybeSingle<Inscrito>();
  const emailLogin = String(claims.claims.email ?? "").toLowerCase();
  let { data: inscrito } = await buscar(emailLogin);
  if (!inscrito) {
    const { data: email } = await supabase.rpc("email_atual");
    if (email && email !== emailLogin) ({ data: inscrito } = await buscar(email as string));
  }

  if (!inscrito) {
    await supabase.auth.signOut();
    redirect("/login?erro=nao_inscrito");
  }

  const meta = (claims.claims.user_metadata ?? {}) as Record<string, string>;
  return {
    supabase,
    inscrito,
    avatar: meta.avatar_url ?? meta.picture ?? null,
    organizador: inscrito.papel === "organizador",
  };
});

export async function carregarConfiguracao(
  supabase: Cliente,
): Promise<Configuracao> {
  const data = exigir(
    await supabase
      .from("configuracao")
      .select("max_membros, edicao_bloqueada")
      .eq("id", 1)
      .maybeSingle<Configuracao>(),
    "configuração",
  );
  return data ?? { max_membros: 5, edicao_bloqueada: false };
}

export async function carregarEquipe(
  supabase: Cliente,
  id: string,
) {
  return exigir(
    await supabase
      .from("equipes")
      .select(SELECT_EQUIPE)
      .eq("id", id)
      .order("criado_em", { referencedTable: "links" })
      .maybeSingle<Equipe>(),
    "equipe",
  );
}

/** Equipe de um aluno numa consulta só (membros → equipes), ou null se não tem equipe. */
export async function carregarEquipeDoAluno(supabase: Cliente, email: string) {
  const r = exigir(
    await supabase
      .from("membros")
      .select(`equipes(${SELECT_EQUIPE})`)
      .eq("email", email)
      .maybeSingle<{ equipes: Equipe | null }>(),
    "equipe do aluno",
  );
  return r?.equipes ?? null;
}

/** Inscritos (alunos) que ainda não estão em nenhuma equipe. */
export async function carregarSemEquipe(supabase: Cliente) {
  const data = exigir(
    await supabase
      .from("inscritos")
      .select("email, nome, curso, semestre, papel, membros(equipe_id)")
      .eq("papel", "aluno")
      .order("nome"),
    "inscritos sem equipe",
  );
  return ((data ?? []) as (Inscrito & { membros: unknown })[])
    .filter((i) => !i.membros || (Array.isArray(i.membros) && i.membros.length === 0))
    .map((i) => ({
      email: i.email,
      nome: i.nome,
      curso: i.curso,
      semestre: i.semestre,
      papel: i.papel,
    }));
}

/** Materiais publicados pela organização (destaques primeiro). */
export async function carregarMateriais(supabase: Cliente) {
  const data = exigir(
    await supabase
      .from("materiais")
      .select("id, titulo, descricao, categoria, url, destaque, criado_em")
      .order("destaque", { ascending: false })
      .order("criado_em", { ascending: true })
      .returns<Material[]>(),
    "materiais",
  );
  return data ?? [];
}

/** Todos os inscritos com nota e equipe. Só funciona para organizadores (RLS em notas). */
export async function carregarParticipantes(supabase: Cliente): Promise<Participante[]> {
  const [rInscritos, rNotas, rMembros] = await Promise.all([
    supabase.from("inscritos").select("email, nome, curso, semestre, papel").order("nome").returns<Inscrito[]>(),
    supabase.from("notas").select("email, nota").returns<{ email: string; nota: number | null }[]>(),
    supabase
      .from("membros")
      .select("email, equipe_id, equipes(nome)")
      .returns<{ email: string; equipe_id: string; equipes: { nome: string } | null }[]>(),
  ]);
  const inscritos = exigir(rInscritos, "participantes");
  const notas = exigir(rNotas, "notas");
  const membros = exigir(rMembros, "membros");
  const notaDe = new Map((notas ?? []).map((n) => [n.email, n.nota === null ? null : Number(n.nota)]));
  const equipeDe = new Map((membros ?? []).map((m) => [m.email, m]));
  return (inscritos ?? []).map((i) => ({
    ...i,
    nota: notaDe.get(i.email) ?? null,
    equipe_id: equipeDe.get(i.email)?.equipe_id ?? null,
    equipe_nome: equipeDe.get(i.email)?.equipes?.nome ?? null,
  }));
}

/**
 * Se a migração 006 (trocas) ainda não foi rodada, a troca de equipe simplesmente não
 * aparece, em vez de derrubar a tela do aluno. Retorna null nesse caso.
 */
function semTabelaTrocas(r: { error: { code?: string } | null }) {
  return r.error?.code === "PGRST205" || r.error?.code === "42P01";
}

const SELECT_TROCA =
  "id, solicitante, equipe_origem, equipe_destino, status, mensagem, criado_em, respondido_em," +
  " quem:inscritos!trocas_solicitante_fkey(nome)";

/** Todas as equipes com o número de integrantes (destinos possíveis de uma troca). */
export async function carregarEquipesResumo(supabase: Cliente): Promise<EquipeResumo[]> {
  const data = exigir(
    await supabase
      .from("equipes")
      .select("id, nome, membros(count)")
      .order("nome")
      .returns<{ id: string; nome: string; membros: { count: number }[] }[]>(),
    "lista de equipes",
  );
  return (data ?? []).map((e) => ({ id: e.id, nome: e.nome, total: e.membros?.[0]?.count ?? 0 }));
}

/**
 * Pedidos de troca que podem interessar a um aluno: os que ele fez (aguardando ou
 * respondidos nas últimas 24 h) e os aguardando que o RLS deixa ver (os da equipe dele).
 * Não depende da equipe, para rodar em paralelo com o resto; separe com separarTrocas().
 */
export async function carregarTrocasDoAluno(supabase: Cliente, email: string): Promise<Troca[] | null> {
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const r = await supabase
    .from("trocas")
    .select(SELECT_TROCA)
    .or(`solicitante.eq."${email}",status.eq.pendente`)
    .or(`status.eq.pendente,respondido_em.gte."${desde}"`)
    .order("criado_em", { ascending: false })
    .limit(50)
    .returns<Troca[]>();
  if (semTabelaTrocas(r)) return null;
  return exigir(r, "pedidos de troca") ?? [];
}

export function separarTrocas(lista: Troca[], email: string, equipeId: string) {
  return {
    // pedido meu aguardando resposta
    meuPedido: lista.find((t) => t.solicitante === email && t.status === "pendente") ?? null,
    // último pedido meu já respondido (para avisar "foi aceito/recusado")
    meuUltimo: lista.find((t) => t.solicitante === email && t.status !== "pendente") ?? null,
    // pedidos de outras equipes querendo entrar na minha
    recebidos: lista.filter((t) => t.equipe_destino === equipeId && t.status === "pendente" && t.solicitante !== email),
  };
}

/** Pedidos aguardando em todo o evento (visão da organização). */
export async function carregarTrocasPendentes(supabase: Cliente) {
  const r = await supabase
    .from("trocas")
    .select(SELECT_TROCA)
    .eq("status", "pendente")
    .order("criado_em", { ascending: true })
    .returns<Troca[]>();
  if (semTabelaTrocas(r)) return [];
  return exigir(r, "pedidos de troca") ?? [];
}
