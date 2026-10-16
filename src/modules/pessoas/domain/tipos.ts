import type { Papel } from "./papeis";

/**
 * Pessoa numa edição: cadastro único (e-mail, nome) + participação na edição
 * (papel, banca, curso e semestre daquele ano). Só quem participa de uma edição entra no sistema.
 */
export type Inscrito = {
  email: string;
  nome: string;
  curso: string | null;
  semestre: number | null;
  papel: Papel;
  /** Código da banca (avaliadores e organização). */
  banca: string | null;
  /** Presença no evento (null = ainda não registrada). */
  presenca: Presenca | null;
  /** Quando a presença foi registrada (check-in). */
  presenca_em?: string | null;
};

export type Presenca = "presente" | "ausente";

/** "Sistemas de Informação · 3º sem." (o que houver dos dois). */
export const cursoSemestre = (p: { curso?: string | null; semestre?: number | null } | null | undefined): string =>
  [p?.curso, p?.semestre && `${p.semestre}º sem.`].filter(Boolean).join(" · ");

/** Visão da organização: inscrito + nota (dado sensível) + equipe atual na edição. */
export type Participante = Inscrito & {
  nota: number | null;
  equipe_id: string | null;
  equipe_nome: string | null;
};
