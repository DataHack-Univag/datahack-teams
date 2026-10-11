// Resposta padronizada das Server Actions (o que o formulário mostra para o usuário).

export type Resultado = {
  ok?: string;
  erro?: string;
  /**
   * Dados para desfazer a ação (heurística 3). O formulário mostra "Desfazer" no aviso e
   * envia estes campos para a ação de desfazer que ele recebeu.
   */
  desfazer?: Record<string, string>;
} | null;

export const sucesso = (ok: string, desfazer?: Record<string, string>): Resultado => ({ ok, desfazer });
export const falha = (erro: string): Resultado => ({ erro });

/** Nada mudou: o banco (RLS) recusou ou a edição está bloqueada. */
export const SEM_PERMISSAO = falha(
  "Nada foi alterado: você não tem permissão para isso ou a edição está bloqueada pela organização.",
);
