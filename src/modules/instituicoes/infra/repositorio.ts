import type { Instituicao, MarcaEdicao } from "@/modules/instituicoes/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";
import type { Json } from "@/shared/db/tipos-banco";

// Instituições (globais) e as que participam de cada edição.

const COLUNAS = "id, nome, sigla, cidade, uf, tipo, site, logo_svg, removido_em";

/** Todas as instituições ativas, por nome (com `arquivadas`, também as retiradas, no fim). */
export async function listarInstituicoes(cliente: Cliente, { arquivadas = false } = {}): Promise<Instituicao[]> {
  let q = cliente.from("instituicoes").select(COLUNAS).order("removido_em", { nullsFirst: true }).order("nome");
  if (!arquivadas) q = q.is("removido_em", null);
  const r = await q.overrideTypes<Instituicao[], { merge: false }>();
  return exigir(r, "as instituições") ?? [];
}

/**
 * Instituições da edição, na ordem escolhida. É um extra das telas (logo no cabeçalho):
 * se o banco ainda não tem a migração 017, as telas seguem sem ele.
 */
export async function instituicoesDaEdicao(cliente: Cliente, edicaoId: string): Promise<Instituicao[]> {
  const r = await cliente
    .from("edicao_instituicoes")
    .select(`ordem, instituicoes (${COLUNAS})`)
    .eq("edicao_id", edicaoId)
    .is("removido_em", null)
    .order("ordem");
  if (r.error) return [];
  return (r.data ?? []).flatMap((x) => (x.instituicoes ? [x.instituicoes as Instituicao] : []));
}

export type DadosInstituicao = Pick<Instituicao, "nome" | "sigla" | "cidade" | "uf" | "tipo" | "site"> & { logo_svg?: string | null };

export const criarInstituicao = (cliente: Cliente, dados: DadosInstituicao) => cliente.from("instituicoes").insert(dados).select("id").single();

export const atualizarInstituicao = (cliente: Cliente, id: string, dados: Partial<DadosInstituicao>) =>
  cliente.from("instituicoes").update(dados).eq("id", id).select("id");

export const arquivarInstituicao = (cliente: Cliente, id: string, arquivar: boolean) =>
  cliente
    .from("instituicoes")
    .update({ removido_em: arquivar ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");

export type DadosAcesso = {
  acesso: string;
  aprovacao: string;
  vagas: number | null;
  inscricao_abre_em: string | null;
  inscricao_fecha_em: string | null;
  marca: MarcaEdicao;
};

/** Acesso, marca e instituições da edição de uma vez (o banco confere as regras). */
export const definirAcessoEdicao = (cliente: Cliente, edicaoId: string, dados: DadosAcesso, instituicoes: string[]) =>
  cliente.rpc("definir_acesso_edicao", { p_edicao: edicaoId, p_dados: dados as unknown as Json, p_instituicoes: instituicoes });

/** Em quais edições (números) cada instituição participa. */
export async function edicoesPorInstituicao(cliente: Cliente): Promise<Map<string, number[]>> {
  const r = await cliente.from("edicao_instituicoes").select("instituicao_id, edicoes (numero)").is("removido_em", null);
  const mapa = new Map<string, number[]>();
  for (const x of exigir(r, "as instituições das edições") ?? []) {
    const n = x.edicoes?.numero;
    if (n) mapa.set(x.instituicao_id, [...(mapa.get(x.instituicao_id) ?? []), n].sort((a, b) => a - b));
  }
  return mapa;
}
