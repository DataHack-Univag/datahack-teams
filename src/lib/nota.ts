// Cálculo das notas (mesma regra de src/build_cronograma_rubrica.py, versão 2):
//   - cada critério: média dos fatores dados pelos avaliadores daquela rubrica;
//   - nota da rubrica (0–100) = soma(peso_critério × fator médio);
//   - fases 1 e 2 têm duas rubricas: pitch (professores) e mesa (organizadores);
//     nota da fase (0–100) = soma(peso_final × nota_rubrica) / peso da fase;
//   - nota final = soma(peso_final × nota_rubrica / 100) + penalidades, mínimo 0;
//   - desempate: F3 · Repositório → "Respondeu às perguntas" (NEG) → "Idempotência" (F2 · Mesa).

import { FASES, PENALIDADES, RUBRICAS, type FaseId, type Rubrica, type RubricaId } from "@/lib/rubricas";
import type { Avaliacao } from "@/lib/tipos";

/** Nota (0–100) de uma única ficha. Critérios sem nível contam 0. */
export function notaFicha(rubrica: Rubrica, notas: Record<string, number>) {
  return rubrica.criterios.reduce((s, c) => s + c.peso * (notas[c.id] ?? 0), 0);
}

export type ResultadoRubrica = {
  nota: number | null; // null = ninguém avaliou ainda
  avaliadores: number;
  completa: boolean; // todos os critérios têm ao menos uma nota
  mediaCriterio: Record<string, number | null>;
};

export function consolidarRubrica(rubrica: Rubrica, fichas: Avaliacao[]): ResultadoRubrica {
  const daRubrica = fichas.filter((f) => f.rubrica === rubrica.id);
  const mediaCriterio: Record<string, number | null> = {};
  let nota = 0;
  let completa = daRubrica.length > 0;
  for (const c of rubrica.criterios) {
    const vals = daRubrica.map((f) => f.notas?.[c.id]).filter((v): v is number => typeof v === "number");
    const media = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    mediaCriterio[c.id] = media;
    if (media === null) completa = false;
    nota += c.peso * (media ?? 0);
  }
  return { nota: daRubrica.length ? nota : null, avaliadores: daRubrica.length, completa, mediaCriterio };
}

export type ResultadoFase = {
  /** 0–100, juntando as partes avaliadas (null = nenhuma parte avaliada). */
  nota: number | null;
  /** quanto a fase soma na nota final (pontos). */
  pontos: number;
  completa: boolean;
};

export type ResultadoEquipe = {
  rubricas: Record<RubricaId, ResultadoRubrica>;
  fases: Record<FaseId, ResultadoFase>;
  penalidades: number;
  final: number;
  completa: boolean;
  desempate: number[];
};

export function consolidarEquipe(fichas: Avaliacao[], penalidadesIds: string[]): ResultadoEquipe {
  const rubricas = Object.fromEntries(RUBRICAS.map((r) => [r.id, consolidarRubrica(r, fichas)])) as Record<
    RubricaId,
    ResultadoRubrica
  >;
  const penalidades = penalidadesIds.reduce((s, id) => s + (PENALIDADES.find((p) => p.id === id)?.pontos ?? 0), 0);
  const fases = Object.fromEntries(
    FASES.map((f) => {
      const partes = RUBRICAS.filter((r) => f.partes.includes(r.id));
      const pontos = partes.reduce((s, r) => s + (r.pesoFinal * (rubricas[r.id].nota ?? 0)) / 100, 0);
      const algumaAvaliada = partes.some((r) => rubricas[r.id].nota !== null);
      return [
        f.id,
        {
          nota: algumaAvaliada ? (pontos * 100) / f.peso : null,
          pontos,
          completa: partes.every((r) => rubricas[r.id].completa),
        },
      ];
    }),
  ) as Record<FaseId, ResultadoFase>;
  const bruta = RUBRICAS.reduce((s, r) => s + (r.pesoFinal * (rubricas[r.id].nota ?? 0)) / 100, 0);
  return {
    rubricas,
    fases,
    penalidades,
    final: Math.max(0, bruta + penalidades),
    completa: RUBRICAS.every((r) => rubricas[r.id].completa),
    // critérios de desempate, nesta ordem (maior vence)
    desempate: [
      rubricas.F3_REPO.nota ?? 0,
      rubricas.NEG.mediaCriterio.respondeu ?? 0,
      rubricas.F2_MESA.mediaCriterio.idempotencia ?? 0,
    ],
  };
}

/** Ordena por nota final e aplica o desempate do regulamento. */
export function compararRanking(a: ResultadoEquipe, b: ResultadoEquipe) {
  if (Math.abs(b.final - a.final) > 1e-9) return b.final - a.final;
  for (let i = 0; i < a.desempate.length; i++) {
    const d = b.desempate[i] - a.desempate[i];
    if (Math.abs(d) > 1e-9) return d;
  }
  return 0;
}

export const fmtNota = (v: number | null | undefined, casas = 1) =>
  v === null || v === undefined ? "—" : v.toFixed(casas).replace(".", ",");
