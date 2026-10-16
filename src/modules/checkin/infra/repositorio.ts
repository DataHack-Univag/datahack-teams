import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

// Check-in por QR: o código de cada participante e a leitura na entrada.

/** O código de quem está logado nesta edição (null se o banco não tiver a migração 021). */
export async function meuCodigo(cliente: Cliente, edicaoId: string): Promise<string | null> {
  const { data, error } = await cliente.rpc("meu_codigo_checkin", { p_edicao: edicaoId });
  return error ? null : (data ?? null);
}

export type ResultadoCheckin = { nome: string; email: string; papel: string; equipe: string | null; ja_estava: boolean; presenca_em: string | null };

export const fazerCheckin = (cliente: Cliente, edicaoId: string, codigo: string) =>
  cliente.rpc("fazer_checkin", { p_edicao: edicaoId, p_codigo: codigo });

export type Entrada = {
  email: string;
  nome: string;
  equipe: string | null;
  presenca: "presente" | "ausente" | null;
  presenca_em: string | null;
  /** Quem marcou (leu o QR ou marcou à mão). */
  marcado_por: string | null;
};

/** Todos os alunos da edição com a presença: quem entrou, quando, quem marcou e quem falta. */
export async function entradasDaEdicao(cliente: Cliente, edicaoId: string): Promise<Entrada[]> {
  const [rp, rm] = await Promise.all([
    cliente
      .from("participacoes")
      .select("email, presenca, presenca_em, pessoa:pessoas!participacoes_email_fkey(nome), quem:pessoas!participacoes_presenca_por_fkey(nome)")
      .eq("edicao_id", edicaoId)
      .eq("papel", "aluno")
      .is("removido_em", null),
    cliente.from("membros").select("email, equipes(nome)").eq("edicao_id", edicaoId).is("saiu_em", null).eq("situacao", "confirmado"),
  ]);
  const equipeDe = new Map((exigir(rm, "as equipes dos alunos") ?? []).map((m) => [m.email, m.equipes?.nome ?? null]));
  return (exigir(rp, "a presença dos alunos") ?? []).map((p) => ({
    email: p.email,
    nome: p.pessoa?.nome ?? p.email,
    equipe: equipeDe.get(p.email) ?? null,
    presenca: (p.presenca as Entrada["presenca"]) ?? null,
    presenca_em: p.presenca_em,
    marcado_por: p.quem?.nome ?? null,
  }));
}
