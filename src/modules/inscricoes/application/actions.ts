"use server";

import { z } from "zod";
import { conferirFormulario, type Campo } from "@/modules/inscricoes/domain/campos";
import * as repo from "@/modules/inscricoes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { id } from "@/shared/acao/campos";
import { falha, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";

/** Salva as perguntas da inscrição da edição (lista inteira, na ordem da tela). */
export const salvarFormulario = criarAcao(z.object({ id, campos: z.string().min(2, "Formulário vazio.") }), async (d) => {
  let campos: Campo[];
  try {
    campos = JSON.parse(d.campos);
    if (!Array.isArray(campos)) throw new Error();
  } catch {
    return falha("Não foi possível ler o formulário. Recarregue a página e tente de novo.");
  }
  const problemas = conferirFormulario(campos);
  if (problemas.length) return falha(problemas.join(" "));

  const { cliente } = await sessaoAtual();
  const { error } = await repo.definirCampos(cliente, d.id, campos);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(campos.length ? `Formulário salvo com ${campos.length} pergunta(s).` : "Formulário salvo: só nome e e-mail.");
});
