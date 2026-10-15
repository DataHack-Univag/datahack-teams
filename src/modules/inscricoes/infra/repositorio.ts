import type { Campo, PerguntaCatalogo } from "@/modules/inscricoes/domain/campos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";
import type { Json } from "@/shared/db/tipos-banco";

// Perguntas de inscrição: o banco de perguntas prontas e as perguntas de cada edição.

const COLUNAS = "chave, rotulo, ajuda, tipo, opcoes, condicao, obrigatorio, sensivel";

export async function carregarCatalogo(cliente: Cliente): Promise<PerguntaCatalogo[]> {
  const r = await cliente
    .from("perguntas_catalogo")
    .select("grupo, chave, rotulo, ajuda, tipo, opcoes, condicao, sensivel, traz")
    .is("removido_em", null)
    .order("ordem")
    .overrideTypes<Omit<PerguntaCatalogo, "obrigatorio">[], { merge: false }>();
  return (exigir(r, "o banco de perguntas") ?? []).map((p) => ({ ...p, obrigatorio: true }));
}

/** As perguntas ativas da edição, na ordem do formulário. */
export async function camposDaEdicao(cliente: Cliente, edicaoId: string): Promise<Campo[]> {
  const r = await cliente
    .from("campos_inscricao")
    .select(COLUNAS)
    .eq("edicao_id", edicaoId)
    .is("removido_em", null)
    .order("ordem")
    .overrideTypes<Campo[], { merge: false }>();
  return exigir(r, "as perguntas da inscrição") ?? [];
}

/** Quantas inscrições a edição tem (para avisar antes de mudar o formulário). */
export async function contarInscricoes(cliente: Cliente, edicaoId: string): Promise<number> {
  const r = await cliente.from("inscricoes").select("id", { count: "exact", head: true }).eq("edicao_id", edicaoId).neq("situacao", "cancelada");
  return r.count ?? 0;
}

/** Salva o formulário inteiro (o banco arquiva o que saiu e confere as condições). */
export const definirCampos = (cliente: Cliente, edicaoId: string, campos: Campo[]) =>
  cliente.rpc("definir_campos_inscricao", { p_edicao: edicaoId, p_campos: campos as unknown as Json });
