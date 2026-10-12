// Papel de cada pessoa numa edição. Avaliadores pertencem a uma banca do regulamento da edição
// (ex.: banca de professores, jurados de negócio); a organização tem a banca dela.

export type Papel = "aluno" | "organizador" | "avaliador";

/** Papéis com o nome e a explicação que a tela mostra (heurística 2: sem os códigos internos). */
export const PAPEIS: { valor: Papel; rotulo: string; descricao: string }[] = [
  { valor: "aluno", rotulo: "Aluno", descricao: "Participa de uma equipe e faz as entregas." },
  { valor: "organizador", rotulo: "Organização", descricao: "Vê e edita tudo da edição e avalia pela banca da organização." },
  { valor: "avaliador", rotulo: "Avaliador", descricao: "Avalia as rubricas da banca dele." },
];

export const VALORES_PAPEL = PAPEIS.map((p) => p.valor);

export const ehAvaliador = (p: Papel) => p === "avaliador";

/** Para onde cada papel vai ao entrar. */
export function inicioDoPapel(p: Papel): string {
  if (p === "organizador") return "/admin";
  if (ehAvaliador(p)) return "/avaliar";
  return "/";
}

// ---------------------------------------------------------------- "função" = papel + banca

/** Banca como o cadastro de pessoas precisa dela. */
export type BancaResumo = { codigo: string; nome: string; daOrganizacao: boolean };

/**
 * Valor único do campo "Função" no cadastro: "aluno", "organizador" ou "avaliador:<banca>".
 * Assim a tela mostra "Banca de professores" em vez de "avaliador + professores".
 */
export const funcaoDe = (papel: Papel, banca: string | null) => (papel === "avaliador" && banca ? `avaliador:${banca}` : papel);

export function lerFuncao(valor: string): { papel: Papel; banca: string | null } | null {
  if (valor === "aluno" || valor === "organizador") return { papel: valor, banca: null };
  const m = valor.match(/^avaliador:([a-z0-9_]+)$/);
  return m ? { papel: "avaliador", banca: m[1] } : null;
}

export function opcoesFuncao(bancas: BancaResumo[]): { valor: string; rotulo: string; descricao: string }[] {
  return [
    { valor: "aluno", rotulo: "Aluno", descricao: PAPEIS[0].descricao },
    { valor: "organizador", rotulo: "Organização", descricao: PAPEIS[1].descricao },
    ...bancas.filter((b) => !b.daOrganizacao).map((b) => ({ valor: `avaliador:${b.codigo}`, rotulo: b.nome, descricao: "Avalia as rubricas desta banca." })),
  ];
}

/** "Aluno", "Organização", "Banca de professores de tecnologia"... */
export function rotuloFuncao(papel: Papel, banca: string | null, bancas: BancaResumo[] = []): string {
  if (papel === "avaliador") return bancas.find((b) => b.codigo === banca)?.nome ?? "Avaliador";
  return PAPEIS.find((p) => p.valor === papel)?.rotulo ?? papel;
}

export const rotuloPapel = (p: string) => PAPEIS.find((x) => x.valor === p)?.rotulo ?? p;
