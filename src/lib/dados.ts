import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Configuracao, Equipe, Inscrito, Material, Participante } from "@/lib/tipos";

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

  const { data: email } = await supabase.rpc("email_atual");
  const { data: inscrito } = await supabase
    .from("inscritos")
    .select("email, nome, curso, semestre, papel")
    .eq("email", email as string)
    .maybeSingle<Inscrito>();

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
