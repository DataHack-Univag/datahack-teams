import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { cursoSemestre, type Inscrito, type Presenca } from "@/modules/pessoas/domain/tipos";

export type CategoriaLink = "github" | "drive" | "figma" | "video" | "apresentacao" | "site" | "dashboard" | "outro";

export const CATEGORIAS_LINK: { valor: CategoriaLink; rotulo: string }[] = [
  { valor: "github", rotulo: "GitHub" },
  { valor: "drive", rotulo: "Google Drive" },
  { valor: "apresentacao", rotulo: "Apresentação / Pitch" },
  { valor: "video", rotulo: "Vídeo" },
  { valor: "dashboard", rotulo: "Dashboard" },
  { valor: "figma", rotulo: "Figma" },
  { valor: "site", rotulo: "Site / Deploy" },
  { valor: "outro", rotulo: "Outro" },
];

export const rotuloCategoria = (c: string) => CATEGORIAS_LINK.find((x) => x.valor === c)?.rotulo ?? c;

export type LinkEntrega = { id: string; categoria: CategoriaLink; titulo: string | null; url: string };

/** confirmado: está na equipe · convidado: chamado numa proposta, ainda não respondeu. */
export type SituacaoMembro = "confirmado" | "convidado";

export type Membro = {
  email: string;
  situacao: SituacaoMembro;
  inscritos: Pick<Inscrito, "nome" | "curso" | "semestre"> | null;
};

/**
 * formando: proposta aguardando os colegas · aguardando_aprovacao: falta a organização aprovar
 * aprovada · recusada · cancelada (quem propôs desistiu)
 */
export type SituacaoEquipe = "formando" | "aguardando_aprovacao" | "aprovada" | "recusada" | "cancelada";
export type OrigemEquipe = "manual" | "gerador" | "proposta" | "migracao";

export const SITUACOES_EQUIPE: { valor: SituacaoEquipe; rotulo: string; tom: "alerta" | "info" | "sucesso" | "erro" | "neutro" }[] = [
  { valor: "formando", rotulo: "Aguardando os colegas", tom: "alerta" },
  { valor: "aguardando_aprovacao", rotulo: "Aguardando aprovação", tom: "info" },
  { valor: "aprovada", rotulo: "Aprovada", tom: "sucesso" },
  { valor: "recusada", rotulo: "Recusada", tom: "erro" },
  { valor: "cancelada", rotulo: "Cancelada", tom: "neutro" },
];
export const situacaoEquipe = (s: string) => SITUACOES_EQUIPE.find((x) => x.valor === s) ?? SITUACOES_EQUIPE[2];

export type Equipe = {
  id: string;
  edicao_id: string;
  nome: string;
  /** null = equipe gerada pela organização que ainda não cadastrou o repositório. */
  repo_github: string | null;
  repo_publico: boolean | null;
  repo_verificado_em: string | null;
  /** E-mail do líder (escolhido pelos integrantes; quem propõe a equipe já começa como líder). */
  lider_email: string | null;
  /** Ícone da equipe no mapa e nos cards (emoji); null = iniciais do nome. */
  icone: string | null;
  situacao: SituacaoEquipe;
  origem: OrigemEquipe;
  proposta_por: string | null;
  motivo_analise: string | null;
  criado_em: string;
  atualizado_em: string;
  /** Integrantes ativos (confirmados e convidados). */
  membros: Membro[];
  links: LinkEntrega[];
};

/** Equipe resumida (lista de destinos de troca, paleta de comandos). */
export type EquipeResumo = { id: string; nome: string; total: number };

/** Regras das equipes na edição (vêm da edição). */
export type Configuracao = {
  max_membros: number;
  min_membros: number;
  /** Trava de edição pelos alunos (fim do prazo ou edição encerrada). */
  edicao_bloqueada: boolean;
  /** Por que está travada, para o aviso da tela (heurística 1). */
  motivo_bloqueio: string | null;
  permite_trocas: boolean;
  modo_formacao: Edicao["modo_formacao"];
};

/**
 * Regras das equipes na edição. Para alunos e bancas, uma edição que não é mais a atual
 * fica só para consulta: as ações do banco valem para a edição atual (`paraParticipante`).
 */
export const configuracaoDa = (e: Edicao, { paraParticipante = false } = {}): Configuracao => ({
  max_membros: e.max_membros,
  min_membros: e.min_membros,
  edicao_bloqueada: e.equipes_travadas || e.situacao === "encerrada" || (paraParticipante && !e.atual),
  motivo_bloqueio:
    paraParticipante && !e.atual
      ? `A ${e.nome} já terminou: aqui fica o registro da sua equipe.`
      : e.situacao === "encerrada"
        ? "Edição encerrada"
        : e.equipes_travadas
          ? "Edição bloqueada pela organização"
          : null,
  permite_trocas: e.permite_trocas,
  modo_formacao: e.modo_formacao,
});

export const nomeMembro = (m: Membro) => m.inscritos?.nome ?? m.email;

/** Ícones que a equipe pode escolher (aparecem no mapa do evento). */
export const ICONES_EQUIPE = [
  "🐼", "🦊", "🦉", "🐙", "🦄", "🐝", "🦖", "🐺", "🦅", "🐬", "🐢", "🦁",
  "🚀", "🛰️", "🧠", "📊", "📈", "🔍", "💡", "⚡", "🔥", "🎯", "🧩", "🛠️",
  "💾", "🤖", "🌵", "🌊", "🌎", "⭐", "🎓", "🏆",
] as const;

/** Integrantes com a presença de cada um (bloco de presença das telas de equipe). */
export const presencaDosMembros = (e: Equipe, presenca: Record<string, Presenca | null>) =>
  e.membros
    .filter((m) => m.situacao === "confirmado")
    .map((m) => ({ email: m.email, nome: nomeMembro(m), detalhe: cursoSemestre(m.inscritos), presenca: presenca[m.email] ?? null }));

export const confirmados = (e: Equipe) => e.membros.filter((m) => m.situacao === "confirmado");

export const liderDa = (e: Equipe) => e.membros.find((m) => m.email === e.lider_email && m.situacao === "confirmado") ?? null;
