import type { Papel } from "./papeis";

/** Pessoa da lista de inscritos (só quem está aqui consegue entrar no sistema). */
export type Inscrito = {
  email: string;
  nome: string;
  curso: string | null;
  semestre: number | null;
  papel: Papel;
};

/** Visão da organização: inscrito + nota (dado sensível) + equipe atual. */
export type Participante = Inscrito & {
  nota: number | null;
  equipe_id: string | null;
  equipe_nome: string | null;
};
