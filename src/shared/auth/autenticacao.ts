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
