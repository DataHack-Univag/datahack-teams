"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { conferirFormulario, limparRespostas, validarRespostas, type Campo, type Respostas } from "@/modules/inscricoes/domain/campos";
import { SITUACOES_INSCRICAO, situacaoInscricao } from "@/modules/inscricoes/domain/publica";
import * as repo from "@/modules/inscricoes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { email, id, texto, umDe } from "@/shared/acao/campos";
import { falha, sucesso } from "@/shared/acao/resultado";
import { criarConta, usuarioAutenticado } from "@/shared/auth/autenticacao";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

/** Salva as perguntas da inscrição da edição (lista inteira, na ordem da tela). */
export const salvarFormulario = criarAcao(z.object({ id, campos: z.string().min(2, "Formulário vazio.") }), async (d) => {
  let campos: Campo[];
  try {
    campos = JSON.parse(d.campos);
    if (!Array.isArray(campos)) throw new Error();
  } catch {
    return falha("Não foi possível ler o formulário. Recarregue a página e tente de novo.");
  }
  const problemas = conferirFormulario(campos);
  if (problemas.length) return falha(problemas.join(" "));

  const { cliente } = await sessaoAtual();
  const { error } = await repo.definirCampos(cliente, d.id, campos);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(campos.length ? `Formulário salvo com ${campos.length} pergunta(s).` : "Formulário salvo: só nome e e-mail.");
});

// ---------------------------------------------------------------- inscrição pública (sem login)

/**
 * A pessoa se inscreve na página pública: o banco confere tudo e cria a pessoa e a inscrição;
 * depois a conta (e-mail e senha) é criada e a pessoa já fica logada para acompanhar.
 */
export const inscrever = criarAcao(
  z.object({
    slug: z.string().min(1),
    nome: texto("o nome completo", { min: 3, max: 120 }),
    email,
    senha: z.string().optional().default(""),
    confirma: z.string().optional().default(""),
    respostas: z.string().default("{}"),
    termo: z.string().optional(),
    // Campo escondido: gente não preenche, robô sim.
    site: z.string().optional(),
  }),
  async (d) => {
    if (d.site) return sucesso("Inscrição recebida.");
    const cliente = await clienteServidor();
    const logado = await usuarioAutenticado(cliente);
    if (!logado) {
      if (d.senha.length < 6) return falha("Crie uma senha com pelo menos 6 caracteres.");
      if (d.senha !== d.confirma) return falha("As senhas não conferem.");
    }

    const edicao = await repo.edicaoPublica(cliente, d.slug);
    if (!edicao) return falha("Esta edição não recebe inscrições por aqui.");
    let respostas: Respostas;
    try {
      respostas = JSON.parse(d.respostas);
    } catch {
      return falha("Não foi possível ler as respostas. Recarregue a página e tente de novo.");
    }
    respostas = limparRespostas(edicao.campos, respostas);
    const erros = validarRespostas(edicao.campos, respostas, {
      instituicoes: edicao.instituicoes.map((i) => i.id),
      aceitaOutra: edicao.acesso !== "instituicoes",
    });
    if (Object.keys(erros).length) return falha("Confira as perguntas marcadas em vermelho.");
    if (edicao.termo && d.termo !== String(edicao.termo.versao)) return falha("Leia e aceite o termo de uso dos dados.");

    const { data, error } = await repo.inscreverPublico(cliente, {
      slug: d.slug,
      nome: d.nome,
      email: logado?.email ?? d.email,
      respostas,
      termo: edicao.termo?.versao ?? null,
    });
    if (error) return falha(traduzirErro(error));
    const r = data as { situacao: string; ja_inscrito: boolean; email: string };

    if (!logado) {
      const conta = await criarConta(cliente, r.email, d.senha);
      if (conta.jaTinha)
        return sucesso(
          r.ja_inscrito
            ? "Você já tinha se inscrito nesta edição. Entre com a sua senha para acompanhar."
            : `Inscrição feita (${situacaoInscricao(r.situacao).rotulo.toLowerCase()}). Você já tem conta de outra edição: entre com a sua senha de sempre.`,
        );
      if (!conta.ok) return falha("Inscrição feita, mas não deu para criar a senha agora. Use “Primeiro acesso” na tela de login.");
    }
    redirect("/minha-inscricao");
  },
);

// ---------------------------------------------------------------- decisões da organização

export const decidirInscricao = criarAcao(
  z.object({
    id,
    situacao: umDe(
      SITUACOES_INSCRICAO.map((s) => s.valor),
      "Situação inválida.",
    ),
    anterior: z.string().optional(),
  }),
  async (d) => {
    const { cliente } = await sessaoAtual();
    const { data, error } = await repo.decidirInscricao(cliente, d.id, d.situacao);
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    const promovidas = (data as { promovidas?: number } | null)?.promovidas ?? 0;
    const msg = `Inscrição: ${situacaoInscricao(d.situacao).rotulo.toLowerCase()}.${promovidas ? ` ${promovidas} pessoa(s) da lista de espera entraram na vaga.` : ""}`;
    return d.anterior && !promovidas ? sucesso(msg, { id: d.id, situacao: d.anterior }) : sucesso(msg);
  },
);

/** Termo de uso dos dados: texto novo vira versão nova (as inscrições guardam qual aceitaram). */
export const salvarTermo = criarAcao(z.object({ id, texto: texto("o texto do termo", { min: 20, max: 20000 }) }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.definirTermo(cliente, d.id, d.texto);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(`Termo salvo (versão ${data}).`);
});
