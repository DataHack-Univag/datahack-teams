import type { Papel } from "@/modules/pessoas/domain/papeis";
import { FASES, NIVEIS, RUBRICAS, type Banca, type FaseId, type Rubrica, type RubricaId } from "./rubricas";
import type { Notas } from "./tipos";

/**
 * Quem avalia o quê:
 *   avaliador_tecnico → banca de professores (pitches das fases 1 e 2);
 *   organizador       → mesa técnica das fases 1 e 2 e repositório da fase 3 (e pode lançar qualquer rubrica);
 *   avaliador_negocio → jurados do pitch final.
 */
export function bancaDoPapel(papel: Papel): Banca | null {
  if (papel === "avaliador_tecnico") return "professores";
  if (papel === "avaliador_negocio") return "negocio";
  if (papel === "organizador") return "organizacao";
  return null;
}

/** Rubricas que a banca avalia (a organização vê as dela primeiro e depois as outras). */
export function rubricasDaBanca(banca: Banca | null, organizador = false): Rubrica[] {
  const minhas = RUBRICAS.filter((r) => r.banca === banca);
  return organizador ? [...minhas, ...RUBRICAS.filter((r) => r.banca !== banca)] : minhas;
}

export const rubricaPorId = (id: string) => RUBRICAS.find((r) => r.id === id);

/** Nome da fase para a tela: "Fase 1", "Negócio". */
export const nomeCurtoFase = (id: FaseId | string) => (id === "NEG" ? "Negócio" : `Fase ${String(id).replace("F", "")}`);

/** Nome amigável da rubrica: "Fase 1 · Pitch" (sem os códigos internos como F1_PITCH). */
export function nomeRubrica(id: RubricaId | string): string {
  const r = rubricaPorId(id);
  if (!r) return String(id);
  if (r.fase === "NEG") return "Negócio · Pitch final";
  if (r.fase === "F3") return "Fase 3 · Repositório";
  return `${nomeCurtoFase(r.fase)} · ${r.parte === "pitch" ? "Pitch" : "Mesa técnica"}`;
}

export const faseDaRubrica = (id: RubricaId) => FASES.find((f) => f.partes.includes(id))!;

/** Nome do nível marcado ("Proficiente") ou "—" se não marcado. */
export const nomeNivel = (fator: number | undefined) => NIVEIS.find((n) => n.fator === fator)?.nome ?? "—";

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
