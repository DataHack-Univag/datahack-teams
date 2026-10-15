"use server";

import type { Respostas } from "@/modules/inscricoes/domain/campos";
import { salvarRespostasOrganizacao } from "@/modules/inscricoes/infra/repositorio";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { lerFuncao } from "@/modules/pessoas/domain/papeis";
import * as repo from "@/modules/pessoas/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { decimalOpcional, email, inteiroOpcional, texto } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { encerrarSessao } from "@/shared/auth/autenticacao";
import { apagarEdicaoEscolhida } from "@/shared/auth/edicao";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

/** "aluno", "organizador" ou "avaliador:<banca>". */
const funcao = z
  .string()
  .transform((v) => lerFuncao(v))
  .refine((v) => v !== null, "Escolha a função da pessoa.")
  .transform((v) => v!);

/** Banca no banco: a escolhida (avaliador) ou a da organização (organizador). */
async function bancaId(edicaoId: string, papel: string, banca: string | null) {
  const cliente = await clienteServidor();
  if (papel === "organizador") return repo.idDaBancaOrganizacao(cliente, edicaoId);
  if (papel === "avaliador") return repo.idDaBanca(cliente, edicaoId, banca);
  return null;
}

/** Cria ou edita a pessoa e a participação dela na edição. "email_original" indica edição. */
export const salvarParticipante = criarAcao(
  z.object({
    email_original: z.string().optional(),
    email,
    nome: texto("o nome", { min: 2, max: 120 }),
    curso: z.string().optional().transform((v) => v?.trim().toUpperCase() || null),
    semestre: inteiroOpcional("O semestre", 1, 12),
    nota: decimalOpcional("A nota", 0, 10),
    funcao,
  }),
  async (d, bruto) => {
    const { cliente, edicao } = await sessaoAtual();
    const original = d.email_original?.trim().toLowerCase();
    const idBanca = await bancaId(edicao.id, d.funcao.papel, d.funcao.banca);
    if (d.funcao.papel === "avaliador" && !idBanca) return falha("Escolha uma banca que exista nesta edição.");
    const error = await repo.salvarParticipacao(
      cliente,
      edicao.id,
      {
        email: d.email,
        nome: d.nome,
        // Campo que o formulário da edição não mostra não chega: fica como está.
        curso: bruto.curso === undefined ? undefined : d.curso,
        semestre: bruto.semestre === undefined ? undefined : d.semestre,
        papel: d.funcao.papel,
        bancaId: idBanca,
      },
      original,
    );
    if (error) return falha(traduzirErro(error));

    // Nota vazia ou 0 = sem nota (ex.: calouro). Num cadastro novo de quem já existe, vazio não apaga a nota.
    if (bruto.nota !== undefined && (original || bruto.nota.trim())) {
      const erroNota = await repo.salvarNota(cliente, edicao.id, d.email, d.nota ? d.nota : null);
      if (erroNota) return falha(traduzirErro(erroNota));
    }
    // As outras perguntas do formulário da edição (só aluno tem inscrição).
    if (bruto.respostas !== undefined && d.funcao.papel === "aluno") {
      let respostas: Respostas = {};
      try {
        respostas = JSON.parse(bruto.respostas || "{}");
      } catch {
        return falha("Não foi possível ler as outras perguntas. Recarregue a página e tente de novo.");
      }
      const { error: erroResp } = await salvarRespostasOrganizacao(cliente, edicao.id, d.email, respostas);
      if (erroResp) return falha(`Pessoa salva, mas as outras perguntas não: ${traduzirErro(erroResp)}`);
    }
    atualizarTelas();
    return sucesso(original ? "Dados salvos." : `${d.nome} está na ${edicao.nome}. Já pode criar a senha em “Primeiro acesso”.`);
  },
);

/** Tira a pessoa da edição (a participação é arquivada; dá para desfazer). */
export const removerParticipante = criarAcao(z.object({ email }), async (d) => {
  const { cliente, edicao, real } = await sessaoAtual();
  if (d.email === real.email) return falha("Você não pode tirar a si mesmo da edição.");
  const { removeu, error } = await repo.arquivarParticipacao(cliente, edicao.id, d.email);
  if (error) return falha(traduzirErro(error));
  if (!removeu) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso("Pessoa tirada da edição: ela deixa de ter acesso. O histórico dela continua guardado.", { email: d.email });
});

export const restaurarParticipante = criarAcao(z.object({ email }), async (d) => {
  const { cliente, edicao } = await sessaoAtual();
  const { restaurou, error } = await repo.restaurarParticipacao(cliente, edicao.id, d.email);
  if (error) return falha(traduzirErro(error));
  if (!restaurou) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso("Pessoa de volta à edição.");
});

export const alterarFuncao = criarAcao(z.object({ email, funcao }), async (d) => {
  const { cliente, edicao, real } = await sessaoAtual();
  if (d.email === real.email && d.funcao.papel !== "organizador") return falha("Você não pode tirar o seu próprio acesso de organização.");
  const idBanca = await bancaId(edicao.id, d.funcao.papel, d.funcao.banca);
  const { mudou, error } = await repo.mudarFuncao(cliente, edicao.id, d.email, d.funcao.papel, idBanca);
  if (error) return falha(traduzirErro(error));
  if (!mudou) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso("Função atualizada. As fichas já lançadas continuam valendo.");
});

/** "presente", "ausente" ou vazio (sem registro, usado pelo desfazer). */
const presenca = z.enum(["presente", "ausente", ""], { message: "Presença inválida." }).transform((v) => v || null);

/**
 * Marca o aluno como presente ou ausente (organização e mentoria). O aviso traz o
 * "desfazer", que volta ao registro anterior (heurística 3).
 */
export const registrarPresenca = criarAcao(
  z.object({ email, presenca, anterior: presenca.optional(), nome: z.string().optional() }),
  async (d) => {
    const { cliente, edicao } = await sessaoAtual();
    const { error } = await repo.registrarPresenca(cliente, edicao.id, d.email, d.presenca);
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    const quem = d.nome || "Aluno";
    const texto = d.presenca === "presente" ? `${quem}: presente.` : d.presenca === "ausente" ? `${quem}: ausente.` : `Presença de ${quem} sem registro.`;
    return sucesso(texto, { email: d.email, presenca: d.anterior ?? "", anterior: d.presenca ?? "", nome: quem });
  },
);

/** Lista de marcações enviada como JSON: [{ email, presenca }] (presenca null = sem registro). */
const marcacoes = z.string().transform((v, ctx) => {
  try {
    const lista = JSON.parse(v) as { email: string; presenca: "presente" | "ausente" | null }[];
    if (Array.isArray(lista) && lista.every((m) => typeof m.email === "string" && [null, "presente", "ausente"].includes(m.presenca))) return lista;
  } catch {}
  ctx.addIssue({ code: "custom", message: "Lista de presença inválida. Recarregue a página." });
  return z.NEVER;
});

/**
 * Marca vários alunos de uma vez (atalho "Todos presentes" na equipe). O desfazer volta
 * cada um ao registro que tinha antes.
 */
export const registrarPresencas = criarAcao(
  z.object({ itens: marcacoes, anteriores: z.string().optional(), rotulo: z.string().optional() }),
  async (d) => {
    const { cliente, edicao } = await sessaoAtual();
    for (const m of d.itens) {
      const { error } = await repo.registrarPresenca(cliente, edicao.id, m.email, m.presenca);
      if (error) return falha(traduzirErro(error));
    }
    atualizarTelas();
    const rotulo = d.rotulo || "Equipe";
    const presentes = d.itens.filter((m) => m.presenca === "presente").length;
    const texto = presentes === d.itens.length ? `${rotulo}: ${presentes} presente(s).` : `${rotulo}: presença desfeita.`;
    return sucesso(texto, { itens: d.anteriores ?? "[]", anteriores: JSON.stringify(d.itens), rotulo });
  },
);

export async function sair() {
  await apagarEdicaoEscolhida();
  await encerrarSessao(await clienteServidor());
  redirect("/login");
}
