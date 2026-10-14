"use server";

import { z } from "zod";
import { TIPOS_CHAMADO } from "@/modules/chamados/domain/tipos";
import * as repo from "@/modules/chamados/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { id, sim, textoOpcional } from "@/shared/acao/campos";
import { falha, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

// Toda regra real é do banco (quem pede, quem vê, quem atende). Aqui: validar e avisar.

const como = z
  .string()
  .optional()
  .transform((v) => v?.trim().toLowerCase() || undefined);

/** A equipe pede ajuda (dúvida ou problema), com um recado opcional. */
export const pedirAjuda = criarAcao(z.object({ tipo: z.enum(["duvida", "problema"], { message: "Escolha dúvida ou problema." }), mensagem: textoOpcional(300), como }), async (d) => {
  const { error } = await repo.abrirChamado(await clienteServidor(), d.tipo, d.mensagem, d.como);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(`Pedido de ajuda enviado (${TIPOS_CHAMADO[d.tipo].rotulo.toLowerCase()}). A mentoria vê a sua bancada piscando no mapa.`);
});

/** A equipe cancela o pedido ou avisa que já resolveu. */
export const fecharMeuChamado = criarAcao(z.object({ id, resolvido: sim, como }), async (d) => {
  const { error } = await repo.fecharChamadoDaEquipe(await clienteServidor(), d.id, d.resolvido, d.como);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(d.resolvido ? "Que bom! Pedido de ajuda encerrado." : "Pedido de ajuda cancelado.");
});

/** Mentoria/organização: "Vou atender" ou "Resolvido". O desfazer reabre o pedido. */
export const atenderChamado = criarAcao(z.object({ id, resolver: sim, equipe: z.string().optional() }), async (d) => {
  const { error } = await repo.atenderChamado(await clienteServidor(), d.id, d.resolver);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  const quem = d.equipe || "a equipe";
  return sucesso(d.resolver ? `Pedido de ${quem} resolvido.` : `Você está indo até ${quem}. A equipe já vê que alguém está a caminho.`, { id: d.id });
});

export const reabrirChamado = criarAcao(z.object({ id }), async (d) => {
  const { error } = await repo.reabrirChamado(await clienteServidor(), d.id);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Pedido de ajuda aberto de novo.");
});
