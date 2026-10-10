// Gera src/lib/rubricas.ts a partir do docs/rubricas.json exportado por
// src/build_cronograma_rubrica.py (fonte da verdade das rubricas do evento).
//
// Uso (na pasta datahack-teams):
//   node scripts/gerar_rubricas.mjs ../docs/rubricas.json src/lib/rubricas.ts

import { readFileSync, writeFileSync } from "node:fs";

const [, , origem = "../docs/rubricas.json", destino = "src/lib/rubricas.ts"] = process.argv;
const d = JSON.parse(readFileSync(origem, "utf8"));

// Banca de cada rubrica no sistema: técnicas (TEC_*) e negócio (NEG).
const banca = (id) => (id.startsWith("TEC") ? "tecnica" : "negocio");

const rubricas = d.rubricas.map((r) => ({
  id: r.id,
  nome: r.nome,
  banca: banca(r.id),
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

const ts = `// ARQUIVO GERADO por scripts/gerar_rubricas.mjs a partir de docs/rubricas.json
// (fonte: src/build_cronograma_rubrica.py). Não edite à mão: altere o Python e gere de novo.

export type Banca = "tecnica" | "negocio";
export type RubricaId = ${rubricas.map((r) => JSON.stringify(r.id)).join(" | ")};

export type Criterio = { id: string; nome: string; peso: number; descricao: string; niveis: string[] };
export type Rubrica = {
  id: RubricaId;
  nome: string;
  banca: Banca;
  bancaTexto: string;
  pesoFinal: number;
  momento: string;
  criterios: Criterio[];
};

/** Níveis de cada critério e o fator aplicado ao peso. */
export const NIVEIS = ${JSON.stringify(d.niveis.map((n) => ({ nome: n.nivel, fator: n.fator })), null, 2)} as const;

export const RUBRICAS: Rubrica[] = ${JSON.stringify(rubricas, null, 2)};

export const PENALIDADES: { id: string; pontos: number; texto: string }[] = ${JSON.stringify(d.penalidades, null, 2)};

export const DESCLASSIFICACAO = ${JSON.stringify(d.desclassificacao)};
export const DESEMPATE: string[] = ${JSON.stringify(d.desempate, null, 2)};
export const FORMULA = ${JSON.stringify(d.formula.texto)};
`;

writeFileSync(destino, ts);
console.log(`${rubricas.length} rubricas, ${d.penalidades.length} penalidades → ${destino}`);
