// Gera src/lib/rubricas.ts a partir do JSON exportado por src/build_cronograma_rubrica.py
// (fonte da verdade das rubricas do evento). Versão atual: docs/rubricas_v2.json.
//
// Uso (na pasta datahack-teams):
//   node scripts/gerar_rubricas.mjs ../docs/rubricas_v2.json src/lib/rubricas.ts

import { readFileSync, writeFileSync } from "node:fs";

const [, , origem = "../docs/rubricas_v2.json", destino = "src/lib/rubricas.ts"] = process.argv;
const d = JSON.parse(readFileSync(origem, "utf8"));

// Quem avalia cada rubrica no sistema.
//   professores  → papel avaliador_tecnico (pitches F1/F2, visão macro)
//   organizacao  → papel organizador (mesa F1/F2 e repositório F3, visão técnica)
//   negocio      → papel avaliador_negocio (pitch final)
const BANCA = { professores: "professores", organizadores: "organizacao", negocio: "negocio" };
const PARTE = { pitch: "Pitch", mesa: "Mesa", negocio: "Pitch final" };

const rubricas = d.rubricas.map((r) => ({
  id: r.id,
  fase: r.fase,
  parte: r.parte,
  curto: r.fase === "NEG" ? "Negócio" : r.fase === "F3" ? "F3 · Repositório" : `${r.fase} · ${PARTE[r.parte] ?? r.parte}`,
  nome: r.nome,
  banca: BANCA[r.banca_tipo] ?? "organizacao",
  bancaTexto: r.banca,
  pesoFinal: r.peso_final,
  momento: r.momento,
  criterios: r.criterios.map((c) => ({
    id: c.id,
    nome: c.nome,
    peso: c.peso,
    descricao: c.descricao,
    niveis: c.niveis.map((n) => n.descricao),
  })),
}));

// Fases do evento e as rubricas (partes) que compõem cada uma.
const NOMES_FASE = { F1: "Fase 1 · Exploração e estratégia", F2: "Fase 2 · Ingestão e protótipo", F3: "Fase 3 · Repositório final", NEG: "Negócio · Pitch final" };
const fases = Object.entries(d.pesos_fases).map(([id, peso]) => ({
  id,
  nome: NOMES_FASE[id] ?? id,
  peso,
  partes: rubricas.filter((r) => r.fase === id).map((r) => r.id),
}));

for (const f of fases) {
  const soma = rubricas.filter((r) => r.fase === f.id).reduce((s, r) => s + r.pesoFinal, 0);
  if (soma !== f.peso) throw new Error(`Fase ${f.id}: partes somam ${soma}%, esperado ${f.peso}%`);
}
for (const r of rubricas) {
  const soma = r.criterios.reduce((s, c) => s + c.peso, 0);
  if (soma !== 100) throw new Error(`${r.id}: critérios somam ${soma}`);
}

const ts = `// ARQUIVO GERADO por scripts/gerar_rubricas.mjs a partir de ${origem.replace(/^.*docs\//, "docs/")}
// (fonte: src/build_cronograma_rubrica.py). Não edite à mão: altere o Python e gere de novo.

/** Quem avalia: professores (pitches F1/F2), organização (mesa F1/F2 e F3) e negócio (pitch final). */
export type Banca = "professores" | "organizacao" | "negocio";
export type RubricaId = ${rubricas.map((r) => JSON.stringify(r.id)).join(" | ")};
export type FaseId = ${fases.map((f) => JSON.stringify(f.id)).join(" | ")};

export type Criterio = { id: string; nome: string; peso: number; descricao: string; niveis: string[] };
export type Rubrica = {
  id: RubricaId;
  fase: FaseId;
  parte: string;
  /** Rótulo curto para abas e tabelas (ex.: "F1 · Pitch"). */
  curto: string;
  nome: string;
  banca: Banca;
  bancaTexto: string;
  pesoFinal: number;
  momento: string;
  criterios: Criterio[];
};
export type Fase = { id: FaseId; nome: string; peso: number; partes: RubricaId[] };

/** Níveis de cada critério e o fator aplicado ao peso. */
export const NIVEIS = ${JSON.stringify(d.niveis.map((n) => ({ nome: n.nivel, fator: n.fator })), null, 2)} as const;

export const RUBRICAS: Rubrica[] = ${JSON.stringify(rubricas, null, 2)};

/** Fases (F1 = pitch + mesa, F2 = pitch + mesa, F3, Negócio) e o peso de cada uma na nota final. */
export const FASES: Fase[] = ${JSON.stringify(fases, null, 2)};

/** Divisão das fases 1 e 2 entre pitch (professores) e mesa (organizadores), em %. */
export const DIVISAO_FASES_1_2 = ${JSON.stringify(d.divisao_fases_1_2 ?? null)};

export const BANCAS: Record<Banca, string> = ${JSON.stringify({
  professores: d.bancas?.professores ?? "Banca de professores",
  organizacao: d.bancas?.organizadores ?? "Organização",
  negocio: d.bancas?.negocio ?? "Jurados de negócio",
}, null, 2)};

export const PENALIDADES: { id: string; pontos: number; texto: string }[] = ${JSON.stringify(d.penalidades, null, 2)};

export const DESCLASSIFICACAO = ${JSON.stringify(d.desclassificacao)};
export const DESEMPATE: string[] = ${JSON.stringify(d.desempate, null, 2)};
export const FORMULA = ${JSON.stringify(d.formula.texto)};
`;

writeFileSync(destino, ts);
console.log(`${rubricas.length} rubricas em ${fases.length} fases, ${d.penalidades.length} penalidades → ${destino}`);
