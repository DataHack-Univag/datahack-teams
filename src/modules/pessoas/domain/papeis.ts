export type Papel = "aluno" | "organizador" | "avaliador_tecnico" | "avaliador_negocio";

/** Papéis com o nome e a explicação que a tela mostra (heurística 2: sem os códigos internos). */
export const PAPEIS: { valor: Papel; rotulo: string; descricao: string }[] = [
  { valor: "aluno", rotulo: "Aluno", descricao: "Participa de uma equipe e faz as entregas." },
  { valor: "organizador", rotulo: "Organização", descricao: "Vê e edita tudo; avalia a mesa técnica e o repositório." },
  {
    valor: "avaliador_tecnico",
    rotulo: "Banca de professores",
    descricao: "Avalia os pitches das fases 1 e 2.",
  },
  { valor: "avaliador_negocio", rotulo: "Jurado de negócio", descricao: "Avalia o pitch final." },
];

export const VALORES_PAPEL = PAPEIS.map((p) => p.valor);

export const rotuloPapel = (p: string) => PAPEIS.find((x) => x.valor === p)?.rotulo ?? p;

export const ehAvaliador = (p: Papel) => p === "avaliador_tecnico" || p === "avaliador_negocio";

/** Para onde cada papel vai ao entrar. */
export function inicioDoPapel(p: Papel): string {
  if (p === "organizador") return "/admin";
  if (ehAvaliador(p)) return "/avaliar";
  return "/";
}
