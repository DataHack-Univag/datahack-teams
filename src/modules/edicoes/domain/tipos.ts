// Edição do evento: cada DATAHack é uma edição, com regras, formato e regulamento próprios.

import type { Acesso, Aprovacao, MarcaEdicao } from "@/modules/instituicoes/domain/tipos";

export type ModoFormacao = "organizacao" | "gerador" | "alunos_propoem";
export type SituacaoEdicao = "planejada" | "inscricoes" | "em_andamento" | "encerrada" | "cancelada";

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
  /** Migração 031: por que a edição foi cancelada e quando. */
  motivo_cancelamento?: string | null;
  cancelada_em?: string | null;
  marca?: MarcaEdicao;
};

export const MODOS_FORMACAO: { valor: ModoFormacao; rotulo: string; descricao: string }[] = [
  { valor: "gerador", rotulo: "Gerador da organização", descricao: "A organização sorteia equipes equilibradas por semestre e nota." },
  { valor: "organizacao", rotulo: "Organização monta à mão", descricao: "A organização cria cada equipe e escolhe os integrantes." },
  {
    valor: "alunos_propoem",
    rotulo: "Participantes propõem",
    descricao: "Um participante propõe a equipe e convida os colegas; com todos confirmados, a organização aprova.",
  },
];

/** Situações que a organização escolhe (o ciclo da edição). "inscricoes" é de antes e não é mais oferecida. */
export const SITUACOES_EDICAO: { valor: SituacaoEdicao; rotulo: string; descricao: string; tom: "neutro" | "alerta" | "sucesso" | "marca" | "erro" }[] = [
  { valor: "planejada", rotulo: "Em planejamento", descricao: "Em preparação. Na página de inscrição: “as inscrições ainda não foram abertas”.", tom: "alerta" },
  { valor: "em_andamento", rotulo: "Em andamento", descricao: "Está acontecendo (tornar a edição atual já põe aqui). Inscrições abertas no prazo.", tom: "sucesso" },
  { valor: "encerrada", rotulo: "Encerrada", descricao: "Já foi concluída. Só consulta para participantes e bancas; a página de inscrição diz que acabou.", tom: "neutro" },
  { valor: "cancelada", rotulo: "Cancelada", descricao: "Não vai acontecer. Pede o motivo; o link de inscrição deixa de existir.", tom: "erro" },
];
const ANTIGAS: Record<string, string> = { inscricoes: "Inscrições" };

export const rotuloModo = (m: string) => MODOS_FORMACAO.find((x) => x.valor === m)?.rotulo ?? m;
export const rotuloSituacaoEdicao = (s: string) => SITUACOES_EDICAO.find((x) => x.valor === s)?.rotulo ?? ANTIGAS[s] ?? s;
export const tomSituacaoEdicao = (s: string) => SITUACOES_EDICAO.find((x) => x.valor === s)?.tom ?? "neutro";

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
