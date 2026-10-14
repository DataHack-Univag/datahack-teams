// Tradução dos erros do banco para mensagens em português, sem códigos técnicos
// (heurística 9: dizer o que aconteceu e o que fazer).

export type ErroBanco = { code?: string; message: string };

/** Códigos de "coluna, tabela ou função não existe": quase sempre falta aplicar uma migração. */
const FALTA_MIGRACAO = ["42703", "42P01", "42883", "PGRST202", "PGRST204", "PGRST205"];

export function traduzirErro(e: ErroBanco): string {
  // raise exception das funções SQL: a mensagem já é escrita em português para o usuário.
  if (e.code === "P0001") return e.message;
  if (e.code === "23505") {
    if (e.message.includes("equipes_nome_unico")) return "Já existe uma equipe com esse nome. Escolha outro.";
    if (e.message.includes("membros_um_ativo")) return "Essa pessoa já está em uma equipe (ou tem um convite aguardando). Tire-a da equipe atual antes.";
    if (e.message.includes("pessoas_pkey") || e.message.includes("participacoes_pkey")) return "Já existe uma pessoa com esse e-mail nesta edição.";
    if (e.message.includes("edicoes_slug")) return "Já existe uma edição com esse endereço curto.";
    return "Esse registro já existe.";
  }
  if (e.code === "23514") return "Algum campo está com um valor inválido. Confira o formato e tente de novo.";
  if (e.code === "23503") {
    return "Esse e-mail não está na lista de participantes. Cadastre a pessoa em Pessoas primeiro.";
  }
  if (e.code === "42501") return "Você não tem permissão para fazer isso. Se acha que deveria ter, fale com a organização.";
  if (FALTA_MIGRACAO.includes(e.code ?? ""))
    return "O banco está desatualizado em relação ao sistema. Avise a organização para aplicar as migrações (supabase/migrations).";
  return "Não foi possível concluir agora. Tente de novo em instantes; se continuar, avise a organização.";
}

/** Erro de leitura que deve aparecer na tela de erro (com orientação), em vez de virar lista vazia. */
export class ErroCarregamento extends Error {
  constructor(contexto: string, e: ErroBanco) {
    super(`Não foi possível carregar ${contexto}. ${traduzirErro(e)}`);
    this.name = "ErroCarregamento";
  }
}

/** Devolve os dados de uma consulta ou lança ErroCarregamento. */
export function exigir<T>(r: { data: T; error: ErroBanco | null }, contexto: string): T {
  if (r.error) throw new ErroCarregamento(contexto, r.error);
  return r.data;
}
