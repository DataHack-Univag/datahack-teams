import { NextResponse, type NextRequest } from "next/server";
import { carregarAvaliacoes, carregarPenalidades, exigir } from "@/lib/dados";
import { compararRanking, consolidarEquipe, consolidarRubrica, notaFicha } from "@/lib/nota";
import { NIVEIS, RUBRICAS } from "@/lib/rubricas";
import { createClient } from "@/lib/supabase/server";

const num = (v: number | null) => (v === null ? "" : v.toFixed(1).replace(".", ","));
const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;

// ";" e BOM: abre certo no Excel em português (vírgula decimal).
function csv(nome: string, linhas: string[][]) {
  return new NextResponse("﻿" + linhas.map((l) => l.map(esc).join(";")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

// Exporta o ranking consolidado (padrão) ou, com ?tipo=fichas, a nota de cada avaliador.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: ehOrg } = await supabase.rpc("eh_organizador");
  if (!ehOrg) return new NextResponse("Acesso restrito à organização.", { status: 403 });

  const [rEquipes, fichasOuNull, penalidades] = await Promise.all([
    supabase.from("equipes").select("id, nome").order("nome").returns<{ id: string; nome: string }[]>(),
    carregarAvaliacoes(supabase),
    carregarPenalidades(supabase),
  ]);
  const equipes = exigir(rEquipes, "equipes") ?? [];
  const fichas = fichasOuNull ?? [];

  // ------------------------------------------------ uma linha por ficha (equipe × rubrica × avaliador)
  if (request.nextUrl.searchParams.get("tipo") === "fichas") {
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
  const ranking = equipes
    .map((e) => {
      const pens = penalidades.get(e.id) ?? [];
      return { e, pens, r: consolidarEquipe(fichas.filter((f) => f.equipe_id === e.id), pens) };
    })
    .sort((a, b) => compararRanking(a.r, b.r));

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
