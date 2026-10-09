import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino do link de "esqueci a senha" enviado pelo Supabase.
// Aceita os dois formatos de link:
//  - token_hash + type  (template customizado; funciona em qualquer navegador)
//  - code               (template padrão; precisa abrir no mesmo navegador do pedido)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/nova-senha";
  // Só redireciona para caminhos internos.
  const destino = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/nova-senha";

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  return NextResponse.redirect(ok ? `${origin}${destino}` : `${origin}/login?erro=link_invalido`);
}
