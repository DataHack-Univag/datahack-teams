import type { Cliente } from "@/shared/db/servidor";

// Adaptador do provedor de login (hoje Supabase Auth). Trocar de provedor = reescrever este arquivo.

export type Autenticado = { email: string; avatar: string | null };

/** Quem está logado (a partir do token, sem ida extra ao servidor de login), ou null. */
export async function usuarioAutenticado(cliente: Cliente): Promise<Autenticado | null> {
  const { data } = await cliente.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const meta = (claims.user_metadata ?? {}) as Record<string, string>;
  return {
    email: String(claims.email ?? "").toLowerCase(),
    avatar: meta.avatar_url ?? meta.picture ?? null,
  };
}

export async function encerrarSessao(cliente: Cliente) {
  await cliente.auth.signOut();
}

/**
 * Cria a conta de quem acabou de se inscrever e já deixa logado. O banco só aceita a conta de
 * quem está em "pessoas" (a inscrição cria a pessoa antes). `jaTinha`: o e-mail já tem senha.
 */
export async function criarConta(cliente: Cliente, email: string, senha: string): Promise<{ ok: boolean; jaTinha: boolean; erro?: string }> {
  const { data, error } = await cliente.auth.signUp({ email, password: senha });
  if (error) {
    const jaTinha = /already registered|already exists/i.test(error.message);
    return { ok: false, jaTinha, erro: jaTinha ? undefined : error.message };
  }
  // Com "Confirm email" ligado o Supabase não devolve sessão; sem identidades = e-mail já cadastrado.
  if (data.user?.identities?.length === 0) return { ok: false, jaTinha: true };
  return { ok: !!data.session, jaTinha: false, erro: data.session ? undefined : "confirmacao" };
}
