// O que cada perfil acompanha ao vivo e quais mudanças viram aviso na tela.
// Os filtros são da edição; as permissões do banco (RLS) cortam o resto.

import type { Assinatura, RegraAviso, TabelaAoVivo } from "@/shared/lib/tempoReal";

type AoVivo = { assinaturas: Assinatura[]; avisos: RegraAviso[] };

const daEdicao = (edicaoId: string, tabelas: TabelaAoVivo[]): Assinatura[] => tabelas.map((tabela) => ({ tabela, filtro: `edicao_id=eq.${edicaoId}` }));

/** Organização: tudo da edição (painel, inscrições, pessoas, equipes, chamados, avaliação, ranking e contadores do menu). */
export function aoVivoOrganizacao(edicaoId: string): AoVivo {
  return {
    assinaturas: [
      ...daEdicao(edicaoId, ["inscricoes", "participacoes", "equipes", "membros", "trocas", "chamados", "fichas", "penalidades_equipe", "materiais", "alocacoes"]),
      // Notas por critério não têm a edição na linha: o banco só manda as que a pessoa pode ver.
      { tabela: "notas_criterio" },
    ],
    avisos: [
      { tabela: "inscricoes", evento: "INSERT", onde: { origem: "formulario" }, texto: "Nova inscrição recebida", plural: "{n} novas inscrições recebidas", link: "/admin/inscricoes" },
      { tabela: "chamados", evento: "INSERT", texto: "Novo pedido de ajuda", plural: "{n} novos pedidos de ajuda", link: "/admin/chamados" },
      { tabela: "equipes", onde: { situacao: "aguardando_aprovacao" }, texto: "Nova proposta de equipe para analisar", plural: "{n} propostas de equipe para analisar", link: "/admin/equipes/propostas" },
      { tabela: "trocas", evento: "INSERT", texto: "Novo pedido de troca de equipe", plural: "{n} novos pedidos de troca", link: "/admin/equipes/trocas" },
    ],
  };
}

/** Mentoria: pedidos de ajuda, presença e equipes. */
export function aoVivoMentoria(edicaoId: string): AoVivo {
  return {
    assinaturas: daEdicao(edicaoId, ["chamados", "participacoes", "equipes", "membros", "alocacoes"]),
    avisos: [{ tabela: "chamados", evento: "INSERT", texto: "Novo pedido de ajuda", plural: "{n} novos pedidos de ajuda", link: "/mentoria/chamados" }],
  };
}

/** Bancas: equipes e a estrutura da avaliação (fases, critérios). Sem avisos: não interrompe quem avalia. */
export function aoVivoBancas(edicaoId: string): AoVivo {
  return { assinaturas: daEdicao(edicaoId, ["equipes", "fases", "criterios"]), avisos: [] };
}

/** Aluno: convites, a própria equipe, trocas, pedido de ajuda, materiais e lugar no mapa. */
export function aoVivoAluno(edicaoId: string, email: string, equipeId: string | null, permiteTrocas: boolean): AoVivo {
  const avisos: RegraAviso[] = [
    { tabela: "membros", evento: "INSERT", onde: { email, situacao: "convidado" }, texto: "Você recebeu um convite para uma equipe", link: "/" },
    { tabela: "materiais", evento: "INSERT", texto: "Material novo em Materiais", plural: "{n} materiais novos", link: "/?aba=materiais" },
  ];
  if (equipeId)
    avisos.push(
      { tabela: "equipes", evento: "UPDATE", onde: { id: equipeId, situacao: "aprovada" }, recente: "analisado_em", texto: "A organização aprovou a sua equipe!", link: "/" },
      { tabela: "equipes", evento: "UPDATE", onde: { id: equipeId, situacao: "recusada" }, recente: "analisado_em", texto: "A organização respondeu à proposta da sua equipe", link: "/" },
      { tabela: "chamados", evento: "UPDATE", onde: { equipe_id: equipeId, situacao: "em_atendimento" }, recente: "atendido_em", texto: "Um mentor está a caminho da sua equipe", link: "/" },
      { tabela: "alocacoes", evento: "INSERT", onde: { equipe_id: equipeId }, texto: "A sua equipe tem um lugar no mapa", link: "/" },
    );
  if (equipeId && permiteTrocas)
    avisos.push(
      { tabela: "trocas", evento: "INSERT", onde: { equipe_destino: equipeId, solicitante: { diferente: email } }, texto: "Novo pedido de troca para a sua equipe", link: "/?aba=trocas" },
      { tabela: "trocas", evento: "UPDATE", onde: { solicitante: email, status: "aceita" }, recente: "respondido_em", texto: "Seu pedido de troca foi aceito", link: "/" },
      { tabela: "trocas", evento: "UPDATE", onde: { solicitante: email, status: "recusada" }, recente: "respondido_em", texto: "Seu pedido de troca foi recusado", link: "/?aba=trocas" },
    );
  return {
    assinaturas: daEdicao(edicaoId, ["participacoes", "equipes", "membros", "chamados", "materiais", "alocacoes", ...(permiteTrocas ? (["trocas"] as const) : [])]),
    avisos,
  };
}
