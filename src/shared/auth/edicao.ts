import { cookies } from "next/headers";

// Edição que a organização está administrando (seletor no cabeçalho). Alunos e bancas sempre
// veem a edição atual; o cookie só vale para quem organiza a edição escolhida (conferido na sessão).

export const COOKIE_EDICAO = "dh_edicao";

export async function edicaoEscolhida(): Promise<string | null> {
  return (await cookies()).get(COOKIE_EDICAO)?.value ?? null;
}

export async function gravarEdicaoEscolhida(id: string) {
  (await cookies()).set(COOKIE_EDICAO, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
