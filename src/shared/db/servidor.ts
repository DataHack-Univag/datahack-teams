import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/shared/db/tipos-banco";

/**
 * Cliente do banco para Server Components, Server Actions e Route Handlers.
 * É o único ponto (junto com navegador.ts e o proxy) que conhece o Supabase:
 * para trocar de provedor, troca-se este adaptador e os repositórios em modules/*\/infra.
 */
export async function clienteServidor() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o proxy já renova a sessão.
          }
        },
      },
    },
  );
}

export type Cliente = Awaited<ReturnType<typeof clienteServidor>>;
