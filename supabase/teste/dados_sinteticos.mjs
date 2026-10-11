// Gera dados SINTÉTICOS no formato do esquema antigo (migrações 001–009), parecidos em volume
// com a edição de 2026: ~70 pessoas, 8 equipes, ~117 fichas, trocas, links e penalidades.
// Nenhum dado real. Uso:  node supabase/teste/dados_sinteticos.mjs > dados.sql

import { readFileSync } from "node:fs";

const reg = JSON.parse(readFileSync(new URL("../../config/regulamento_2026.json", import.meta.url), "utf8"));

// Gerador pseudoaleatório com semente fixa (o mesmo arquivo sempre).
let s = 20261010;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const escolha = (xs) => xs[Math.floor(rnd() * xs.length)];
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const linhas = [];
const pessoas = [];
const add = (papel, n) => {
  for (let i = 0; i < n; i++) {
    const k = pessoas.length + 1;
    pessoas.push({ email: `p${k}@teste.local`, nome: `Pessoa ${k}`, papel, curso: escolha(["ADS", "SI", "ENG SOFTWARE"]), semestre: 1 + Math.floor(rnd() * 8) });
  }
};
add("aluno", 55);
add("organizador", 6);
add("avaliador_tecnico", 5);
add("avaliador_negocio", 4);

for (const p of pessoas)
  linhas.push(`insert into inscritos (email, nome, curso, semestre, papel) values (${q(p.email)}, ${q(p.nome)}, ${q(p.curso)}, ${p.papel === "aluno" ? p.semestre : "null"}, ${q(p.papel)});`);
for (const p of pessoas.filter((p) => p.papel === "aluno").slice(0, 50))
  linhas.push(`insert into notas (email, nota) values (${q(p.email)}, ${(5 + rnd() * 5).toFixed(2)});`);

linhas.push(`update configuracao set max_membros = 6, edicao_bloqueada = false, avaliacao_encerrada = true where id = 1;`);

const alunos = pessoas.filter((p) => p.papel === "aluno");
const equipes = [];
for (let i = 0; i < 8; i++) {
  const id = uuid(i + 1);
  equipes.push(id);
  const repo = i < 7 ? `'https://github.com/teste/repo-${i + 1}'` : "null";
  linhas.push(`insert into equipes (id, nome, repo_github, repo_publico) values ('${id}', 'Equipe ${String(i + 1).padStart(2, "0")}', ${repo}, ${i < 6 ? "true" : "null"});`);
}
// 41 alunos em equipes (5 ou 6 por equipe); 14 sem equipe.
let a = 0;
equipes.forEach((id, i) => {
  const n = i < 1 ? 6 : 5;
  for (let k = 0; k < n; k++) linhas.push(`insert into membros (email, equipe_id) values (${q(alunos[a++].email)}, '${id}');`);
  linhas.push(`update equipes set lider_email = (select email from membros where equipe_id = '${id}' order by email limit 1) where id = '${id}';`);
});
equipes.forEach((id, i) => {
  if (i % 2 === 0) linhas.push(`insert into links (equipe_id, categoria, url) values ('${id}', 'apresentacao', 'https://exemplo.com/l${i}');`);
});
linhas.push(`insert into materiais (titulo, categoria, url, destaque) values ('Desafio', 'desafio', 'https://exemplo.com/d', true);`);

// Trocas: algumas de cada situação (gravadas direto, como histórico).
for (let i = 0; i < 12; i++) {
  const quem = alunos[i * 3];
  const st = escolha(["aceita", "recusada", "cancelada"]);
  linhas.push(`insert into trocas (solicitante, solicitante_nome, equipe_origem, equipe_destino, status, respondido_em) values (${q(quem.email)}, ${q(quem.nome)}, '${equipes[i % 8]}', '${equipes[(i + 1) % 8]}', '${st}', now());`);
}

// Fichas: professores nos pitches F1/F2, organização nas mesas e no F3, negócio no NEG.
const porBanca = {
  professores: pessoas.filter((p) => p.papel === "avaliador_tecnico"),
  organizacao: pessoas.filter((p) => p.papel === "organizador"),
  negocio: pessoas.filter((p) => p.papel === "avaliador_negocio"),
};
const fatores = reg.niveis.map((n) => n.fator);
let fichas = 0;
for (const eq of equipes) {
  for (const r of reg.rubricas) {
    const banca = porBanca[r.banca];
    const qtd = r.banca === "negocio" ? 3 : 2;
    for (let k = 0; k < qtd && fichas < 117; k++) {
      const av = banca[(k + equipes.indexOf(eq)) % banca.length];
      const notas = {};
      for (const c of r.criterios) if (rnd() > 0.05) notas[c.codigo] = escolha(fatores);
      linhas.push(`insert into avaliacoes (equipe_id, avaliador, rubrica, notas, comentario) values ('${eq}', ${q(av.email)}, ${q(r.codigo)}, '${JSON.stringify(notas)}', ${rnd() > 0.5 ? "'comentário sintético'" : "null"});`);
      fichas++;
    }
  }
}
linhas.push(`insert into penalidades_aplicadas (equipe_id, penalidade) values ('${equipes[2]}', 'celulas'), ('${equipes[5]}', 'tempo');`);

console.log("begin;\n" + linhas.join("\n") + "\ncommit;");
