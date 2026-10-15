import { redirect } from "next/navigation";
import { cache } from "react";
import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { listarEdicoes } from "@/modules/edicoes/infra/repositorio";
import { minhasInscricoes } from "@/modules/inscricoes/infra/repositorio";
import { ehAvaliador } from "@/modules/pessoas/domain/papeis";
import type { Inscrito } from "@/modules/pessoas/domain/tipos";
import { buscarInscrito, emailNormalizado, participacoesDe } from "@/modules/pessoas/infra/repositorio";
import { encerrarSessao, usuarioAutenticado } from "@/shared/auth/autenticacao";
import { edicaoEscolhida } from "@/shared/auth/edicao";
import { emailSimulado } from "@/shared/auth/simulacao";
import { clienteServidor } from "@/shared/db/servidor";

/**
 * Usuário logado, a edição da tela e o papel dele nessa edição (cacheado por requisição).
 *  - por padrão, a edição atual (ou a mais recente de que a pessoa participa);
 *  - quem participou de mais de uma edição escolhe outra no seletor do topo: a organização
 *    para administrar, os demais para consultar as anteriores (só leitura).
 * Quem está logado mas não participa de nenhuma edição vai acompanhar a inscrição (se tiver
 * uma) ou é deslogado com aviso.
 */
export const sessaoAtual = cache(async () => {
  const cliente = await clienteServidor();
  const auth = await usuarioAutenticado(cliente);
  if (!auth) redirect("/login");

  // O banco normaliza o e-mail do login (Gmail com/sem pontos) para o e-mail do cadastro.
  const email = (await emailNormalizado(cliente)) ?? auth.email;
  const [participacoes, edicoes] = await Promise.all([participacoesDe(cliente, email), listarEdicoes(cliente)]);
  const organiza = new Set(participacoes.filter((p) => p.papel === "organizador").map((p) => p.edicao_id));
  const participa = new Set(participacoes.map((p) => p.edicao_id));

  const escolhida = await edicaoEscolhida();
  const edicao: Edicao | undefined =
    (escolhida && participa.has(escolhida) ? edicoes.find((e) => e.id === escolhida) : undefined) ??
    edicoes.find((e) => e.atual && participa.has(e.id)) ??
    edicoes.find((e) => participa.has(e.id));

  const inscrito: Inscrito | null = edicao ? await buscarInscrito(cliente, email, edicao.id) : null;
  if (!edicao || !inscrito) {
    // Inscreveu-se e ainda não entrou (em análise, na espera…): acompanha a inscrição.
    if ((await minhasInscricoes(cliente)).length) redirect("/minha-inscricao");
    await encerrarSessao(cliente);
    redirect("/login?erro=nao_inscrito");
  }

  // "Ver como": o organizador passa a ver o sistema como a pessoa escolhida (na mesma edição).
  let simulado: Inscrito | null = null;
  if (inscrito.papel === "organizador") {
    const alvo = await emailSimulado();
    const pessoa = alvo ? await buscarInscrito(cliente, alvo, edicao.id) : null;
    if (pessoa && pessoa.papel !== "organizador") simulado = pessoa;
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
    /** Edição desta tela. */
    edicao,
    /** Edições que a organização pode administrar (para o seletor). */
    edicoesOrganizadas: edicoes.filter((e) => organiza.has(e.id)),
    /** Todas as edições de que a pessoa participa (seletor de quem não é da organização). */
    edicoesDoUsuario: edicoes.filter((e) => participa.has(e.id)),
    organizador: usuario.papel === "organizador",
    avaliador: ehAvaliador(usuario.papel),
    mentor: usuario.papel === "mentor",
    banca: usuario.banca,
  };
});

export type Sessao = Awaited<ReturnType<typeof sessaoAtual>>;
