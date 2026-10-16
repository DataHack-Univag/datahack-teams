// Formação das equipes por proposta dos alunos: em que pé está cada aluno (propôs, convidou,
// foi convidado, aceitou, já está numa equipe aprovada, ou ninguém o chamou ainda) e o resumo
// da edição para o painel da organização.

import type { Equipe } from "@/modules/equipes/domain/tipos";

export type EstadoFormacao = "propos" | "convidado" | "aceitou" | "em_equipe" | "livre";

export const ESTADOS_FORMACAO: Record<EstadoFormacao, { rotulo: string; explicacao: string; tom: "marca" | "alerta" | "sucesso" | "neutro" }> = {
  propos: { rotulo: "Propôs equipe", explicacao: "Montou uma equipe e convidou os colegas", tom: "marca" },
  convidado: { rotulo: "Convite pendente", explicacao: "Foi convidado e ainda não respondeu", tom: "alerta" },
  aceitou: { rotulo: "Aceitou convite", explicacao: "Aceitou o convite de uma equipe que ainda não foi aprovada", tom: "sucesso" },
  em_equipe: { rotulo: "Em equipe aprovada", explicacao: "Já está numa equipe aprovada", tom: "sucesso" },
  livre: { rotulo: "Sem convite", explicacao: "Não propôs equipe e não foi convidado", tom: "neutro" },
};

type EquipeFormacao = Pick<Equipe, "nome" | "situacao" | "proposta_por" | "membros">;
const emFormacao = (e: EquipeFormacao) => e.situacao === "formando" || e.situacao === "aguardando_aprovacao";

/** Situação de cada aluno (por e-mail) e o nome da equipe dele, se houver. */
export function estadosFormacao(equipes: EquipeFormacao[], alunos: string[]): Record<string, { estado: EstadoFormacao; equipe: string | null }> {
  const r: Record<string, { estado: EstadoFormacao; equipe: string | null }> = {};
  for (const email of alunos) r[email] = { estado: "livre", equipe: null };
  for (const e of equipes) {
    if (e.situacao !== "aprovada" && !emFormacao(e)) continue;
    for (const m of e.membros) {
      if (!(m.email in r)) continue;
      const estado: EstadoFormacao =
        e.situacao === "aprovada" ? "em_equipe" : m.situacao === "convidado" ? "convidado" : m.email === e.proposta_por ? "propos" : "aceitou";
      r[m.email] = { estado, equipe: e.nome };
    }
  }
  return r;
}

export type ResumoFormacao = {
  equipes: { aguardandoAceite: number; todosAceitaram: number; aprovadas: number };
  pessoas: Record<EstadoFormacao, number> & { total: number };
};

/** Números da formação para o painel: equipes por etapa e alunos por situação. */
export function resumoFormacao(equipes: EquipeFormacao[], alunos: string[]): ResumoFormacao {
  const formando = equipes.filter(emFormacao);
  const pessoas = { propos: 0, convidado: 0, aceitou: 0, em_equipe: 0, livre: 0, total: alunos.length };
  for (const { estado } of Object.values(estadosFormacao(equipes, alunos))) pessoas[estado]++;
  return {
    equipes: {
      aguardandoAceite: formando.filter((e) => e.membros.some((m) => m.situacao === "convidado")).length,
      todosAceitaram: formando.filter((e) => !e.membros.some((m) => m.situacao === "convidado")).length,
      aprovadas: equipes.filter((e) => e.situacao === "aprovada").length,
    },
    pessoas,
  };
}
