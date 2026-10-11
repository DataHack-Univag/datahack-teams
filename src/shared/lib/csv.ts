// CSV para o Excel em português: separador ";" e BOM (acentos certos ao abrir).

const celula = (v: string) => `"${v.replaceAll('"', '""')}"`;

/** Número cru (até 4 casas, vírgula decimal) para fazer conta no Excel; null vira vazio. */
export const numeroCsv = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(Math.round(v * 10000) / 10000).replace(".", ",");

export function respostaCsv(nomeArquivo: string, linhas: string[][], separador = ";") {
  const corpo = "﻿" + linhas.map((l) => l.map(celula).join(separador)).join("\r\n");
  const dia = new Date().toISOString().slice(0, 10);
  return new Response(corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}-${dia}.csv"`,
    },
  });
}
