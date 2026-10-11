import type { Banca, Regulamento, Rubrica } from "./regulamento";
import type { Notas } from "./tipos";

/**
 * Quem avalia o quê vem do regulamento da edição: cada rubrica pertence a uma banca e cada
 * avaliador (ou organizador) está numa banca. A organização pode lançar qualquer rubrica.
 */

/** Rubricas que a banca avalia (a organização vê as dela primeiro e depois as outras). */
export function rubricasDaBanca(reg: Regulamento, banca: Banca | null, organizador = false): Rubrica[] {
  const minhas = reg.rubricas.filter((r) => r.banca === banca);
  return organizador ? [...minhas, ...reg.rubricas.filter((r) => r.banca !== banca)] : minhas;
}

export const rubricaPorId = (reg: Regulamento, id: string) => reg.rubricas.find((r) => r.id === id);

export const nomeBanca = (reg: Regulamento, banca: Banca | null) => reg.bancas.find((b) => b.codigo === banca)?.nome ?? "";

/** Nome amigável da rubrica (ex.: "F1 · Pitch"), sem os códigos internos como F1_PITCH. */
export const nomeRubrica = (reg: Regulamento, id: string) => rubricaPorId(reg, id)?.curto ?? id;

/** Nome do nível marcado ("Proficiente") ou "—" se não marcado. */
export const nomeNivel = (reg: Regulamento, fator: number | undefined) => reg.niveis.find((n) => n.fator === fator)?.nome ?? "—";

/** Quantos critérios da rubrica já têm nível. */
export const criteriosFeitos = (r: Rubrica, notas: Notas | undefined) =>
  r.criterios.filter((c) => typeof notas?.[c.id] === "number").length;

export type SituacaoFicha = "nao_iniciada" | "incompleta" | "completa";

export function situacaoFicha(r: Rubrica, notas: Notas | undefined): SituacaoFicha {
  const feitos = criteriosFeitos(r, notas);
  return feitos === 0 ? "nao_iniciada" : feitos === r.criterios.length ? "completa" : "incompleta";
}

export const ROTULO_SITUACAO: Record<SituacaoFicha, string> = {
  nao_iniciada: "Não iniciada",
  incompleta: "Incompleta",
  completa: "Completa",
};
