"use server";

import { redirect } from "next/navigation";
import { inicioDoPapel } from "@/modules/pessoas/domain/papeis";
import { buscarInscrito } from "@/modules/pessoas/infra/repositorio";
import { apagarSimulacao, gravarSimulacao } from "@/shared/auth/simulacao";
import { clienteServidor } from "@/shared/db/servidor";

/** Começa o "ver como" (só organizadores; não dá para simular outro organizador). */
export async function iniciarSimulacao(formulario: FormData) {
  const email = String(formulario.get("email") ?? "").trim().toLowerCase();
  const cliente = await clienteServidor();
  const { data: organizador } = await cliente.rpc("eh_organizador");
  if (!organizador) redirect("/");
  const alvo = email ? await buscarInscrito(cliente, email) : null;
  if (!alvo || alvo.papel === "organizador") redirect("/admin/pessoas");
  await gravarSimulacao(alvo.email);
  redirect(inicioDoPapel(alvo.papel));
}

/** Volta para a própria conta da organização. */
export async function encerrarSimulacao() {
  await apagarSimulacao();
  redirect("/admin/pessoas");
}
