// Gera src/shared/db/tipos-banco.ts (formato do `supabase gen types typescript`) lendo a
// estrutura do schema public direto do Postgres. Só faz consultas de leitura.
//
// Uso (na pasta datahack-teams), com um usuário de leitura:
//   DATABASE_URL="postgresql://..." node scripts/gerar_tipos_banco.mjs
// Requer o psql instalado (ou PSQL=/caminho/psql).
//
// Com o Supabase CLI logado, o equivalente oficial é:
//   npx supabase gen types typescript --project-id <id> --schema public > src/shared/db/tipos-banco.ts

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (de preferência com um usuário só de leitura).");
  process.exit(1);
}
const psql = process.env.PSQL ?? "psql";

function consultar(sql) {
  const saida = execFileSync(psql, [url, "-At", "-q", "-v", "ON_ERROR_STOP=1", "-c", `select coalesce(json_agg(t), '[]') from (${sql}) t`], {
    encoding: "utf8",
  });
  return JSON.parse(saida);
}

const colunas = consultar(`
  select c.table_name tabela, c.column_name coluna, c.udt_name tipo, c.data_type tipo_dado,
         c.is_nullable = 'YES' nulo, c.column_default is not null or c.is_identity = 'YES' tem_padrao, c.ordinal_position pos
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
  order by c.table_name, c.ordinal_position`);

const chaves = consultar(`
  select con.conname nome, rel.relname tabela, ref.relname referencia,
         (select json_agg(a.attname order by k.i) from unnest(con.conkey) with ordinality k(n, i)
            join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n) colunas,
         (select json_agg(a.attname order by k.i) from unnest(con.confkey) with ordinality k(n, i)
            join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.n) colunas_ref,
         exists (select 1 from pg_constraint u where u.conrelid = con.conrelid and u.contype in ('p', 'u')
                 and u.conkey::int[] @> con.conkey::int[] and u.conkey::int[] <@ con.conkey::int[]) um_para_um
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_class ref on ref.oid = con.confrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where con.contype = 'f' and n.nspname = 'public' and ref.relnamespace = n.oid
  order by rel.relname, con.conname`);

const funcoes = consultar(`
  select p.proname nome, coalesce(p.proargnames, '{}') nomes_args,
         (select json_agg(format_type(t, null) order by i) from unnest(p.proargtypes) with ordinality a(t, i)) tipos_args,
         p.pronargdefaults padroes, format_type(p.prorettype, null) retorno, p.proretset conjunto
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
    and p.prorettype <> 'trigger'::regtype
  order by p.proname`);

function tipoTs(udt) {
  const base = udt.replace(/^_/, "");
  const lista = udt.startsWith("_");
  const t =
    {
      text: "string", varchar: "string", bpchar: "string", uuid: "string", citext: "string",
      timestamptz: "string", timestamp: "string", date: "string", time: "string", interval: "string",
      int2: "number", int4: "number", int8: "number", float4: "number", float8: "number", numeric: "number",
      bool: "boolean", json: "Json", jsonb: "Json",
    }[base] ?? "unknown";
  return lista ? `${t}[]` : t;
}

function tipoFormatado(f) {
  const lista = f.endsWith("[]");
  const base = f.replace(/\[\]$/, "");
  const t =
    {
      text: "string", "character varying": "string", uuid: "string", "timestamp with time zone": "string",
      integer: "number", bigint: "number", smallint: "number", numeric: "number", "double precision": "number",
      boolean: "boolean", json: "Json", jsonb: "Json", void: "undefined",
    }[base] ?? "unknown";
  return lista ? `${t}[]` : t;
}

const porTabela = new Map();
for (const c of colunas) {
  if (!porTabela.has(c.tabela)) porTabela.set(c.tabela, []);
  porTabela.get(c.tabela).push(c);
}

const ind = (n) => "  ".repeat(n);
let out = `// ARQUIVO GERADO por scripts/gerar_tipos_banco.mjs a partir do banco. Não edite à mão.
// Para atualizar depois de uma migração: veja o comentário no topo do script.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
`;
for (const [tabela, cols] of porTabela) {
  const row = cols.map((c) => `${ind(5)}${c.coluna}: ${tipoTs(c.tipo)}${c.nulo ? " | null" : ""};`).join("\n");
  const ins = cols
    .map((c) => `${ind(5)}${c.coluna}${c.nulo || c.tem_padrao ? "?" : ""}: ${tipoTs(c.tipo)}${c.nulo ? " | null" : ""};`)
    .join("\n");
  const upd = cols.map((c) => `${ind(5)}${c.coluna}?: ${tipoTs(c.tipo)}${c.nulo ? " | null" : ""};`).join("\n");
  const rels = chaves
    .filter((k) => k.tabela === tabela)
    .map(
      (k) => `${ind(5)}{
${ind(6)}foreignKeyName: "${k.nome}";
${ind(6)}columns: [${k.colunas.map((x) => `"${x}"`).join(", ")}];
${ind(6)}isOneToOne: ${k.um_para_um};
${ind(6)}referencedRelation: "${k.referencia}";
${ind(6)}referencedColumns: [${k.colunas_ref.map((x) => `"${x}"`).join(", ")}];
${ind(5)}},`,
    )
    .join("\n");
  out += `${ind(3)}${tabela}: {
${ind(4)}Row: {
${row}
${ind(4)}};
${ind(4)}Insert: {
${ins}
${ind(4)}};
${ind(4)}Update: {
${upd}
${ind(4)}};
${ind(4)}Relationships: [${rels ? "\n" + rels + "\n" + ind(4) : ""}];
${ind(3)}};
`;
}
out += `${ind(2)}};
${ind(2)}Views: { [_ in never]: never };
${ind(2)}Functions: {
`;
// Funções sobrecarregadas (ex.: minha_equipe() e minha_equipe(p_edicao)) viram uma união de assinaturas.
const assinaturas = new Map();
for (const f of funcoes) {
  const tipos = f.tipos_args ?? [];
  const nomes = f.nomes_args ?? [];
  const opcionais = tipos.length - f.padroes;
  const args = tipos.length
    ? `{ ${tipos.map((t, i) => `${nomes[i] || `arg${i}`}${i >= opcionais ? "?" : ""}: ${tipoFormatado(t)}`).join("; ")} }`
    : "Record<PropertyKey, never>";
  const ret = tipoFormatado(f.retorno);
  assinaturas.set(f.nome, [...(assinaturas.get(f.nome) ?? []), `{ Args: ${args}; Returns: ${f.conjunto ? `${ret}[]` : ret} }`]);
}
for (const [nome, lista] of assinaturas) out += `${ind(3)}${nome}: ${lista.join(" | ")};\n`;
out += `${ind(2)}};
${ind(2)}Enums: { [_ in never]: never };
${ind(2)}CompositeTypes: { [_ in never]: never };
  };
};

type Publico = Database["public"];
/** Linha de uma tabela: Linha<"equipes">. */
export type Linha<T extends keyof Publico["Tables"]> = Publico["Tables"][T]["Row"];
export type NovaLinha<T extends keyof Publico["Tables"]> = Publico["Tables"][T]["Insert"];
`;

writeFileSync("src/shared/db/tipos-banco.ts", out);
console.log(`ok: ${porTabela.size} tabelas, ${chaves.length} chaves estrangeiras, ${funcoes.length} funções`);
