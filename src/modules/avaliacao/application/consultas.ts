// Leituras usadas pelas telas de avaliação e ranking.

import { montarRanking } from "@/modules/avaliacao/domain/consolidacao";
import type { EquipeAvaliada } from "@/modules/avaliacao/domain/tipos";
import { avaliacaoEncerrada, listarFichas, listarPenalidades } from "@/modules/avaliacao/infra/repositorio";
import { nomeMembro, type Equipe } from "@/modules/equipes/domain/tipos";
import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import type { Cliente } from "@/shared/db/servidor";

export const paraAvaliacao = (e: Equipe): EquipeAvaliada => ({ id: e.id, nome: e.nome, integrantes: e.membros.map(nomeMembro) });

/** Ranking completo (organização): todas as equipes, fichas e penalidades. */
export async function carregarRanking(cliente: Cliente) {
  const [equipes, fichas, penalidades, encerrada] = await Promise.all([
    listarEquipes(cliente),
    listarFichas(cliente),
    listarPenalidades(cliente),
    avaliacaoEncerrada(cliente),
  ]);
  return {
    equipes,
    fichas,
    encerrada,
    linhas: montarRanking(equipes.map(paraAvaliacao), fichas, penalidades),
  };
}
