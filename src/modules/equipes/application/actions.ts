"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizarRepo } from "@/modules/equipes/domain/github";
import { CATEGORIAS_LINK, rotuloCategoria } from "@/modules/equipes/domain/tipos";
import { repoEhPublico } from "@/modules/equipes/infra/github";
import * as repo from "@/modules/equipes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { emailNormalizado } from "@/modules/pessoas/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { email, id, sim, texto, textoOpcional, umDe, url } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

// Toda autorização real é do banco (RLS + funções). Aqui: validar, chamar o repositório,
// traduzir o erro e atualizar as telas.

const repositorio = z
  .string()
  .transform((v) => normalizarRepo(v ?? ""))
  .refine((v): v is string => v !== null, "Informe o link do repositório no formato https://github.com/usuario/repositorio");

const repositorioOpcional = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? normalizarRepo(v) : ""))
  .refine((v) => v !== null, "Informe o link do repositório no formato https://github.com/usuario/repositorio")
  .transform((v) => v || null);

// "como": e-mail do aluno no modo "ver como" da organização (o banco ignora quando quem age é aluno).
const como = z
  .string()
  .optional()
  .transform((v) => v?.trim().toLowerCase() || undefined);

const carimbo = (publico: boolean | null) => ({
  repo_publico: publico,
  repo_verificado_em: publico === null ? null : new Date().toISOString(),
});

export const criarEquipe = criarAcao(
  z.object({ nome: texto("o nome da equipe", { min: 2, max: 60 }), repo_github: repositorio, redirecionar: z.string().optional() }),
  async (d) => {
    const { cliente, edicao } = await sessaoAtual();
    const { data: novoId, error } = await repo.criarEquipe(cliente, edicao.id, d.nome, d.repo_github);
    if (error) return falha(traduzirErro(error));
    // A checagem de repositório público só informa; não impede a criação.
    await repo.atualizarEquipe(cliente, novoId, carimbo(await repoEhPublico(d.repo_github)));
    atualizarTelas();
    if (d.redirecionar === "admin") redirect(`/admin/equipes/${novoId}`);
    return sucesso(`Equipe “${d.nome}” criada. Agora adicione os integrantes.`);
  },
);

export const atualizarEquipe = criarAcao(
  z.object({ id, nome: texto("o nome da equipe", { min: 2, max: 60 }), repo_github: repositorio, repo_atual: z.string().optional() }),
  async (d) => {
    // Só consulta o GitHub (lento) se o link mudou.
    const mudouRepo = d.repo_github !== normalizarRepo(d.repo_atual ?? "");
    const dados = mudouRepo ? { nome: d.nome, repo_github: d.repo_github, ...carimbo(await repoEhPublico(d.repo_github)) } : { nome: d.nome };
    const { alterou, error } = await repo.atualizarEquipe(await clienteServidor(), d.id, dados);
    if (error) return falha(traduzirErro(error));
    if (!alterou) return SEM_PERMISSAO;
    atualizarTelas();
    return sucesso("Dados da equipe salvos.");
  },
);

export const verificarRepo = criarAcao(z.object({ id }), async (d) => {
  const cliente = await clienteServidor();
  const equipe = await repo.buscarEquipe(cliente, d.id);
  if (!equipe) return falha("Equipe não encontrada. Recarregue a página.");
  if (!equipe.repo_github) return falha("Cadastre o repositório primeiro.");

  const publico = await repoEhPublico(equipe.repo_github);
  if (publico === null) return falha("Não foi possível falar com o GitHub agora. Tente de novo em alguns minutos.");
  const { alterou } = await repo.atualizarEquipe(cliente, d.id, carimbo(publico));
  if (!alterou) return SEM_PERMISSAO;
  atualizarTelas();
  return publico
    ? sucesso("Tudo certo: o repositório está público.")
    : falha(
        "O repositório não foi encontrado ou está privado. No GitHub: Settings → General → Danger Zone → Change visibility → Public. Depois verifique de novo.",
      );
});

/** Arquiva a equipe (nada é apagado: integrantes saem e tudo fica no histórico). */
export const arquivarEquipe = criarAcao(z.object({ id }), async (d) => {
  const { error } = await repo.arquivarEquipe(await clienteServidor(), d.id);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  redirect("/admin/equipes?arquivada=1");
});

// ---------------------------------------------------------------- integrantes e líder

export const adicionarMembro = criarAcao(z.object({ equipe_id: id, email }), async (d) => {
  const { cliente, edicao } = await sessaoAtual();
  const { error } = await repo.adicionarMembro(cliente, edicao.id, d.equipe_id, d.email);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Integrante adicionado.");
});

export const removerMembro = criarAcao(z.object({ equipe_id: id, email, nome: z.string().optional() }), async (d) => {
  const { error } = await repo.removerMembro(await clienteServidor(), d.equipe_id, d.email);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  // Desfazer = adicionar de volta na mesma equipe.
  return sucesso(`${d.nome || "Integrante"} saiu da equipe.`, { equipe_id: d.equipe_id, email: d.email });
});

/** Define (ou tira, com e-mail vazio) o líder. */
export const definirLider = criarAcao(
  z.object({ equipe_id: id, email: z.string().transform((v) => v.trim().toLowerCase() || null) }),
  async (d) => {
    const { alterou, error } = await repo.atualizarEquipe(await clienteServidor(), d.equipe_id, { lider_email: d.email });
    if (error) return falha(traduzirErro(error));
    if (!alterou) return SEM_PERMISSAO;
    atualizarTelas();
    return sucesso(d.email ? "Líder definido." : "A equipe ficou sem líder.");
  },
);

// ---------------------------------------------------------------- links de entrega

const VALORES_CATEGORIA = CATEGORIAS_LINK.map((c) => c.valor);

export const adicionarLink = criarAcao(
  z.object({
    equipe_id: id,
    categoria: umDe(VALORES_CATEGORIA, "Escolha o tipo do link."),
    titulo: textoOpcional(80),
    url,
  }),
  async (d) => {
    const cliente = await clienteServidor();
    const { error } = await repo.adicionarLink(cliente, { ...d, criado_por: await emailNormalizado(cliente) });
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    return sucesso(`Link de ${rotuloCategoria(d.categoria)} adicionado.`);
  },
);

export const removerLink = criarAcao(z.object({ id }), async (d) => {
  const cliente = await clienteServidor();
  const { removido, error } = await repo.removerLink(cliente, d.id, await emailNormalizado(cliente));
  if (error) return falha(traduzirErro(error));
  if (!removido) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso("Link removido.", {
    equipe_id: removido.equipe_id,
    categoria: removido.categoria,
    titulo: removido.titulo ?? "",
    url: removido.url,
  });
});

/** Grava as equipes montadas pelo gerador (chamada direta, não por formulário). */
export async function aplicarEquipesGeradas(equipes: { nome: string; emails: string[] }[], substituir: boolean) {
  if (!equipes.length) return falha("Nenhuma equipe para salvar.");
  const { cliente, edicao } = await sessaoAtual();
  const { data, error } = await repo.aplicarEquipes(cliente, edicao.id, equipes, substituir);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(`${data} equipe(s) salvas. Os alunos já veem a equipe ao entrar e devem cadastrar o repositório.`);
}

// ---------------------------------------------------------------- proposta de equipe (alunos)

/** Aluno propõe a equipe e convida os colegas (campo "colegas" repetido, um e-mail por campo). */
export const proporEquipe = criarAcao(
  z.object({ nome: texto("o nome da equipe", { min: 2, max: 60 }), repo_github: repositorioOpcional, como }),
  async (d, bruto, formulario) => {
    const colegas = [...new Set(formulario.getAll("colegas").map((v) => String(v).trim().toLowerCase()).filter(Boolean))];
    const { error } = await repo.proporEquipe(await clienteServidor(), d.nome, colegas, d.repo_github, d.como);
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    return sucesso(
      colegas.length
        ? `Equipe “${d.nome}” proposta. Os colegas convidados precisam confirmar; depois a organização aprova.`
        : `Equipe “${d.nome}” proposta. Convide os colegas para completar a equipe.`,
    );
  },
);

export const convidarIntegrante = criarAcao(z.object({ equipe_id: id, email, como }), async (d) => {
  const { error } = await repo.convidarIntegrante(await clienteServidor(), d.equipe_id, d.email, d.como);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Convite enviado. A pessoa vê o convite ao entrar no sistema.");
});

export const responderConvite = criarAcao(z.object({ equipe_id: id, aceitar: sim, como }), async (d) => {
  const { error } = await repo.responderConvite(await clienteServidor(), d.equipe_id, d.aceitar, d.como);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(d.aceitar ? "Você confirmou: agora está nesta equipe." : "Convite recusado.");
});

export const cancelarProposta = criarAcao(z.object({ equipe_id: id, como }), async (d) => {
  const { error } = await repo.cancelarProposta(await clienteServidor(), d.equipe_id, d.como);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Proposta cancelada. Os colegas ficaram livres para outras equipes.");
});

/** Organização aprova ou recusa (com motivo) uma equipe proposta pelos alunos. */
export const analisarEquipe = criarAcao(z.object({ equipe_id: id, aprovar: sim, motivo: textoOpcional(500) }), async (d) => {
  const { error } = await repo.analisarEquipe(await clienteServidor(), d.equipe_id, d.aprovar, d.motivo);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(d.aprovar ? "Equipe aprovada. Os integrantes já veem a equipe." : "Equipe recusada. Os integrantes podem propor outra.");
});
