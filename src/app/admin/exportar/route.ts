import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigir, SELECT_EQUIPE } from "@/lib/dados";
import { rotuloCategoria, type Equipe } from "@/lib/tipos";

// Exporta um CSV (uma linha por integrante) para a organização.
export async function GET() {
  const supabase = await createClient();
  const { data: ehOrg } = await supabase.rpc("eh_organizador");
  if (!ehOrg) return new NextResponse("Acesso restrito à organização.", { status: 403 });

  const data = exigir(
    await supabase.from("equipes").select(SELECT_EQUIPE).order("nome").returns<Equipe[]>(),
    "equipes",
  );

  const cab = ["equipe", "repo_github", "repo_publico", "integrante", "email", "curso", "semestre", "lider", "links"];
  const linhas: string[][] = [];
  for (const e of data ?? []) {
    const links = e.links.map((l) => `${rotuloCategoria(l.categoria)}: ${l.url}`).join(" | ");
    const publico = !e.repo_github
      ? "sem repositorio"
      : e.repo_publico === null
        ? "nao verificado"
        : e.repo_publico
          ? "sim"
          : "nao";
    const membros = e.membros.length ? e.membros : [null];
    for (const m of membros) {
      linhas.push([
        e.nome,
        e.repo_github ?? "",
        publico,
        m?.inscritos?.nome ?? "",
        m?.email ?? "",
        m?.inscritos?.curso ?? "",
        String(m?.inscritos?.semestre ?? ""),
        m && m.email === e.lider_email ? "sim" : "",
        links,
      ]);
    }
  }

  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  // BOM para o Excel abrir acentos corretamente.
  const csv = "﻿" + [cab, ...linhas].map((l) => l.map(esc).join(",")).join("\r\n");
  const data_ = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="equipes-datahack-${data_}.csv"`,
    },
  });
}
