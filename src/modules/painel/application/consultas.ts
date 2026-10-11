import { paraAvaliacao } from "@/modules/avaliacao/application/consultas";
import { andamentoPorRubrica } from "@/modules/avaliacao/domain/consolidacao";
import { carregarRegulamento, listarFichas } from "@/modules/avaliacao/infra/repositorio";
import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { configuracaoDa } from "@/modules/equipes/domain/tipos";
import { listarEquipes, listarPropostas } from "@/modules/equipes/infra/repositorio";
import { listarPendencias, resumirEvento } from "@/modules/painel/domain/pendencias";
import { contarAlunos, listarSemEquipe } from "@/modules/pessoas/infra/repositorio";
import { trocasPendentes } from "@/modules/trocas/infra/repositorio";
import type { Cliente } from "@/shared/db/servidor";

/** Tudo o que o painel da organização mostra, numa rodada só até o banco. */
export async function carregarPainel(cliente: Cliente, edicao: Edicao) {
  const [reg, equipes, propostas, semEquipe, totalAlunos, trocas, fichas] = await Promise.all([
    carregarRegulamento(cliente, edicao.id),
    listarEquipes(cliente, edicao.id),
    listarPropostas(cliente, edicao.id),
    listarSemEquipe(cliente, edicao.id),
    contarAlunos(cliente, edicao.id),
    trocasPendentes(cliente, edicao.id),
    listarFichas(cliente, edicao.id),
  ]);
  const andamento = andamentoPorRubrica(reg, equipes.map(paraAvaliacao), fichas);
  const encerrada = edicao.avaliacao_encerrada;
  return {
    encerrada,
    andamento,
    resumo: resumirEvento(equipes, totalAlunos, trocas, andamento),
    pendencias: listarPendencias({ equipes, propostas, semEquipe, trocas, andamento, config: configuracaoDa(edicao), encerrada }),
  };
}
