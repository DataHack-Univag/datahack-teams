"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { nomeRubrica, rubricaPorId } from "@/modules/avaliacao/domain/bancas";
import * as repo from "@/modules/avaliacao/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { emailNormalizado } from "@/modules/pessoas/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { emailSimulado } from "@/shared/auth/simulacao";
import { id, sim, textoOpcional } from "@/shared/acao/campos";
import { falha, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

/**
 * Salva a ficha do avaliador logado (um nível por critério, campos "c-<critério>").
 * Depois de salvar, o avaliador volta para a lista de equipes; a organização fica na mesma ficha.
 * O aviso "Ficha salva" aparece na tela seguinte (?salvo=...).
 */
export const salvarFicha = criarAcao(
  z.object({
    equipe_id: id,
    rubrica: z.string().min(1, "Rubrica inválida. Recarregue a página."),
    comentario: textoOpcional(2000),
    equipe_nome: z.string().optional(),
    voltar: sim,
  }),
  async (d, bruto) => {
    if (await emailSimulado()) return falha("Você está no modo “ver como”: a ficha não é salva. Saia da simulação para lançar notas.");
    const { cliente, edicao } = await sessaoAtual();
    const reg = await repo.carregarRegulamento(cliente, edicao.id);
    const rubrica = rubricaPorId(reg, d.rubrica);
    if (!rubrica?.uuid) return falha("Rubrica inválida. Recarregue a página.");
    const fatores = new Set(reg.niveis.map((n) => n.fator));

    // Todos os critérios vão para o banco: sem nível = null (limpa o que estava marcado).
    const notas: Record<string, number | null> = {};
    for (const c of rubrica.criterios) {
      const v = bruto[`c-${c.id}`];
      if (v === undefined || v === "") {
        notas[c.id] = null;
        continue;
      }
      const f = Number(v);
      if (!fatores.has(f)) return falha(`Nível inválido em “${c.nome}”. Marque de novo e salve.`);
      notas[c.id] = f;
    }
    const marcados = Object.values(notas).filter((v) => v !== null).length;
    if (!marcados) return falha("Marque o nível de pelo menos um critério antes de salvar.");

    const { error } = await repo.salvarFicha(cliente, { equipeId: d.equipe_id, rubricaUuid: rubrica.uuid, notas, comentario: d.comentario });
    if (error) {
      if (error.code === "42501")
        return falha("Não deu para salvar: essa ficha não é da sua banca ou a avaliação já foi encerrada pela organização.");
      return falha(traduzirErro(error));
    }
    atualizarTelas();
    const faltam = rubrica.criterios.length - marcados;
    const rotulo = `${d.equipe_nome || "Equipe"} · ${nomeRubrica(reg, rubrica.id)}${faltam ? ` (faltam ${faltam} critério(s))` : ""}`;
    redirect(
      d.voltar
        ? `/avaliar?salvo=${encodeURIComponent(rotulo)}`
        : `/avaliar/${d.equipe_id}?r=${rubrica.id}&salvo=${encodeURIComponent(rotulo)}`,
    );
  },
);

/** Liga/desliga uma penalidade. O resultado traz o "desfazer" (a operação inversa). */
export const alternarPenalidade = criarAcao(z.object({ equipe_id: id, penalidade: z.string().min(1), aplicar: sim }), async (d) => {
  const { cliente, edicao } = await sessaoAtual();
  const reg = await repo.carregarRegulamento(cliente, edicao.id);
  const pen = reg.penalidades.find((p) => p.id === d.penalidade);
  if (!pen?.uuid) return falha("Penalidade inválida. Recarregue a página.");
  const quem = await emailNormalizado(cliente);
  const { error } = d.aplicar
    ? await repo.aplicarPenalidade(cliente, edicao.id, d.equipe_id, pen.uuid, quem)
    : await repo.retirarPenalidade(cliente, d.equipe_id, pen.uuid, quem);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(d.aplicar ? `Penalidade aplicada (${pen.pontos}).` : "Penalidade retirada.", {
    equipe_id: d.equipe_id,
    penalidade: pen.id,
    aplicar: d.aplicar ? "0" : "1",
  });
});

/** Arquiva a ficha (ela sai da média; continua guardada no histórico). */
export const excluirFicha = criarAcao(z.object({ id }), async (d) => {
  const { error } = await repo.arquivarFicha(await clienteServidor(), d.id);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Ficha arquivada: saiu da média.");
});
