/** Nível marcado em cada critério (fator: 0 · 0,5 · 0,8 · 1). */
export type Notas = Record<string, number>;

/** Ficha de avaliação: o que um avaliador deu a uma equipe numa rubrica. */
export type Ficha = {
  id: string;
  equipe_id: string;
  avaliador: string;
  rubrica: string;
  notas: Notas;
  comentario: string | null;
  atualizado_em: string;
  /** Nome do avaliador (quando a consulta traz). */
  quem?: { nome: string } | null;
};

/** Equipe como a avaliação precisa dela (sem detalhes de entrega). */
export type EquipeAvaliada = {
  id: string;
  nome: string;
  integrantes: string[];
};
