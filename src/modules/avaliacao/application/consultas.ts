// Leituras usadas pelas telas de avaliação e ranking.

import { montarRanking } from "@/modules/avaliacao/domain/consolidacao";
import type { EquipeAvaliada } from "@/modules/avaliacao/domain/tipos";
import { carregarRegulamento, listarFichas, listarPenalidades } from "@/modules/avaliacao/infra/repositorio";
import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { confirmados, nomeMembro, type Equipe } from "@/modules/equipes/domain/tipos";
import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import type { Cliente } from "@/shared/db/servidor";

export const paraAvaliacao = (e: Equipe): EquipeAvaliada => ({ id: e.id, nome: e.nome, integrantes: confirmados(e).map(nomeMembro) });

/** Ranking completo da edição (organização): equipes, fichas, penalidades e regulamento. */
export async function carregarRanking(cliente: Cliente, edicao: Edicao) {
  const [reg, equipes, fichas, penalidades] = await Promise.all([
    carregarRegulamento(cliente, edicao.id),
    listarEquipes(cliente, edicao.id),
    listarFichas(cliente, edicao.id),
    listarPenalidades(cliente, edicao.id),
  ]);
  return {
    reg,
    equipes,
    fichas,
    encerrada: edicao.avaliacao_encerrada,
    linhas: montarRanking(reg, equipes.map(paraAvaliacao), fichas, penalidades),
  };
}
