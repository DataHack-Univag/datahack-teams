// Repositório das edições do evento.

import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";
import type { Json } from "@/shared/db/tipos-banco";

/** Edições que a pessoa logada pode ver (as em que participa; a organização vê as que organiza). */
export async function listarEdicoes(cliente: Cliente): Promise<Edicao[]> {
  const r = await cliente.from("edicoes").select("*").order("numero", { ascending: false }).overrideTypes<Edicao[], { merge: false }>();
  return exigir(r, "as edições") ?? [];
}

export type DadosEdicao = Partial<
  Pick<
    Edicao,
    | "nome"
    | "descricao"
    | "formato"
    | "local"
    | "data_inicio"
    | "data_fim"
    | "situacao"
    | "modo_formacao"
    | "permite_trocas"
    | "min_membros"
    | "max_membros"
    | "equipes_travadas"
    | "avaliacao_encerrada"
    | "motivo_cancelamento"
  >
>;

export async function atualizarEdicao(cliente: Cliente, id: string, dados: DadosEdicao) {
  const { data, error } = await cliente.from("edicoes").update(dados).eq("id", id).select("id");
  return { alterou: !!data?.length, error };
}

export const criarEdicao = (cliente: Cliente, dados: Record<string, unknown>, copiarDe?: string) =>
  cliente.rpc("criar_edicao", { p_dados: dados as Json, p_copiar_de: copiarDe });

export const definirEdicaoAtual = (cliente: Cliente, id: string) => cliente.rpc("definir_edicao_atual", { p_edicao: id });

export const definirRegulamento = (cliente: Cliente, id: string, json: unknown) =>
  cliente.rpc("definir_regulamento", { p_edicao: id, p_json: json as Json });

/** Troca o regulamento inteiro (só sem fichas); o anterior vai para o histórico. */
export const substituirRegulamento = (cliente: Cliente, id: string, json: unknown) =>
  cliente.rpc("substituir_regulamento", { p_edicao: id, p_json: json as Json });

/** Quantas equipes, alunos e fichas cada edição tem (painel de edições). */
export async function resumoEdicoes(cliente: Cliente): Promise<Map<string, { alunos: number; equipes: number; fichas: number }>> {
  const [p, e, f] = await Promise.all([
    cliente.from("participacoes").select("edicao_id").eq("papel", "aluno").is("removido_em", null),
    cliente.from("equipes").select("edicao_id").is("removido_em", null).eq("situacao", "aprovada"),
    cliente.from("fichas").select("edicao_id").is("removido_em", null),
  ]);
  const mapa = new Map<string, { alunos: number; equipes: number; fichas: number }>();
  const soma = (id: string, k: "alunos" | "equipes" | "fichas") => {
    const atual = mapa.get(id) ?? { alunos: 0, equipes: 0, fichas: 0 };
    atual[k]++;
    mapa.set(id, atual);
  };
  for (const x of exigir(p, "os participantes") ?? []) soma(x.edicao_id, "alunos");
  for (const x of exigir(e, "as equipes") ?? []) soma(x.edicao_id, "equipes");
  for (const x of exigir(f, "as fichas") ?? []) soma(x.edicao_id, "fichas");
  return mapa;
}
