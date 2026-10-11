import type { Material } from "@/modules/materiais/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

const COLUNAS = "id, titulo, descricao, categoria, url, destaque, criado_em";

/** Materiais publicados (destaques primeiro, depois na ordem em que foram publicados). */
export async function listarMateriais(cliente: Cliente): Promise<Material[]> {
  const r = await cliente
    .from("materiais")
    .select(COLUNAS)
    .order("destaque", { ascending: false })
    .order("criado_em", { ascending: true })
    .overrideTypes<Material[], { merge: false }>();
  return exigir(r, "os materiais") ?? [];
}

type Dados = Pick<Material, "titulo" | "descricao" | "categoria" | "url" | "destaque">;

export async function salvarMaterial(cliente: Cliente, dados: Dados, id: string | null, criadoPor: string | null) {
  const { error } = id
    ? await cliente.from("materiais").update(dados).eq("id", id)
    : await cliente.from("materiais").insert({ ...dados, criado_por: criadoPor });
  return { error };
}

/** Remove e devolve os dados (para desfazer). */
export async function removerMaterial(cliente: Cliente, id: string) {
  const { data, error } = await cliente
    .from("materiais")
    .delete()
    .eq("id", id)
    .select("titulo, descricao, categoria, url, destaque")
    .overrideTypes<Dados[], { merge: false }>();
  return { removido: data?.[0] ?? null, error };
}
