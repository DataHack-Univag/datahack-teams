import { cookies } from "next/headers";

// Edição escolhida no seletor do cabeçalho. Vale só para edições de que a pessoa participa
// (conferido na sessão). Organização: lembra por 30 dias. Demais: só até fechar o navegador,
// para sempre começar na edição atual.

export const COOKIE_EDICAO = "dh_edicao";

export async function edicaoEscolhida(): Promise<string | null> {
  return (await cookies()).get(COOKIE_EDICAO)?.value ?? null;
}

export async function gravarEdicaoEscolhida(id: string, { lembrar = true }: { lembrar?: boolean } = {}) {
  (await cookies()).set(COOKIE_EDICAO, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(lembrar ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

export async function apagarEdicaoEscolhida() {
  (await cookies()).delete(COOKIE_EDICAO);
}
