// Gera supabase/seed.sql a partir da planilha de inscrições exportada (TSV).
// Uso: node supabase/gerar_seed.mjs "INSCRIÇÕES.txt" supabase/seed.sql
// Colunas esperadas: Inscrito, Status inscrição, Curso, Semestre, Coeficiente, E-mail.

import { readFileSync, writeFileSync } from "node:fs";

const [, , origem = "INSCRIÇÕES.txt", destino = "supabase/seed.sql"] = process.argv;

// O Excel exporta "Texto Unicode" como UTF-16 LE com BOM.
const buf = readFileSync(origem);
const texto =
  buf[0] === 0xff && buf[1] === 0xfe ? buf.toString("utf16le").slice(1) : buf.toString("utf8").replace(/^﻿/, "");

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const inscritos = [];
const notas = [];

for (const linha of texto.split(/\r?\n/).slice(1)) {
  if (!linha.trim()) continue;
  const [nome, status, curso, semestre, coef, email] = linha.split("\t").map((s) => (s ?? "").trim());
  if (status.toLowerCase() !== "ativa" || !email) continue;

  const e = email.toLowerCase();
  inscritos.push(`  (${q(e)}, ${q(nome)}, ${q(curso)}, ${parseInt(semestre, 10) || "null"}, 'aluno')`);
  const nota = parseFloat(coef.replace(",", "."));
  // 0 ou vazio = ainda sem nota (ex.: calouro).
  notas.push(`  (${q(e)}, ${nota > 0 ? nota : "null"})`);
}

const sql = `-- Lista de inscritos do DataHack Univag 2026 (gerada por supabase/gerar_seed.mjs).
-- Apenas inscrições com status "ativa". Pode ser rodado várias vezes (upsert).
-- Rodar DEPOIS de schema.sql e 002_organizacao.sql.

insert into public.inscritos (email, nome, curso, semestre, papel) values
${inscritos.join(",\n")}
on conflict (email) do update
  set nome = excluded.nome, curso = excluded.curso, semestre = excluded.semestre;

-- Organizadores (acesso à área da organização). Adicione outros e-mails aqui
-- ou cadastre direto pelo sistema em Organização → Organizadores.
insert into public.inscritos (email, nome, papel) values
  ('stolpe02@gmail.com', 'Organização', 'organizador')
on conflict (email) do update set papel = 'organizador';

-- Nota média (coeficiente de rendimento). Só organizadores enxergam (tabela notas).
insert into public.notas (email, nota) values
${notas.join(",\n")}
on conflict (email) do update set nota = excluded.nota;
`;

writeFileSync(destino, sql);
console.log(`${inscritos.length} inscritos gravados em ${destino}`);
