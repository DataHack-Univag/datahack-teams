import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/shared/db/tipos-banco";

/** Cliente do banco para Client Components (usado só no login e na troca de senha). */
export function clienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
