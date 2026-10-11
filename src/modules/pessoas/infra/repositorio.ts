// Repositório de pessoas (tabelas inscritos e notas). Única parte do módulo que conhece o Supabase.

import type { Papel } from "@/modules/pessoas/domain/papeis";
import type { Inscrito, Participante } from "@/modules/pessoas/domain/tipos";
import { exigir, type ErroBanco } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

const COLUNAS = "email, nome, curso, semestre, papel";

export async function buscarInscrito(cliente: Cliente, email: string): Promise<Inscrito | null> {
  const { data } = await cliente.from("inscritos").select(COLUNAS).eq("email", email).maybeSingle<Inscrito>();
  return data ?? null;
}

/** E-mail do usuário logado já normalizado pelo banco (Gmail com/sem pontos). */
export async function emailNormalizado(cliente: Cliente): Promise<string | null> {
  const { data } = await cliente.rpc("email_atual");
  return data ?? null;
}

/** Todos os inscritos com nota e equipe. Só a organização consegue ler as notas (RLS). */
export async function listarParticipantes(cliente: Cliente): Promise<Participante[]> {
  const [rInscritos, rNotas, rMembros] = await Promise.all([
    cliente.from("inscritos").select(COLUNAS).order("nome").overrideTypes<Inscrito[], { merge: false }>(),
    cliente.from("notas").select("email, nota"),
    cliente
      .from("membros")
      .select("email, equipe_id, equipes(nome)")
      .overrideTypes<{ email: string; equipe_id: string; equipes: { nome: string } | null }[], { merge: false }>(),
  ]);
  const inscritos = exigir(rInscritos, "os participantes") ?? [];
  const notas = exigir(rNotas, "as notas") ?? [];
  const membros = exigir(rMembros, "as equipes dos participantes") ?? [];
  const notaDe = new Map(notas.map((n) => [n.email, n.nota === null ? null : Number(n.nota)]));
  const equipeDe = new Map(membros.map((m) => [m.email, m]));
  return inscritos.map((i) => ({
    ...i,
    nota: notaDe.get(i.email) ?? null,
    equipe_id: equipeDe.get(i.email)?.equipe_id ?? null,
    equipe_nome: equipeDe.get(i.email)?.equipes?.nome ?? null,
  }));
}

/** Alunos que ainda não estão em nenhuma equipe. */
export async function listarSemEquipe(cliente: Cliente): Promise<Inscrito[]> {
  const data = exigir(
    await cliente
      .from("inscritos")
      .select(`${COLUNAS}, membros(equipe_id)`)
      .eq("papel", "aluno")
      .order("nome")
      .overrideTypes<(Inscrito & { membros: { equipe_id: string }[] | { equipe_id: string } | null })[], { merge: false }>(),
    "os inscritos sem equipe",
  );
  return (data ?? [])
    .filter((i) => !i.membros || (Array.isArray(i.membros) && i.membros.length === 0))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- descarta o campo do join
    .map(({ membros: _membros, ...i }) => i);
}

/** Lista leve para busca rápida (paleta de comandos e "ver como"). */
export async function listarPessoasResumo(cliente: Cliente): Promise<Pick<Inscrito, "email" | "nome" | "papel">[]> {
  const r = await cliente.from("inscritos").select("email, nome, papel").order("nome").overrideTypes<Pick<Inscrito, "email" | "nome" | "papel">[], { merge: false }>();
  return exigir(r, "a lista de pessoas") ?? [];
}

export async function contarAlunos(cliente: Cliente): Promise<number> {
  const { count } = await cliente.from("inscritos").select("*", { count: "exact", head: true }).eq("papel", "aluno");
  return count ?? 0;
}

// ---------------------------------------------------------------- gravação

type Dados = Omit<Inscrito, "papel"> & { papel: Papel };

/** Cria, edita (emailOriginal) ou promove (sobrescrever) um inscrito. */
export async function salvarInscrito(
  cliente: Cliente,
  dados: Dados,
  modo: { emailOriginal?: string; sobrescrever?: boolean },
): Promise<ErroBanco | null> {
  const { error } = modo.emailOriginal
    ? await cliente.from("inscritos").update(dados).eq("email", modo.emailOriginal)
    : modo.sobrescrever
      ? await cliente.from("inscritos").upsert(dados, { onConflict: "email" })
      : await cliente.from("inscritos").insert(dados);
  return error;
}

export async function salvarNota(cliente: Cliente, email: string, nota: number | null): Promise<ErroBanco | null> {
  const { error } = await cliente.from("notas").upsert({ email, nota }, { onConflict: "email" });
  return error;
}

/** Devolve true se removeu (false = o banco não deixou). */
export async function removerInscrito(cliente: Cliente, email: string) {
  const { data, error } = await cliente.from("inscritos").delete().eq("email", email).select("email");
  return { removeu: !!data?.length, error };
}

export async function mudarPapel(cliente: Cliente, email: string, papel: Papel) {
  const { data, error } = await cliente.from("inscritos").update({ papel }).eq("email", email).select("email");
  return { mudou: !!data?.length, error };
}
