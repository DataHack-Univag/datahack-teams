import { NextResponse, type NextRequest } from "next/server";
import { carregarAvaliacoes, carregarPenalidades, exigir } from "@/lib/dados";
import { compararRanking, consolidarEquipe, consolidarRubrica, notaFicha } from "@/lib/nota";
import { FASES, NIVEIS, PENALIDADES, RUBRICAS } from "@/lib/rubricas";
import { createClient } from "@/lib/supabase/server";

const num = (v: number | null) => (v === null ? "" : v.toFixed(1).replace(".", ","));
const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
/** Número bruto (até 4 casas, vírgula decimal) para fazer conta no Excel; vazio = sem avaliação. */
const bruto = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(Math.round(v * 10000) / 10000).replace(".", ",");

// ";" e BOM: abre certo no Excel em português (vírgula decimal).
function csv(nome: string, linhas: string[][]) {
  return new NextResponse("﻿" + linhas.map((l) => l.map(esc).join(";")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

// Exporta (CSV ";" com vírgula decimal):
//   padrão            → ranking consolidado;
//   ?tipo=analitico   → uma linha por equipe com todas as fases, rubricas e critérios em números;
//   ?tipo=brutos      → uma linha por critério de cada ficha (backup completo das notas);
//   ?tipo=fichas      → uma linha por ficha, com os níveis por extenso.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: ehOrg } = await supabase.rpc("eh_organizador");
  if (!ehOrg) return new NextResponse("Acesso restrito à organização.", { status: 403 });

  const [rEquipes, fichasOuNull, penalidades] = await Promise.all([
    supabase
      .from("equipes")
      .select("id, nome, membros(email, inscritos(nome))")
      .order("nome")
      .returns<{ id: string; nome: string; membros: { email: string; inscritos: { nome: string } | null }[] }[]>(),
    carregarAvaliacoes(supabase),
    carregarPenalidades(supabase),
  ]);
  const equipes = exigir(rEquipes, "equipes") ?? [];
  const fichas = fichasOuNull ?? [];

  const tipo = request.nextUrl.searchParams.get("tipo");
  const integrantes = (e: (typeof equipes)[number]) =>
    (e.membros ?? []).map((m) => m.inscritos?.nome ?? m.email).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const ranking = equipes
    .map((e) => {
      const pens = penalidades.get(e.id) ?? [];
      return { e, pens, r: consolidarEquipe(fichas.filter((f) => f.equipe_id === e.id), pens) };
    })
    .sort((a, b) => compararRanking(a.r, b.r));

  // ------------------------------------------------ tabela analítica: uma linha por equipe, tudo em números
  // Para cada fase → cada rubrica → cada critério: fator médio (0–1) e pontos na rubrica (peso × fator).
  // Depois: nota da rubrica (0–100), pontos na nota final, nota/pontos da fase, penalidades e nota final.
  if (tipo === "analitico") {
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

    const corpo = ranking.map(({ e, pens, r }, i) => {
      const nomes = integrantes(e);
      const l = [String(i + 1), e.id, e.nome, String(nomes.length), nomes.join(", ")];
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
        ...PENALIDADES.map((p) => (pens.includes(p.id) ? bruto(p.pontos) : "0")),
        bruto(r.penalidades),
        bruto(bruta),
        bruto(r.final),
        r.completa ? "1" : "0",
        ...r.desempate.map(bruto),
      );
      return l;
    });
    return csv("avaliacao-analitica-datahack", [cab, ...corpo]);
  }

  // ------------------------------------------------ dados brutos: uma linha por critério de cada ficha (backup)
  if (tipo === "brutos") {
    const cab = [
      "equipe_id",
      "equipe",
      "fase",
      "rubrica",
      "rubrica_nome",
      "rubrica_peso_final",
      "avaliador_email",
      "avaliador_nome",
      "criterio_id",
      "criterio_nome",
      "criterio_peso",
      "nivel",
      "fator",
      "pontos_criterio",
      "nota_da_ficha_0a100",
      "ficha_id",
      "atualizado_em",
      "comentario",
    ];
    const nomeEquipe = new Map(equipes.map((e) => [e.id, e.nome]));
    const ordenadas = [...fichas].sort(
      (a, b) =>
        (nomeEquipe.get(a.equipe_id) ?? "").localeCompare(nomeEquipe.get(b.equipe_id) ?? "", "pt-BR") ||
        a.rubrica.localeCompare(b.rubrica) ||
        a.avaliador.localeCompare(b.avaliador),
    );
    const linhas: string[][] = [];
    for (const f of ordenadas) {
      const rb = RUBRICAS.find((r) => r.id === f.rubrica);
      if (!rb) continue;
      const nota = notaFicha(rb, f.notas ?? {});
      for (const c of rb.criterios) {
        const v = f.notas?.[c.id];
        const tem = typeof v === "number";
        linhas.push([
          f.equipe_id,
          nomeEquipe.get(f.equipe_id) ?? "",
          rb.fase,
          rb.id,
          rb.nome,
          String(rb.pesoFinal),
          f.avaliador,
          f.quem?.nome ?? "",
          c.id,
          c.nome,
          String(c.peso),
          tem ? (NIVEIS.find((n) => n.fator === v)?.nome ?? "") : "",
          tem ? bruto(v) : "",
          tem ? bruto(c.peso * v) : "",
          bruto(nota),
          f.id,
          f.atualizado_em,
          f.comentario ?? "",
        ]);
      }
    }
    return csv("avaliacao-dados-brutos-datahack", [cab, ...linhas]);
  }

  // ------------------------------------------------ uma linha por ficha (equipe × rubrica × avaliador)
  if (tipo === "fichas") {
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
    const linhas: string[][] = [];
    for (const e of equipes) {
      for (const rb of RUBRICAS) {
        const daRubrica = fichas.filter((f) => f.equipe_id === e.id && f.rubrica === rb.id);
        const media = consolidarRubrica(rb, daRubrica).nota;
        for (const f of daRubrica) {
          const crit = rb.criterios.map(
            (c) => `${c.nome} (${c.peso}): ${NIVEIS.find((n) => n.fator === f.notas?.[c.id])?.nome ?? "–"}`,
          );
          linhas.push([
            e.nome,
            rb.nome,
            f.quem?.nome ?? f.avaliador,
            ...crit,
            ...Array(maxCrit - crit.length).fill(""),
            num(notaFicha(rb, f.notas ?? {})),
            num(media),
            f.comentario ?? "",
          ]);
        }
      }
    }
    return csv("notas-por-avaliador-datahack", [cab, ...linhas]);
  }

  // ------------------------------------------------ ranking (uma linha por equipe)
  const cab = [
    "posicao",
    "equipe",
    ...RUBRICAS.flatMap((r) => [`${r.id} media (${r.pesoFinal}%)`, `${r.id} avaliadores`]),
    "penalidades",
    "nota_final",
    "completa",
  ];
  const corpo = ranking.map(({ e, pens, r }, i) => [
    String(i + 1),
    e.nome,
    ...RUBRICAS.flatMap((rb) => [num(r.rubricas[rb.id].nota), String(r.rubricas[rb.id].avaliadores)]),
    `${r.penalidades}${pens.length ? ` (${pens.join(", ")})` : ""}`,
    num(r.final),
    r.completa ? "sim" : "nao",
  ]);
  return csv("ranking-datahack", [cab, ...corpo]);
}
