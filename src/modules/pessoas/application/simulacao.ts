"use server";

import { redirect } from "next/navigation";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { inicioDoPapel, temArea } from "@/modules/pessoas/domain/papeis";
import { buscarInscrito } from "@/modules/pessoas/infra/repositorio";
import { apagarSimulacao, gravarSimulacao } from "@/shared/auth/simulacao";

/** Começa o "ver como" (só organizadores; não dá para simular outro organizador). */
export async function iniciarSimulacao(formulario: FormData) {
  const email = String(formulario.get("email") ?? "").trim().toLowerCase();
  const { cliente, real, edicao } = await sessaoAtual();
  if (real.papel !== "organizador") redirect("/");
  const alvo = email ? await buscarInscrito(cliente, email, edicao.id) : null;
  if (!alvo || alvo.papel === "organizador" || !temArea(alvo.papel)) redirect("/admin/pessoas");
  await gravarSimulacao(alvo.email);
  redirect(inicioDoPapel(alvo.papel));
}

/** Volta para a própria conta da organização. */
export async function encerrarSimulacao() {
  await apagarSimulacao();
  redirect("/admin/pessoas");
}
