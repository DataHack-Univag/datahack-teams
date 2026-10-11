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
