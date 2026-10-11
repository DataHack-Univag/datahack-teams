"use server";

import { z } from "zod";
import { CATEGORIAS_MATERIAL } from "@/modules/materiais/domain/tipos";
import * as repo from "@/modules/materiais/infra/repositorio";
import { emailNormalizado } from "@/modules/pessoas/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { caixa, id, texto, textoOpcional, umDe, url } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

const esquema = z.object({
  id: z.string().optional(),
  titulo: texto("o título", { min: 2, max: 120 }),
  categoria: umDe(
    CATEGORIAS_MATERIAL.map((c) => c.valor),
    "Escolha a categoria do material.",
  ),
  url,
  descricao: textoOpcional(500),
  destaque: caixa,
});

export const salvarMaterial = criarAcao(esquema, async ({ id: idMaterial, ...dados }) => {
  const cliente = await clienteServidor();
  const { error } = await repo.salvarMaterial(cliente, dados, idMaterial || null, await emailNormalizado(cliente));
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(idMaterial ? "Material atualizado." : "Material publicado. Os alunos já podem ver.");
});

export const removerMaterial = criarAcao(z.object({ id }), async (d) => {
  const { removido, error } = await repo.removerMaterial(await clienteServidor(), d.id);
  if (error) return falha(traduzirErro(error));
  if (!removido) return SEM_PERMISSAO;
  atualizarTelas();
  // Desfazer = publicar de novo com os mesmos dados.
  return sucesso(`“${removido.titulo}” removido.`, {
    titulo: removido.titulo,
    categoria: removido.categoria,
    url: removido.url,
    descricao: removido.descricao ?? "",
    destaque: removido.destaque ? "on" : "",
  });
});
