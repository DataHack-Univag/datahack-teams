import { redirect } from "next/navigation";
import { cache } from "react";
import { bancaDoPapel } from "@/modules/avaliacao/domain/bancas";
import { ehAvaliador } from "@/modules/pessoas/domain/papeis";
import type { Inscrito } from "@/modules/pessoas/domain/tipos";
import { buscarInscrito, emailNormalizado } from "@/modules/pessoas/infra/repositorio";
import { encerrarSessao, usuarioAutenticado } from "@/shared/auth/autenticacao";
import { emailSimulado } from "@/shared/auth/simulacao";
import { clienteServidor } from "@/shared/db/servidor";

/**
 * Usuário logado e o registro dele na lista de inscritos (cacheado por requisição).
 * Quem está logado mas não está na lista é deslogado com aviso.
 */
export const sessaoAtual = cache(async () => {
  const cliente = await clienteServidor();
  const auth = await usuarioAutenticado(cliente);
  if (!auth) redirect("/login");

  // Caminho rápido: o e-mail do login quase sempre é o mesmo da lista (1 consulta).
  // Se não achar, normaliza (Gmail com/sem pontos) no banco e tenta de novo.
  let inscrito: Inscrito | null = await buscarInscrito(cliente, auth.email);
  if (!inscrito) {
    const normalizado = await emailNormalizado(cliente);
    if (normalizado && normalizado !== auth.email) inscrito = await buscarInscrito(cliente, normalizado);
  }
  if (!inscrito) {
    await encerrarSessao(cliente);
    redirect("/login?erro=nao_inscrito");
  }

  // "Ver como": o organizador passa a ver o sistema como a pessoa escolhida.
  let simulado: Inscrito | null = null;
  if (inscrito.papel === "organizador") {
    const email = await emailSimulado();
    const alvo = email ? await buscarInscrito(cliente, email) : null;
    if (alvo && alvo.papel !== "organizador") simulado = alvo;
  }
  const usuario = simulado ?? inscrito;

  return {
    cliente,
    /** Quem a tela representa (no "ver como", a pessoa simulada). */
    usuario,
    /** Quem está de fato logado. */
    real: inscrito,
    simulacao: !!simulado,
    avatar: simulado ? null : auth.avatar,
    organizador: usuario.papel === "organizador",
    avaliador: ehAvaliador(usuario.papel),
    banca: bancaDoPapel(usuario.papel),
  };
});

export type Sessao = Awaited<ReturnType<typeof sessaoAtual>>;
