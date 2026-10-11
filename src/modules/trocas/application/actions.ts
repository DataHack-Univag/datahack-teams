"use server";

import { z } from "zod";
import * as repo from "@/modules/trocas/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { id, textoOpcional } from "@/shared/acao/campos";
import { falha, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

// "como": e-mail do aluno no modo "ver como" da organização (o banco ignora quando quem age é aluno).
const como = z
  .string()
  .optional()
  .transform((v) => v?.trim().toLowerCase() || undefined);

export const pedirTroca = criarAcao(
  z.object({ equipe_destino: z.string().min(1, "Escolha a equipe para onde quer ir."), mensagem: textoOpcional(200), como }),
  async (d) => {
    const { error } = await repo.pedirTroca(await clienteServidor(), d.equipe_destino, d.mensagem, d.como);
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    return sucesso("Pedido enviado. Agora é só aguardar alguém da equipe aceitar: o aviso aparece aqui.");
  },
);

export const cancelarTroca = criarAcao(z.object({ id, como }), async (d) => {
  const { error } = await repo.cancelarTroca(await clienteServidor(), d.id, d.como);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Pedido cancelado.");
});

export const recusarTroca = criarAcao(z.object({ id, como }), async (d) => {
  const { error } = await repo.recusarTroca(await clienteServidor(), d.id, d.como);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Pedido recusado. Ninguém trocou de equipe.");
});

export const aceitarTroca = criarAcao(z.object({ id, como }), async (d) => {
  const { data, error } = await repo.aceitarTroca(await clienteServidor(), d.id, d.como);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  // A função devolve "ok" ou a explicação de por que não deu para trocar.
  return data === "ok" ? sucesso("Troca feita! Você está na nova equipe.") : falha(String(data));
});
