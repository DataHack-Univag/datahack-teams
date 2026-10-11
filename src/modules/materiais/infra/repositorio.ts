import type { Material } from "@/modules/materiais/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

const COLUNAS = "id, titulo, descricao, categoria, url, destaque, criado_em";

/** Materiais publicados (destaques primeiro, depois na ordem em que foram publicados). */
export async function listarMateriais(cliente: Cliente, edicaoId: string): Promise<Material[]> {
  const r = await cliente
    .from("materiais")
    .select(COLUNAS)
    .eq("edicao_id", edicaoId)
    .is("removido_em", null)
    .order("destaque", { ascending: false })
    .order("criado_em", { ascending: true })
    .overrideTypes<Material[], { merge: false }>();
  return exigir(r, "os materiais") ?? [];
}

type Dados = Pick<Material, "titulo" | "descricao" | "categoria" | "url" | "destaque">;

export async function salvarMaterial(cliente: Cliente, edicaoId: string, dados: Dados, id: string | null, criadoPor: string | null) {
  const { error } = id
    ? await cliente.from("materiais").update(dados).eq("id", id)
    : await cliente.from("materiais").insert({ ...dados, edicao_id: edicaoId, criado_por: criadoPor });
  return { error };
}

/** Arquiva (não apaga) e devolve o título. */
export async function removerMaterial(cliente: Cliente, id: string) {
  const { data, error } = await cliente
    .from("materiais")
    .update({ removido_em: new Date().toISOString() })
    .eq("id", id)
    .is("removido_em", null)
    .select("titulo");
  return { removido: data?.[0] ?? null, error };
}

/** Desfaz o arquivamento. */
export async function restaurarMaterial(cliente: Cliente, id: string) {
  const { data, error } = await cliente.from("materiais").update({ removido_em: null }).eq("id", id).select("id");
  return { restaurou: !!data?.length, error };
}
