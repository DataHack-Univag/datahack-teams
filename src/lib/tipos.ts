// Tipos das tabelas do Supabase (ver supabase/schema.sql).

export type Papel = "aluno" | "organizador";

export type Inscrito = {
  email: string;
  nome: string;
  curso: string | null;
  semestre: number | null;
  papel: Papel;
};

export type CategoriaLink =
  | "github"
  | "drive"
  | "figma"
  | "video"
  | "apresentacao"
  | "site"
  | "dashboard"
  | "outro";

export const CATEGORIAS: { valor: CategoriaLink; rotulo: string }[] = [
  { valor: "github", rotulo: "GitHub" },
  { valor: "drive", rotulo: "Google Drive" },
  { valor: "apresentacao", rotulo: "Apresentação / Pitch" },
  { valor: "video", rotulo: "Vídeo" },
  { valor: "dashboard", rotulo: "Dashboard" },
  { valor: "figma", rotulo: "Figma" },
  { valor: "site", rotulo: "Site / Deploy" },
  { valor: "outro", rotulo: "Outro" },
];

export const rotuloCategoria = (c: string) =>
  CATEGORIAS.find((x) => x.valor === c)?.rotulo ?? c;

export type Link = {
  id: string;
  categoria: CategoriaLink;
  titulo: string | null;
  url: string;
};

export type Membro = {
  email: string;
  inscritos: Pick<Inscrito, "nome" | "curso" | "semestre"> | null;
};

export type Equipe = {
  id: string;
  nome: string;
  /** null = equipe gerada pelo sorteio que ainda não cadastrou o repositório. */
  repo_github: string | null;
  repo_publico: boolean | null;
  /** E-mail do líder (escolhido pelos integrantes). */
  lider_email: string | null;
  repo_verificado_em: string | null;
  criado_em: string;
  atualizado_em: string;
  membros: Membro[];
  links: Link[];
};

export type CategoriaMaterial =
  | "desafio"
  | "dados"
  | "dicionario"
  | "documentacao"
  | "github"
  | "regulamento"
  | "apresentacao"
  | "outro";

export const CATEGORIAS_MATERIAL: { valor: CategoriaMaterial; rotulo: string }[] = [
  { valor: "desafio", rotulo: "Desafio" },
  { valor: "documentacao", rotulo: "Documentação" },
  { valor: "github", rotulo: "Repositório GitHub" },
  { valor: "dados", rotulo: "Fonte de dados" },
  { valor: "dicionario", rotulo: "Dicionário de dados" },
  { valor: "regulamento", rotulo: "Regulamento" },
  { valor: "apresentacao", rotulo: "Apresentação" },
  { valor: "outro", rotulo: "Outro" },
];

export const rotuloMaterial = (c: string) =>
  CATEGORIAS_MATERIAL.find((x) => x.valor === c)?.rotulo ?? c;

export type Material = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: CategoriaMaterial;
  url: string;
  destaque: boolean;
  criado_em: string;
};

/** Visão da organização: inscrito + nota (sensível) + equipe atual. */
export type Participante = Inscrito & {
  nota: number | null;
  equipe_id: string | null;
  equipe_nome: string | null;
};

export type Configuracao = {
  max_membros: number;
  edicao_bloqueada: boolean;
};

export type Resultado = { erro?: string; ok?: string } | null;

export type StatusTroca = "pendente" | "aceita" | "recusada" | "cancelada";

/** Pedido de troca de equipe (ver supabase/006_trocas.sql). */
export type Troca = {
  id: string;
  solicitante: string;
  equipe_origem: string;
  equipe_destino: string;
  status: StatusTroca;
  mensagem: string | null;
  criado_em: string;
  respondido_em: string | null;
  quem: { nome: string } | null;
};

/** Equipe resumida para a lista de destinos da troca. */
export type EquipeResumo = { id: string; nome: string; total: number };
