// Regulamento da avaliação de uma edição (fases, rubricas, critérios, níveis, penalidades e
// desempate). Vem do banco (por edição); o formato canônico em JSON é o mesmo de
// config/regulamento_2026.json e de public.exportar_regulamento().
//
// Os "id" de rubrica, fase, critério e penalidade são os CÓDIGOS (ex.: "F1_PITCH"), estáveis
// entre edições; o "uuid" é o registro no banco (usado para gravar fichas e penalidades).

export type RubricaId = string;
export type FaseId = string;
/** Código da banca (ex.: "professores", "organizacao", "negocio"). */
export type Banca = string;

export type Nivel = { nome: string; fator: number };
export type Criterio = {
  id: string;
  uuid?: string;
  nome: string;
  peso: number;
  descricao: string;
  /** Descrição de cada nível, na ordem dos níveis da edição. */
  niveis: string[];
};
export type Rubrica = {
  id: RubricaId;
  uuid?: string;
  fase: FaseId;
  parte: string;
  /** Rótulo curto para abas e tabelas (ex.: "F1 · Pitch"). */
  curto: string;
  nome: string;
  banca: Banca;
  bancaTexto: string;
  pesoFinal: number;
  momento: string;
  criterios: Criterio[];
};
export type Fase = { id: FaseId; nome: string; peso: number; partes: RubricaId[] };
export type BancaInfo = { codigo: Banca; nome: string; daOrganizacao: boolean };
export type Penalidade = { id: string; uuid?: string; pontos: number; texto: string };
export type RegraDesempate =
  | { descricao: string; tipo: "rubrica"; rubrica: RubricaId }
  | { descricao: string; tipo: "criterio"; rubrica: RubricaId; criterio: string }
  | { descricao: string; tipo: "manual" };

export type Regulamento = {
  niveis: Nivel[];
  fases: Fase[];
  rubricas: Rubrica[];
  bancas: BancaInfo[];
  penalidades: Penalidade[];
  desempate: RegraDesempate[];
  formula: string;
  desclassificacao: string;
};

/** Formato canônico (JSON) do regulamento. */
export type RegulamentoCanonico = {
  bancas: { codigo: string; nome: string; da_organizacao?: boolean }[];
  niveis: { nome: string; fator: number }[];
  fases: { codigo: string; nome: string; peso: number }[];
  rubricas: {
    codigo: string;
    fase: string;
    banca: string;
    parte?: string | null;
    nome: string;
    curto?: string | null;
    peso_final: number;
    momento?: string | null;
    criterios: { codigo: string; nome: string; peso: number; descricao?: string | null; niveis: { fator: number; descricao: string }[] }[];
  }[];
  penalidades: { codigo: string; texto: string; pontos: number }[];
  desempate: { descricao: string; tipo: string; rubrica?: string | null; criterio?: string | null }[];
  formula?: string | null;
  desclassificacao?: string | null;
};

const num = (v: number | string) => Number(v);

/** Monta o regulamento a partir do formato canônico (o banco devolve o mesmo formato). */
export function regulamentoDoCanonico(c: RegulamentoCanonico, uuids?: { rubricas?: Record<string, string>; criterios?: Record<string, string>; penalidades?: Record<string, string> }): Regulamento {
  const niveis = [...c.niveis].map((n) => ({ nome: n.nome, fator: num(n.fator) }));
  const nomeBanca = new Map(c.bancas.map((b) => [b.codigo, b.nome]));
  const rubricas: Rubrica[] = c.rubricas.map((r) => ({
    id: r.codigo,
    uuid: uuids?.rubricas?.[r.codigo],
    fase: r.fase,
    parte: r.parte ?? "",
    curto: r.curto || r.codigo,
    nome: r.nome,
    banca: r.banca,
    bancaTexto: nomeBanca.get(r.banca) ?? r.banca,
    pesoFinal: num(r.peso_final),
    momento: r.momento ?? "",
    criterios: r.criterios.map((k) => ({
      id: k.codigo,
      uuid: uuids?.criterios?.[`${r.codigo}.${k.codigo}`],
      nome: k.nome,
      peso: num(k.peso),
      descricao: k.descricao ?? "",
      niveis: niveis.map((n) => k.niveis.find((x) => num(x.fator) === n.fator)?.descricao ?? ""),
    })),
  }));
  return {
    niveis,
    bancas: c.bancas.map((b) => ({ codigo: b.codigo, nome: b.nome, daOrganizacao: !!b.da_organizacao })),
    fases: c.fases.map((f) => ({ id: f.codigo, nome: f.nome, peso: num(f.peso), partes: rubricas.filter((r) => r.fase === f.codigo).map((r) => r.id) })),
    rubricas,
    penalidades: c.penalidades.map((p) => ({ id: p.codigo, uuid: uuids?.penalidades?.[p.codigo], pontos: num(p.pontos), texto: p.texto })),
    desempate: c.desempate.map((d): RegraDesempate => {
      if (d.tipo === "rubrica" && d.rubrica) return { descricao: d.descricao, tipo: "rubrica", rubrica: d.rubrica };
      if (d.tipo === "criterio" && d.rubrica && d.criterio) return { descricao: d.descricao, tipo: "criterio", rubrica: d.rubrica, criterio: d.criterio };
      return { descricao: d.descricao, tipo: "manual" };
    }),
    formula: c.formula ?? "",
    desclassificacao: c.desclassificacao ?? "",
  };
}

/** Problemas de consistência do regulamento (para mostrar à organização antes de usar). */
export function conferirRegulamento(reg: Regulamento): string[] {
  const erros: string[] = [];
  for (const f of reg.fases) {
    const soma = reg.rubricas.filter((r) => r.fase === f.id).reduce((s, r) => s + r.pesoFinal, 0);
    if (Math.abs(soma - f.peso) > 1e-9) erros.push(`${f.nome}: as rubricas somam ${soma}%, mas a fase vale ${f.peso}%.`);
  }
  const total = reg.rubricas.reduce((s, r) => s + r.pesoFinal, 0);
  if (reg.rubricas.length && Math.abs(total - 100) > 1e-9) erros.push(`As rubricas somam ${total}% da nota final (o esperado é 100%).`);
  for (const r of reg.rubricas) {
    const soma = r.criterios.reduce((s, c) => s + c.peso, 0);
    if (Math.abs(soma - 100) > 1e-9) erros.push(`${r.nome}: os critérios somam ${soma} (o esperado é 100).`);
  }
  return erros;
}

export const rubricaDe = (reg: Regulamento, id: string) => reg.rubricas.find((r) => r.id === id);
export const fasesDe = (reg: Regulamento) => reg.fases;

// ---------------------------------------------------------------- importação (JSON escrito por pessoas ou IAs)

/**
 * Confere a estrutura do JSON antes de importar e diz onde está cada problema (heurística 9):
 * códigos que não existem, níveis que não batem, desempate apontando para o vazio.
 * Os pesos são conferidos depois, por conferirRegulamento.
 */
export function conferirEstrutura(j: unknown): string[] {
  const c = j as RegulamentoCanonico;
  const e: string[] = [];
  const lista = (v: unknown) => Array.isArray(v) && v.length > 0;
  if (!c || typeof c !== "object") return ["O JSON precisa ser um objeto { … } com bancas, niveis, fases, rubricas, penalidades e desempate."];
  for (const k of ["bancas", "niveis", "fases", "rubricas"] as const) if (!lista(c[k])) e.push(`Falta a lista “${k}” (com pelo menos um item).`);
  if (!Array.isArray(c.penalidades)) e.push("Falta a lista “penalidades” (pode ser vazia: []).");
  if (!Array.isArray(c.desempate)) e.push("Falta a lista “desempate” (pode ser só a decisão manual).");
  if (e.length) return e;

  const codigo = /^[a-z0-9_]+$/i;
  const bancas = new Set(c.bancas.map((b) => b.codigo));
  const fases = new Set(c.fases.map((f) => f.codigo));
  const fatores = c.niveis.map((n) => Number(n.fator)).sort();
  c.bancas.forEach((b, i) => !codigo.test(b.codigo ?? "") && e.push(`Banca ${i + 1}: “codigo” só pode ter letras minúsculas, números e _ (ex.: professores).`));
  if (c.bancas.filter((b) => b.da_organizacao).length !== 1) e.push("Marque exatamente uma banca com \"da_organizacao\": true (a banca da organização).");
  if (c.niveis.some((n) => !(Number(n.fator) >= 0 && Number(n.fator) <= 1))) e.push("Cada nível precisa de um “fator” entre 0 e 1 (ex.: 0, 0.5, 0.8, 1).");
  const rubricas = new Map<string, Set<string>>();
  c.rubricas.forEach((r, i) => {
    const onde = `Rubrica ${r.codigo || i + 1}`;
    if (!r.codigo || !codigo.test(r.codigo)) e.push(`${onde}: “codigo” só pode ter letras, números e _ (ex.: F1_PITCH).`);
    if (!fases.has(r.fase)) e.push(`${onde}: a fase “${r.fase}” não existe em “fases”.`);
    if (!bancas.has(r.banca)) e.push(`${onde}: a banca “${r.banca}” não existe em “bancas”.`);
    if (!lista(r.criterios)) e.push(`${onde}: precisa de pelo menos um critério.`);
    rubricas.set(r.codigo, new Set((r.criterios ?? []).map((x) => x.codigo)));
    (r.criterios ?? []).forEach((x, k) => {
      const fx = (x.niveis ?? []).map((n) => Number(n.fator)).sort();
      if (fx.join() !== fatores.join()) e.push(`${onde}, critério ${x.codigo || k + 1}: precisa de uma descrição para cada nível (fatores ${fatores.join(", ")}).`);
    });
  });
  c.penalidades.forEach((p, i) => !(Number(p.pontos) <= 0) && e.push(`Penalidade ${p.codigo || i + 1}: “pontos” precisa ser zero ou negativo (ex.: -5).`));
  c.desempate.forEach((d, i) => {
    const onde = `Desempate ${i + 1}`;
    if (!["rubrica", "criterio", "manual"].includes(d.tipo)) e.push(`${onde}: “tipo” precisa ser rubrica, criterio ou manual.`);
    if (d.tipo !== "manual" && !rubricas.has(d.rubrica ?? "")) e.push(`${onde}: a rubrica “${d.rubrica}” não existe.`);
    if (d.tipo === "criterio" && !rubricas.get(d.rubrica ?? "")?.has(d.criterio ?? "")) e.push(`${onde}: o critério “${d.criterio}” não existe na rubrica “${d.rubrica}”.`);
  });
  return e.slice(0, 15);
}

/** Texto para colar numa IA: ela devolve o regulamento no formato que o sistema importa. */
export function instrucoesRegulamentoIA(): string {
  return `Gere o regulamento de avaliação de um hackathon em JSON, exatamente neste formato e sem nenhum texto fora do JSON:

{
  "bancas": [
    { "codigo": "professores", "nome": "Banca de professores" },
    { "codigo": "organizacao", "nome": "Organização", "da_organizacao": true },
    { "codigo": "negocio", "nome": "Jurados de negócio" }
  ],
  "niveis": [
    { "nome": "Insuficiente", "fator": 0 }, { "nome": "Básico", "fator": 0.5 },
    { "nome": "Proficiente", "fator": 0.8 }, { "nome": "Excelente", "fator": 1 }
  ],
  "fases": [ { "codigo": "F1", "nome": "Fase 1 · Exploração", "peso": 60 }, { "codigo": "NEG", "nome": "Pitch final", "peso": 40 } ],
  "rubricas": [
    { "codigo": "F1_PITCH", "fase": "F1", "banca": "professores", "parte": "pitch", "nome": "Fase 1 · Pitch", "curto": "F1 · Pitch",
      "peso_final": 60, "momento": "10:45, pitch de 3 min",
      "criterios": [
        { "codigo": "problema", "nome": "Entendimento do desafio", "peso": 100, "descricao": "O que a banca observa.",
          "niveis": [ { "fator": 0, "descricao": "…" }, { "fator": 0.5, "descricao": "…" }, { "fator": 0.8, "descricao": "…" }, { "fator": 1, "descricao": "…" } ] }
      ] },
    { "codigo": "NEG", "fase": "NEG", "banca": "negocio", "parte": "negocio", "nome": "Pitch final", "curto": "Negócio", "peso_final": 40, "criterios": [ … ] }
  ],
  "penalidades": [ { "codigo": "tempo", "texto": "Estourar o tempo do pitch", "pontos": -2 } ],
  "desempate": [
    { "descricao": "Maior nota no pitch final", "tipo": "rubrica", "rubrica": "NEG" },
    { "descricao": "Decisão conjunta das bancas", "tipo": "manual" }
  ],
  "formula": "Nota final = 60% × F1_PITCH + 40% × NEG + penalidades",
  "desclassificacao": "Plágio ou dados que não sejam públicos."
}

Regras:
- Os pesos das fases somam 100. Em cada fase, os "peso_final" das rubricas dela somam o peso da fase.
- Em cada rubrica, os "peso" dos critérios somam 100.
- Cada critério tem uma descrição para CADA nível (mesmos fatores da lista "niveis").
- "fase" e "banca" de cada rubrica usam os códigos definidos acima. Exatamente uma banca tem "da_organizacao": true.
- Códigos só com letras, números e _ (sem espaço nem acento). "parte" pode ser "pitch", "mesa" ou "negocio".
- Penalidades têm "pontos" negativos. O desempate é uma lista em ordem; o último costuma ser "manual".
- Escreva as descrições dos níveis de forma objetiva: o que a banca vê em cada nível.`;
}
