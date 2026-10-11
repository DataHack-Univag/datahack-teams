import type { Inscrito } from "@/modules/pessoas/domain/tipos";

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

export type Membro = { email: string; inscritos: Pick<Inscrito, "nome" | "curso" | "semestre"> | null };

export type Equipe = {
  id: string;
  nome: string;
  /** null = equipe gerada pela organização que ainda não cadastrou o repositório. */
  repo_github: string | null;
  repo_publico: boolean | null;
  repo_verificado_em: string | null;
  /** E-mail do líder (escolhido pelos integrantes). */
  lider_email: string | null;
  criado_em: string;
  atualizado_em: string;
  membros: Membro[];
  links: LinkEntrega[];
};

/** Equipe resumida (lista de destinos de troca, paleta de comandos). */
export type EquipeResumo = { id: string; nome: string; total: number };

export type Configuracao = { max_membros: number; edicao_bloqueada: boolean };

export const nomeMembro = (m: Membro) => m.inscritos?.nome ?? m.email;

export const liderDa = (e: Equipe) => e.membros.find((m) => m.email === e.lider_email) ?? null;
