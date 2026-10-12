import { cookies } from "next/headers";

// Modo "ver como": a organização navega pelo sistema como outra pessoa (aluno ou banca),
// sem precisar da senha dela e sem criar contas de teste. O cookie guarda só o e-mail
// de quem está sendo simulado; ele só vale se quem está logado for organizador
// (conferido em sessaoAtual). A conta usada no banco continua sendo a do organizador.

export const COOKIE_SIMULACAO = "dh_ver_como";
const OITO_HORAS = 60 * 60 * 8;

export async function emailSimulado(): Promise<string | null> {
  return (await cookies()).get(COOKIE_SIMULACAO)?.value ?? null;
}

export async function gravarSimulacao(email: string) {
  (await cookies()).set(COOKIE_SIMULACAO, email, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: OITO_HORAS });
}

export async function apagarSimulacao() {
  (await cookies()).delete(COOKIE_SIMULACAO);
}
