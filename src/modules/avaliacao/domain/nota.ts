// Cálculo das notas a partir do regulamento da edição:
//   - cada critério: média dos fatores dados pelos avaliadores daquela rubrica;
//   - nota da rubrica (0–100) = soma(peso_critério × fator médio);
//   - uma fase pode ter várias rubricas (ex.: pitch + mesa);
//     nota da fase (0–100) = soma(peso_final × nota_rubrica) / peso da fase;
//   - nota final = soma(peso_final × nota_rubrica / 100) + penalidades, mínimo 0;
//   - desempate: as regras da edição, em ordem (nota de uma rubrica ou média de um critério).

import type { Regulamento, Rubrica } from "./regulamento";
import type { Ficha, Notas } from "./tipos";

/** Nota (0–100) de uma única ficha. Critérios sem nível contam 0. */
export function notaFicha(rubrica: Rubrica, notas: Notas) {
  return rubrica.criterios.reduce((s, c) => s + c.peso * (notas[c.id] ?? 0), 0);
}

export type ResultadoRubrica = {
  nota: number | null; // null = ninguém avaliou ainda
  avaliadores: number;
  completa: boolean; // todos os critérios têm ao menos uma nota
  mediaCriterio: Record<string, number | null>;
};

export function consolidarRubrica(rubrica: Rubrica, fichas: Ficha[]): ResultadoRubrica {
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
  rubricas: Record<string, ResultadoRubrica>;
  fases: Record<string, ResultadoFase>;
  penalidades: number;
  final: number;
  completa: boolean;
  /** Valores das regras de desempate automáticas, na ordem do regulamento (maior vence). */
  desempate: number[];
};

export function consolidarEquipe(reg: Regulamento, fichas: Ficha[], penalidadesIds: string[]): ResultadoEquipe {
  const rubricas = Object.fromEntries(reg.rubricas.map((r) => [r.id, consolidarRubrica(r, fichas)]));
  const penalidades = penalidadesIds.reduce((s, id) => s + (reg.penalidades.find((p) => p.id === id)?.pontos ?? 0), 0);
  const fases = Object.fromEntries(
    reg.fases.map((f) => {
      const partes = reg.rubricas.filter((r) => f.partes.includes(r.id));
      const pontos = partes.reduce((s, r) => s + (r.pesoFinal * (rubricas[r.id].nota ?? 0)) / 100, 0);
      const algumaAvaliada = partes.some((r) => rubricas[r.id].nota !== null);
      return [f.id, { nota: algumaAvaliada && f.peso ? (pontos * 100) / f.peso : null, pontos, completa: partes.every((r) => rubricas[r.id].completa) }];
    }),
  );
  const bruta = reg.rubricas.reduce((s, r) => s + (r.pesoFinal * (rubricas[r.id].nota ?? 0)) / 100, 0);
  return {
    rubricas,
    fases,
    penalidades,
    final: Math.max(0, bruta + penalidades),
    completa: reg.rubricas.every((r) => rubricas[r.id].completa),
    desempate: reg.desempate.flatMap((d) => {
      if (d.tipo === "rubrica") return [rubricas[d.rubrica]?.nota ?? 0];
      if (d.tipo === "criterio") return [rubricas[d.rubrica]?.mediaCriterio[d.criterio] ?? 0];
      return [];
    }),
  };
}

/** Ordena por nota final e aplica o desempate do regulamento. */
export function compararRanking(a: ResultadoEquipe, b: ResultadoEquipe) {
  if (Math.abs(b.final - a.final) > 1e-9) return b.final - a.final;
  for (let i = 0; i < a.desempate.length; i++) {
    const d = (b.desempate[i] ?? 0) - (a.desempate[i] ?? 0);
    if (Math.abs(d) > 1e-9) return d;
  }
  return 0;
}
