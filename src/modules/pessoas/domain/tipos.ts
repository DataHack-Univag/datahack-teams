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
};

export type Presenca = "presente" | "ausente";

/** Visão da organização: inscrito + nota (dado sensível) + equipe atual na edição. */
export type Participante = Inscrito & {
  nota: number | null;
  equipe_id: string | null;
  equipe_nome: string | null;
};
