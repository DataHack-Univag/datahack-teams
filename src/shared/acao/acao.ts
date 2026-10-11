import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { falha, type Resultado } from "@/shared/acao/resultado";

/** Assinatura das ações usadas com useActionState / <Formulario>. */
export type Acao = (estado: Resultado, fd: FormData) => Promise<Resultado>;

/** Converte o FormData em objeto simples (campos repetidos ficam com o último valor). */
export function lerFormulario(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string") obj[k] = v;
  });
  return obj;
}

/**
 * Monta uma Server Action: valida a entrada com o esquema (mensagens em português),
 * executa e transforma qualquer falha inesperada em mensagem amigável.
 * redirect()/notFound() continuam funcionando (são relançados).
 */
export function criarAcao<E extends z.ZodType>(
  esquema: E,
  /** `formulario`: o FormData original, para campos repetidos (ex.: vários e-mails). */
  executar: (dados: z.infer<E>, bruto: Record<string, string>, formulario: FormData) => Promise<Resultado>,
): Acao {
  return async (_estado, fd) => {
    const bruto = lerFormulario(fd);
    const lido = esquema.safeParse(bruto);
    if (!lido.success) return falha(lido.error.issues[0]?.message ?? "Confira os campos do formulário.");
    try {
      return await executar(lido.data, bruto, fd);
    } catch (e) {
      unstable_rethrow(e);
      console.error(e);
      return falha("Não foi possível concluir agora. Tente de novo em instantes; se continuar, avise a organização.");
    }
  };
}

/** Depois de gravar: atualiza todas as telas abertas com os dados novos. */
export function atualizarTelas() {
  revalidatePath("/", "layout");
}
