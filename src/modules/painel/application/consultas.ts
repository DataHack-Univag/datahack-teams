import { andamentoPorRubrica } from "@/modules/avaliacao/domain/consolidacao";
import { paraAvaliacao } from "@/modules/avaliacao/application/consultas";
import { avaliacaoEncerrada, listarFichas } from "@/modules/avaliacao/infra/repositorio";
import { lerConfiguracao, listarEquipes } from "@/modules/equipes/infra/repositorio";
import { listarPendencias, resumirEvento } from "@/modules/painel/domain/pendencias";
import { contarAlunos, listarSemEquipe } from "@/modules/pessoas/infra/repositorio";
import { trocasPendentes } from "@/modules/trocas/infra/repositorio";
import type { Cliente } from "@/shared/db/servidor";

/** Tudo o que o painel da organização mostra, numa rodada só até o banco. */
export async function carregarPainel(cliente: Cliente) {
  const [equipes, semEquipe, totalAlunos, trocas, fichas, encerrada, config] = await Promise.all([
    listarEquipes(cliente),
    listarSemEquipe(cliente),
    contarAlunos(cliente),
    trocasPendentes(cliente),
    listarFichas(cliente),
    avaliacaoEncerrada(cliente),
    lerConfiguracao(cliente),
  ]);
  const andamento = andamentoPorRubrica(equipes.map(paraAvaliacao), fichas);
  return {
    encerrada,
    andamento,
    resumo: resumirEvento(equipes, totalAlunos, trocas, andamento),
    pendencias: listarPendencias({ equipes, semEquipe, trocas, andamento, config, encerrada }),
  };
}
