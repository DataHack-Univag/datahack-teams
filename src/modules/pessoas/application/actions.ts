"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { lerFuncao } from "@/modules/pessoas/domain/papeis";
import * as repo from "@/modules/pessoas/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { decimalOpcional, email, inteiroOpcional, texto } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { encerrarSessao } from "@/shared/auth/autenticacao";
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
      { email: d.email, nome: d.nome, curso: d.curso, semestre: d.semestre, papel: d.funcao.papel, bancaId: idBanca },
      original,
    );
    if (error) return falha(traduzirErro(error));

    // Nota vazia ou 0 = sem nota (ex.: calouro). Num cadastro novo de quem já existe, vazio não apaga a nota.
    if (original || bruto.nota?.trim()) {
      const erroNota = await repo.salvarNota(cliente, edicao.id, d.email, d.nota ? d.nota : null);
      if (erroNota) return falha(traduzirErro(erroNota));
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

export async function sair() {
  await encerrarSessao(await clienteServidor());
  redirect("/login");
}
