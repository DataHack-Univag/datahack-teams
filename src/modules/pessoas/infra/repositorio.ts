// Repositório de pessoas: cadastro único (pessoas) + participação por edição (participacoes)
// + nota média por edição (notas). Única parte do módulo que conhece o Supabase.

import type { Papel } from "@/modules/pessoas/domain/papeis";
import type { Inscrito, Participante, Presenca } from "@/modules/pessoas/domain/tipos";
import { exigir, type ErroBanco } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

type LinhaParticipacao = {
  email: string;
  papel: Papel;
  curso: string | null;
  semestre: number | null;
  pessoa: { nome: string } | null;
  banca: { codigo: string } | null;
  presenca: Presenca | null;
};

const SELECT_PARTICIPACAO = "email, papel, curso, semestre, presenca, pessoa:pessoas(nome), banca:bancas(codigo)";

const paraInscrito = (p: LinhaParticipacao): Inscrito => ({
  email: p.email,
  nome: p.pessoa?.nome ?? p.email,
  curso: p.curso,
  semestre: p.semestre,
  papel: p.papel,
  banca: p.banca?.codigo ?? null,
  presenca: p.presenca ?? null,
});

/** A pessoa como participante de uma edição (null se não participa). */
export async function buscarInscrito(cliente: Cliente, email: string, edicaoId: string): Promise<Inscrito | null> {
  const { data } = await cliente
    .from("participacoes")
    .select(SELECT_PARTICIPACAO)
    .eq("edicao_id", edicaoId)
    .eq("email", email)
    .is("removido_em", null)
    .maybeSingle<LinhaParticipacao>();
  return data ? paraInscrito(data) : null;
}

/** Edições de que a pessoa participa (id → papel), para escolher a edição da sessão. */
export async function participacoesDe(cliente: Cliente, email: string): Promise<{ edicao_id: string; papel: Papel }[]> {
  const r = await cliente
    .from("participacoes")
    .select("edicao_id, papel")
    .eq("email", email)
    .is("removido_em", null)
    .overrideTypes<{ edicao_id: string; papel: Papel }[], { merge: false }>();
  return exigir(r, "as suas participações") ?? [];
}

/** E-mail do usuário logado já normalizado pelo banco (Gmail com/sem pontos). */
export async function emailNormalizado(cliente: Cliente): Promise<string | null> {
  const { data } = await cliente.rpc("email_atual");
  return data ?? null;
}

/** Todos os participantes da edição com nota e equipe. Só a organização lê as notas (RLS). */
export async function listarParticipantes(cliente: Cliente, edicaoId: string): Promise<Participante[]> {
  const [rPart, rNotas, rMembros] = await Promise.all([
    cliente
      .from("participacoes")
      .select(SELECT_PARTICIPACAO)
      .eq("edicao_id", edicaoId)
      .is("removido_em", null)
      .overrideTypes<LinhaParticipacao[], { merge: false }>(),
    cliente.from("notas").select("email, nota").eq("edicao_id", edicaoId),
    cliente
      .from("membros")
      .select("email, equipe_id, equipes(nome)")
      .eq("edicao_id", edicaoId)
      .is("saiu_em", null)
      .eq("situacao", "confirmado")
      .overrideTypes<{ email: string; equipe_id: string; equipes: { nome: string } | null }[], { merge: false }>(),
  ]);
  const participacoes = exigir(rPart, "os participantes") ?? [];
  const notas = exigir(rNotas, "as notas") ?? [];
  const membros = exigir(rMembros, "as equipes dos participantes") ?? [];
  const notaDe = new Map(notas.map((n) => [n.email, n.nota === null ? null : Number(n.nota)]));
  const equipeDe = new Map(membros.map((m) => [m.email, m]));
  return participacoes
    .map(paraInscrito)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((i) => ({
      ...i,
      nota: notaDe.get(i.email) ?? null,
      equipe_id: equipeDe.get(i.email)?.equipe_id ?? null,
      equipe_nome: equipeDe.get(i.email)?.equipes?.nome ?? null,
    }));
}

/** Alunos da edição que ainda não estão em nenhuma equipe (nem com convite aguardando). */
export async function listarSemEquipe(cliente: Cliente, edicaoId: string): Promise<Inscrito[]> {
  const [rPart, rMembros] = await Promise.all([
    cliente
      .from("participacoes")
      .select(SELECT_PARTICIPACAO)
      .eq("edicao_id", edicaoId)
      .eq("papel", "aluno")
      .is("removido_em", null)
      .overrideTypes<LinhaParticipacao[], { merge: false }>(),
    cliente.from("membros").select("email").eq("edicao_id", edicaoId).is("saiu_em", null),
  ]);
  const ocupados = new Set((exigir(rMembros, "as equipes") ?? []).map((m) => m.email));
  return (exigir(rPart, "os alunos sem equipe") ?? [])
    .filter((p) => !ocupados.has(p.email))
    .map(paraInscrito)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Lista leve para busca rápida (paleta de comandos e "ver como"). */
export async function listarPessoasResumo(cliente: Cliente, edicaoId: string): Promise<Pick<Inscrito, "email" | "nome" | "papel" | "banca">[]> {
  const r = await cliente
    .from("participacoes")
    .select(SELECT_PARTICIPACAO)
    .eq("edicao_id", edicaoId)
    .is("removido_em", null)
    .overrideTypes<LinhaParticipacao[], { merge: false }>();
  return (exigir(r, "a lista de pessoas") ?? []).map(paraInscrito).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function contarAlunos(cliente: Cliente, edicaoId: string): Promise<number> {
  const { count } = await cliente
    .from("participacoes")
    .select("*", { count: "exact", head: true })
    .eq("edicao_id", edicaoId)
    .eq("papel", "aluno")
    .is("removido_em", null);
  return count ?? 0;
}

// ---------------------------------------------------------------- gravação

/** Cria ou atualiza o cadastro da pessoa e a participação dela na edição. */
export async function salvarParticipacao(
  cliente: Cliente,
  edicaoId: string,
  dados: { email: string; nome: string; curso: string | null; semestre: number | null; papel: Papel; bancaId: string | null },
  emailOriginal?: string,
): Promise<ErroBanco | null> {
  // Troca de e-mail: o cadastro muda e as referências acompanham (on update cascade).
  if (emailOriginal && emailOriginal !== dados.email) {
    const { error } = await cliente.from("pessoas").update({ email: dados.email, nome: dados.nome }).eq("email", emailOriginal);
    if (error) return error;
  } else {
    const { error } = await cliente.from("pessoas").upsert({ email: dados.email, nome: dados.nome, removido_em: null }, { onConflict: "email" });
    if (error) return error;
  }
  const { error } = await cliente.from("participacoes").upsert(
    {
      edicao_id: edicaoId,
      email: dados.email,
      papel: dados.papel,
      banca_id: dados.bancaId,
      curso: dados.curso,
      semestre: dados.semestre,
      removido_em: null,
    },
    { onConflict: "edicao_id,email" },
  );
  return error;
}

export async function salvarNota(cliente: Cliente, edicaoId: string, email: string, nota: number | null): Promise<ErroBanco | null> {
  const { error } = await cliente.from("notas").upsert({ edicao_id: edicaoId, email, nota }, { onConflict: "edicao_id,email" });
  return error;
}

/** Tira a pessoa da edição (arquiva a participação; nada é apagado). */
export async function arquivarParticipacao(cliente: Cliente, edicaoId: string, email: string) {
  const { data, error } = await cliente
    .from("participacoes")
    .update({ removido_em: new Date().toISOString() })
    .eq("edicao_id", edicaoId)
    .eq("email", email)
    .is("removido_em", null)
    .select("email");
  return { removeu: !!data?.length, error };
}

/** Restaura a participação arquivada (o "Desfazer" do remover). */
export async function restaurarParticipacao(cliente: Cliente, edicaoId: string, email: string) {
  const { data, error } = await cliente
    .from("participacoes")
    .update({ removido_em: null })
    .eq("edicao_id", edicaoId)
    .eq("email", email)
    .select("email");
  return { restaurou: !!data?.length, error };
}

export async function mudarFuncao(cliente: Cliente, edicaoId: string, email: string, papel: Papel, bancaId: string | null) {
  const { data, error } = await cliente
    .from("participacoes")
    .update({ papel, banca_id: bancaId })
    .eq("edicao_id", edicaoId)
    .eq("email", email)
    .select("email");
  return { mudou: !!data?.length, error };
}

/** id da banca pelo código (na edição). */
export async function idDaBanca(cliente: Cliente, edicaoId: string, codigo: string | null): Promise<string | null> {
  if (!codigo) return null;
  const { data } = await cliente.from("bancas").select("id").eq("edicao_id", edicaoId).eq("codigo", codigo).maybeSingle();
  return data?.id ?? null;
}

/** id da banca da organização na edição. */
export async function idDaBancaOrganizacao(cliente: Cliente, edicaoId: string): Promise<string | null> {
  const { data } = await cliente.from("bancas").select("id").eq("edicao_id", edicaoId).eq("da_organizacao", true).limit(1).maybeSingle();
  return data?.id ?? null;
}
