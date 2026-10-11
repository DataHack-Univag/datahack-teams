// Gera supabase/seed.sql a partir da planilha de inscrições exportada (TSV), para uma edição.
// Uso: node scripts/gerar_seed.mjs "INSCRIÇÕES.txt" supabase/seed.sql [slug-da-edicao]
//   slug padrão: datahack-2026 (a edição precisa existir: crie em Organização → Edições).
// Colunas esperadas: Inscrito, Status inscrição, Curso, Semestre, Coeficiente, E-mail.

import { readFileSync, writeFileSync } from "node:fs";

const [, , origem = "INSCRIÇÕES.txt", destino = "supabase/seed.sql", slug = "datahack-2026"] = process.argv;

// O Excel exporta "Texto Unicode" como UTF-16 LE com BOM.
const buf = readFileSync(origem);
const texto =
  buf[0] === 0xff && buf[1] === 0xfe ? buf.toString("utf16le").slice(1) : buf.toString("utf8").replace(/^﻿/, "");

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const pessoas = [];
const participacoes = [];
const notas = [];

for (const linha of texto.split(/\r?\n/).slice(1)) {
  if (!linha.trim()) continue;
  const [nome, status, curso, semestre, coef, email] = linha.split("\t").map((s) => (s ?? "").trim());
  if (status.toLowerCase() !== "ativa" || !email) continue;

  const e = email.toLowerCase();
  pessoas.push(`  (${q(e)}, ${q(nome)})`);
  participacoes.push(`  (${q(e)}, ${q(curso)}, ${parseInt(semestre, 10) || "null"})`);
  const nota = parseFloat(coef.replace(",", "."));
  // 0 ou vazio = ainda sem nota (ex.: calouro).
  notas.push(`  (${q(e)}, ${nota > 0 ? nota : "null"})`);
}

const sql = `-- Inscritos da edição ${slug} (gerado por scripts/gerar_seed.mjs). NÃO VERSIONAR (dados pessoais).
-- Apenas inscrições com status "ativa". Pode ser rodado várias vezes (upsert).
-- Rodar DEPOIS das migrações (supabase/migrations) e com a edição ${slug} já criada.

-- Cadastro único das pessoas.
insert into public.pessoas (email, nome) values
${pessoas.join(",\n")}
on conflict (email) do update set nome = excluded.nome;

-- Participação como aluno nesta edição (curso e semestre deste ano).
insert into public.participacoes (edicao_id, email, papel, curso, semestre)
select e.id, v.email, 'aluno', v.curso, v.semestre
  from public.edicoes e,
       (values
${participacoes.map((l) => "  " + l).join(",\n")}
       ) as v(email, curso, semestre)
 where e.slug = ${q(slug)}
on conflict (edicao_id, email) do update set curso = excluded.curso, semestre = excluded.semestre;

-- Organização da edição (acesso à área da organização). Outras pessoas: cadastre pelo sistema em Pessoas.
insert into public.pessoas (email, nome) values ('stolpe02@gmail.com', 'Organização') on conflict (email) do nothing;
insert into public.participacoes (edicao_id, email, papel, banca_id)
select e.id, 'stolpe02@gmail.com', 'organizador', (select b.id from public.bancas b where b.edicao_id = e.id and b.da_organizacao limit 1)
  from public.edicoes e where e.slug = ${q(slug)}
on conflict (edicao_id, email) do update set papel = 'organizador', banca_id = excluded.banca_id;

-- Nota média (coeficiente de rendimento) desta edição. Só a organização enxerga.
insert into public.notas (edicao_id, email, nota)
select e.id, v.email, v.nota
  from public.edicoes e,
       (values
${notas.map((l) => "  " + l).join(",\n")}
       ) as v(email, nota)
 where e.slug = ${q(slug)}
on conflict (edicao_id, email) do update set nota = excluded.nota;
`;

writeFileSync(destino, sql);
console.log(`${pessoas.length} inscritos da edição ${slug} gravados em ${destino}`);
