"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { nomeRubrica, rubricaPorId } from "@/modules/avaliacao/domain/bancas";
import { NIVEIS, PENALIDADES } from "@/modules/avaliacao/domain/rubricas";
import type { Notas } from "@/modules/avaliacao/domain/tipos";
import * as repo from "@/modules/avaliacao/infra/repositorio";
import { salvarConfiguracao } from "@/modules/equipes/infra/repositorio";
import { emailNormalizado } from "@/modules/pessoas/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { id, sim, textoOpcional } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

const FATORES = new Set<number>(NIVEIS.map((n) => n.fator));

/**
 * Salva a ficha do avaliador logado (um nível por critério, campos "c-<critério>").
 * Depois de salvar, o avaliador volta para a lista de equipes; a organização fica na mesma ficha.
 * O aviso "Ficha salva" aparece na tela seguinte (?salvo=...).
 */
export const salvarFicha = criarAcao(
  z.object({
    equipe_id: id,
    rubrica: z.string().refine((v) => !!rubricaPorId(v), "Rubrica inválida. Recarregue a página."),
    comentario: textoOpcional(2000),
    equipe_nome: z.string().optional(),
    voltar: sim,
  }),
  async (d, bruto) => {
    const rubrica = rubricaPorId(d.rubrica)!;
    const notas: Notas = {};
    for (const c of rubrica.criterios) {
      const v = bruto[`c-${c.id}`];
      if (v === undefined || v === "") continue;
      const f = Number(v);
      if (!FATORES.has(f)) return falha(`Nível inválido em “${c.nome}”. Marque de novo e salve.`);
      notas[c.id] = f;
    }
    if (!Object.keys(notas).length) return falha("Marque o nível de pelo menos um critério antes de salvar.");

    const cliente = await clienteServidor();
    const avaliador = await emailNormalizado(cliente);
    if (!avaliador) return falha("Sua sessão expirou. Entre de novo para salvar.");
    const { error } = await repo.salvarFicha(cliente, {
      equipe_id: d.equipe_id,
      avaliador,
      rubrica: rubrica.id,
      notas,
      comentario: d.comentario,
    });
    if (error) {
      if (error.code === "42501")
        return falha("Não deu para salvar: essa ficha não é da sua banca ou a avaliação já foi encerrada pela organização.");
      return falha(traduzirErro(error));
    }
    atualizarTelas();
    const faltam = rubrica.criterios.length - Object.keys(notas).length;
    const rotulo = `${d.equipe_nome || "Equipe"} · ${nomeRubrica(rubrica.id)}${faltam ? ` (faltam ${faltam} critério(s))` : ""}`;
    redirect(
      d.voltar
        ? `/avaliar?salvo=${encodeURIComponent(rotulo)}`
        : `/avaliar/${d.equipe_id}?r=${rubrica.id}&salvo=${encodeURIComponent(rotulo)}`,
    );
  },
);

/** Liga/desliga uma penalidade. O resultado traz o "desfazer" (a operação inversa). */
export const alternarPenalidade = criarAcao(
  z.object({
    equipe_id: id,
    penalidade: z.string().refine((v) => PENALIDADES.some((p) => p.id === v), "Penalidade inválida."),
    aplicar: sim,
  }),
  async (d) => {
    const pen = PENALIDADES.find((p) => p.id === d.penalidade)!;
    const cliente = await clienteServidor();
    const { error } = d.aplicar
      ? await repo.aplicarPenalidade(cliente, d.equipe_id, pen.id, await emailNormalizado(cliente))
      : await repo.retirarPenalidade(cliente, d.equipe_id, pen.id);
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    return sucesso(d.aplicar ? `Penalidade aplicada (${pen.pontos}).` : "Penalidade retirada.", {
      equipe_id: d.equipe_id,
      penalidade: pen.id,
      aplicar: d.aplicar ? "0" : "1",
    });
  },
);

/** Encerra/reabre o lançamento de notas pelas bancas (a organização continua editando). */
export const definirEncerramento = criarAcao(z.object({ encerrar: sim }), async (d) => {
  const { alterou, error } = await salvarConfiguracao(await clienteServidor(), { avaliacao_encerrada: d.encerrar });
  if (error) return falha(traduzirErro(error));
  if (!alterou) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso(d.encerrar ? "Avaliação encerrada: as bancas só consultam as fichas." : "Avaliação reaberta: as bancas voltam a editar.");
});

export const excluirFicha = criarAcao(z.object({ id }), async (d) => {
  const { alterou, error } = await repo.excluirFicha(await clienteServidor(), d.id);
  if (error) return falha(traduzirErro(error));
  if (!alterou) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso("Ficha apagada.");
});
