// Converte o JSON das rubricas do evento (formato de src/build_cronograma_rubrica.py,
// cópia em config/rubricas_v2.json) para o formato canônico de regulamento que o banco importa
// com public.importar_regulamento(edicao, json). É o mesmo formato usado para copiar o
// regulamento de uma edição para outra.
//
// Uso (na pasta datahack-teams):
//   node scripts/regulamento_canonico.mjs [origem] [destino]
//   padrão: config/rubricas_v2.json → config/regulamento_2026.json

import { readFileSync, writeFileSync } from "node:fs";

const [, , origem = "config/rubricas_v2.json", destino = "config/regulamento_2026.json"] = process.argv;
const d = JSON.parse(readFileSync(origem, "utf8"));

const BANCA = { professores: "professores", organizadores: "organizacao", negocio: "negocio" };
const PARTE = { pitch: "Pitch", mesa: "Mesa", negocio: "Pitch final" };
const NOMES_FASE = { F1: "Fase 1 · Exploração e estratégia", F2: "Fase 2 · Ingestão e protótipo", F3: "Fase 3 · Repositório final", NEG: "Negócio · Pitch final" };

const regulamento = {
  versao: 1,
  bancas: Object.entries(d.bancas).map(([codigo, nome]) => ({ codigo: BANCA[codigo] ?? codigo, nome, da_organizacao: codigo === "organizadores" })),
  niveis: d.niveis.map((n) => ({ nome: n.nivel, fator: n.fator })),
  fases: Object.entries(d.pesos_fases).map(([codigo, peso]) => ({ codigo, nome: NOMES_FASE[codigo] ?? codigo, peso })),
  rubricas: d.rubricas.map((r) => ({
    codigo: r.id,
    fase: r.fase,
    banca: BANCA[r.banca_tipo] ?? "organizacao",
    parte: r.parte,
    nome: r.nome,
    curto: r.fase === "NEG" ? "Negócio" : r.fase === "F3" ? "F3 · Repositório" : `${r.fase} · ${PARTE[r.parte] ?? r.parte}`,
    peso_final: r.peso_final,
    momento: r.momento,
    criterios: r.criterios.map((c) => ({
      codigo: c.id,
      nome: c.nome,
      peso: c.peso,
      descricao: c.descricao,
      niveis: c.niveis.map((n) => ({ fator: n.fator, descricao: n.descricao })),
    })),
  })),
  penalidades: d.penalidades.map((p) => ({ codigo: p.id, texto: p.texto, pontos: p.pontos })),
  // Desempate estruturado (o cálculo usa os três primeiros; o último é decisão das bancas).
  desempate: [
    { descricao: d.desempate[0], tipo: "rubrica", rubrica: "F3_REPO" },
    { descricao: d.desempate[1], tipo: "criterio", rubrica: "NEG", criterio: "respondeu" },
    { descricao: d.desempate[2], tipo: "criterio", rubrica: "F2_MESA", criterio: "idempotencia" },
    ...d.desempate.slice(3).map((descricao) => ({ descricao, tipo: "manual" })),
  ],
  formula: d.formula.texto,
  desclassificacao: d.desclassificacao,
};

// Conferências do regulamento.
for (const f of regulamento.fases) {
  const soma = regulamento.rubricas.filter((r) => r.fase === f.codigo).reduce((s, r) => s + r.peso_final, 0);
  if (soma !== f.peso) throw new Error(`Fase ${f.codigo}: rubricas somam ${soma}, esperado ${f.peso}`);
}
for (const r of regulamento.rubricas) {
  const soma = r.criterios.reduce((s, c) => s + c.peso, 0);
  if (soma !== 100) throw new Error(`${r.codigo}: critérios somam ${soma}`);
}
for (const x of regulamento.desempate.filter((x) => x.tipo === "criterio")) {
  const r = regulamento.rubricas.find((r) => r.codigo === x.rubrica);
  if (!r?.criterios.some((c) => c.codigo === x.criterio)) throw new Error(`Desempate: ${x.rubrica}.${x.criterio} não existe`);
}

writeFileSync(destino, JSON.stringify(regulamento, null, 2) + "\n");
console.log(`${destino}: ${regulamento.rubricas.length} rubricas, ${regulamento.rubricas.reduce((s, r) => s + r.criterios.length, 0)} critérios`);
