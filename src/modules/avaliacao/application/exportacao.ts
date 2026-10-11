// Planilhas da avaliação (regra pura: recebe o ranking e devolve as linhas do CSV).
//   ranking    → uma linha por equipe com a média de cada rubrica e a nota final;
//   analitico  → uma linha por equipe com todas as fases, rubricas e critérios em números;
//   brutos     → uma linha por critério de cada ficha (backup completo das notas);
//   fichas     → uma linha por ficha, com os níveis por extenso.

import type { LinhaRanking } from "@/modules/avaliacao/domain/consolidacao";
import { consolidarRubrica, notaFicha } from "@/modules/avaliacao/domain/nota";
import { FASES, NIVEIS, PENALIDADES, RUBRICAS } from "@/modules/avaliacao/domain/rubricas";
import { numeroCsv as bruto } from "@/shared/lib/csv";

export const TIPOS_EXPORTACAO = ["ranking", "analitico", "brutos", "fichas"] as const;
export type TipoExportacao = (typeof TIPOS_EXPORTACAO)[number];

const num = (v: number | null) => (v === null ? "" : v.toFixed(1).replace(".", ","));
const nivel = (f: number | undefined) => NIVEIS.find((n) => n.fator === f)?.nome ?? "";

export function planilhaAvaliacao(tipo: TipoExportacao, linhas: LinhaRanking[]): { nome: string; linhas: string[][] } {
  if (tipo === "analitico") return { nome: "avaliacao-analitica-datahack", linhas: analitica(linhas) };
  if (tipo === "brutos") return { nome: "avaliacao-dados-brutos-datahack", linhas: brutos(linhas) };
  if (tipo === "fichas") return { nome: "notas-por-avaliador-datahack", linhas: porFicha(linhas) };
  return { nome: "ranking-datahack", linhas: ranking(linhas) };
}

function ranking(linhas: LinhaRanking[]) {
  const cab = [
    "posicao",
    "equipe",
    ...RUBRICAS.flatMap((r) => [`${r.id} media (${r.pesoFinal}%)`, `${r.id} avaliadores`]),
    "penalidades",
    "nota_final",
    "completa",
  ];
  const corpo = linhas.map(({ posicao, equipe, penalidades, resultado: r }) => [
    String(posicao),
    equipe.nome,
    ...RUBRICAS.flatMap((rb) => [num(r.rubricas[rb.id].nota), String(r.rubricas[rb.id].avaliadores)]),
    `${r.penalidades}${penalidades.length ? ` (${penalidades.join(", ")})` : ""}`,
    num(r.final),
    r.completa ? "sim" : "nao",
  ]);
  return [cab, ...corpo];
}

function analitica(linhas: LinhaRanking[]) {
  const cab = ["posicao", "equipe_id", "equipe", "qtd_integrantes", "integrantes"];
  for (const f of FASES) {
    for (const rb of RUBRICAS.filter((r) => f.partes.includes(r.id))) {
      cab.push(`${rb.id}__qtd_avaliadores`);
      for (const c of rb.criterios) cab.push(`${rb.id}__${c.id}__fator_medio`, `${rb.id}__${c.id}__pontos_peso${c.peso}`);
      cab.push(`${rb.id}__nota_0a100`, `${rb.id}__pontos_na_final_peso${rb.pesoFinal}`, `${rb.id}__completa`);
    }
    cab.push(`FASE_${f.id}__nota_0a100`, `FASE_${f.id}__pontos_na_final_peso${f.peso}`, `FASE_${f.id}__completa`);
  }
  cab.push(
    ...PENALIDADES.map((p) => `penalidade__${p.id}`),
    "penalidades_total",
    "nota_bruta_sem_penalidade",
    "nota_final",
    "completa",
    "desempate1_F3_REPO_nota",
    "desempate2_NEG_respondeu_fator",
    "desempate3_F2_MESA_idempotencia_fator",
  );

  const corpo = linhas.map(({ posicao, equipe, penalidades, resultado: r }) => {
    const nomes = [...equipe.integrantes].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const l = [String(posicao), equipe.id, equipe.nome, String(nomes.length), nomes.join(", ")];
    let bruta = 0;
    for (const f of FASES) {
      for (const rb of RUBRICAS.filter((x) => f.partes.includes(x.id))) {
        const rr = r.rubricas[rb.id];
        l.push(String(rr.avaliadores));
        for (const c of rb.criterios) {
          const m = rr.mediaCriterio[c.id];
          l.push(bruto(m), bruto(m === null ? null : c.peso * m));
        }
        const pts = rr.nota === null ? null : (rb.pesoFinal * rr.nota) / 100;
        bruta += pts ?? 0;
        l.push(bruto(rr.nota), bruto(pts), rr.completa ? "1" : "0");
      }
      const rf = r.fases[f.id];
      l.push(bruto(rf.nota), bruto(rf.nota === null ? null : rf.pontos), rf.completa ? "1" : "0");
    }
    l.push(
      ...PENALIDADES.map((p) => (penalidades.includes(p.id) ? bruto(p.pontos) : "0")),
      bruto(r.penalidades),
      bruto(bruta),
      bruto(r.final),
      r.completa ? "1" : "0",
      ...r.desempate.map(bruto),
    );
    return l;
  });
  return [cab, ...corpo];
}

function brutos(linhas: LinhaRanking[]) {
  const cab = [
    "equipe_id", "equipe", "fase", "rubrica", "rubrica_nome", "rubrica_peso_final", "avaliador_email", "avaliador_nome",
    "criterio_id", "criterio_nome", "criterio_peso", "nivel", "fator", "pontos_criterio", "nota_da_ficha_0a100",
    "ficha_id", "atualizado_em", "comentario",
  ];
  const corpo: string[][] = [];
  const porNome = [...linhas].sort((a, b) => a.equipe.nome.localeCompare(b.equipe.nome, "pt-BR"));
  for (const { equipe, fichas } of porNome) {
    const ordenadas = [...fichas].sort((a, b) => a.rubrica.localeCompare(b.rubrica) || a.avaliador.localeCompare(b.avaliador));
    for (const f of ordenadas) {
      const rb = RUBRICAS.find((r) => r.id === f.rubrica);
      if (!rb) continue;
      const nota = notaFicha(rb, f.notas ?? {});
      for (const c of rb.criterios) {
        const v = f.notas?.[c.id];
        const tem = typeof v === "number";
        corpo.push([
          f.equipe_id, equipe.nome, rb.fase, rb.id, rb.nome, String(rb.pesoFinal), f.avaliador, f.quem?.nome ?? "",
          c.id, c.nome, String(c.peso), tem ? nivel(v) : "", tem ? bruto(v) : "", tem ? bruto(c.peso * v) : "",
          bruto(nota), f.id, f.atualizado_em, f.comentario ?? "",
        ]);
      }
    }
  }
  return [cab, ...corpo];
}

function porFicha(linhas: LinhaRanking[]) {
  const maxCrit = Math.max(...RUBRICAS.map((r) => r.criterios.length));
  const cab = [
    "equipe",
    "rubrica",
    "avaliador",
    ...Array.from({ length: maxCrit }, (_, i) => `criterio_${i + 1}`),
    "nota_do_avaliador",
    "media_da_equipe_na_rubrica",
    "comentario",
  ];
  const corpo: string[][] = [];
  const porNome = [...linhas].sort((a, b) => a.equipe.nome.localeCompare(b.equipe.nome, "pt-BR"));
  for (const { equipe, fichas } of porNome) {
    for (const rb of RUBRICAS) {
      const daRubrica = fichas.filter((f) => f.rubrica === rb.id);
      const media = consolidarRubrica(rb, daRubrica).nota;
      for (const f of daRubrica) {
        const crit = rb.criterios.map((c) => `${c.nome} (${c.peso}): ${nivel(f.notas?.[c.id]) || "–"}`);
        corpo.push([
          equipe.nome,
          rb.nome,
          f.quem?.nome ?? f.avaliador,
          ...crit,
          ...Array<string>(maxCrit - crit.length).fill(""),
          num(notaFicha(rb, f.notas ?? {})),
          num(media),
          f.comentario ?? "",
        ]);
      }
    }
  }
  return [cab, ...corpo];
}
