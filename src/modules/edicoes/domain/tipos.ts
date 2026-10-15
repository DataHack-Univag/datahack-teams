// Edição do evento: cada DATAHack é uma edição, com regras, formato e regulamento próprios.

import type { Acesso, Aprovacao, MarcaEdicao } from "@/modules/instituicoes/domain/tipos";

export type ModoFormacao = "organizacao" | "gerador" | "alunos_propoem";
export type SituacaoEdicao = "planejada" | "inscricoes" | "em_andamento" | "encerrada";

export type Edicao = {
  id: string;
  numero: number;
  slug: string;
  nome: string;
  descricao: string | null;
  formato: string | null;
  local: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  situacao: SituacaoEdicao;
  atual: boolean;
  modo_formacao: ModoFormacao;
  permite_trocas: boolean;
  min_membros: number;
  max_membros: number;
  equipes_travadas: boolean;
  avaliacao_encerrada: boolean;
  formula: string | null;
  desclassificacao: string | null;
  metadados: Record<string, unknown>;
  criado_em: string;
  /** Quem pode participar (migração 017; antes dela, toda edição é "lista"). */
  acesso?: Acesso;
  aprovacao?: Aprovacao;
  vagas?: number | null;
  inscricao_abre_em?: string | null;
  inscricao_fecha_em?: string | null;
  marca?: MarcaEdicao;
};

export const MODOS_FORMACAO: { valor: ModoFormacao; rotulo: string; descricao: string }[] = [
  { valor: "gerador", rotulo: "Gerador da organização", descricao: "A organização sorteia equipes equilibradas por semestre e nota." },
  { valor: "organizacao", rotulo: "Organização monta à mão", descricao: "A organização cria cada equipe e escolhe os integrantes." },
  {
    valor: "alunos_propoem",
    rotulo: "Alunos propõem",
    descricao: "Um aluno propõe a equipe e convida os colegas; com todos confirmados, a organização aprova.",
  },
];

export const SITUACOES_EDICAO: { valor: SituacaoEdicao; rotulo: string; descricao: string }[] = [
  { valor: "planejada", rotulo: "Planejada", descricao: "Em preparação; ainda não aberta aos alunos." },
  { valor: "inscricoes", rotulo: "Inscrições", descricao: "Recebendo inscrições e formando equipes." },
  { valor: "em_andamento", rotulo: "Em andamento", descricao: "O evento está acontecendo." },
  { valor: "encerrada", rotulo: "Encerrada", descricao: "Só consulta para alunos e bancas; a organização ainda edita." },
];

export const rotuloModo = (m: string) => MODOS_FORMACAO.find((x) => x.valor === m)?.rotulo ?? m;
export const rotuloSituacaoEdicao = (s: string) => SITUACOES_EDICAO.find((x) => x.valor === s)?.rotulo ?? s;

/** "09 a 10/10/2026", "08/10/2027" ou "sem data". */
export function periodo(e: Pick<Edicao, "data_inicio" | "data_fim">): string {
  const br = (d: string) => d.split("-").reverse().join("/");
  if (!e.data_inicio) return "sem data definida";
  if (!e.data_fim || e.data_fim === e.data_inicio) return br(e.data_inicio);
  const [ai, mi, di] = e.data_inicio.split("-");
  const [af, mf, df] = e.data_fim.split("-");
  if (ai === af && mi === mf) return `${di} a ${df}/${mf}/${af}`;
  return `${br(e.data_inicio)} a ${br(e.data_fim)}`;
}

/** Alunos podem mexer nas equipes nesta edição? */
export const equipesLiberadas = (e: Pick<Edicao, "equipes_travadas" | "situacao">) => !e.equipes_travadas && e.situacao !== "encerrada";
