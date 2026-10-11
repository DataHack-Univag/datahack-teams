"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { VALORES_PAPEL } from "@/modules/pessoas/domain/papeis";
import * as repo from "@/modules/pessoas/infra/repositorio";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { decimalOpcional, email, inteiroOpcional, texto, umDe } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { encerrarSessao } from "@/shared/auth/autenticacao";
import { traduzirErro } from "@/shared/db/erros";
import { clienteServidor } from "@/shared/db/servidor";

const papel = umDe(VALORES_PAPEL, "Escolha o papel da pessoa.");

/** Cria ou edita um participante. "email_original" indica edição; "sobrescrever" promove quem já existe. */
export const salvarParticipante = criarAcao(
  z.object({
    email_original: z.string().optional(),
    sobrescrever: z.string().optional(),
    email,
    nome: texto("o nome", { min: 2, max: 120 }),
    curso: z.string().optional().transform((v) => v?.trim().toUpperCase() || null),
    semestre: inteiroOpcional("O semestre", 1, 12),
    nota: decimalOpcional("A nota", 0, 10),
    papel,
  }),
  async (d, bruto) => {
    const cliente = await clienteServidor();
    const original = d.email_original?.trim().toLowerCase();
    const sobrescrever = d.sobrescrever === "1";
    const error = await repo.salvarInscrito(
      cliente,
      { email: d.email, nome: d.nome, curso: d.curso, semestre: d.semestre, papel: d.papel },
      { emailOriginal: original, sobrescrever },
    );
    if (error) return falha(traduzirErro(error));

    // Nota vazia ou 0 = sem nota (ex.: calouro). Ao promover alguém, nota vazia não apaga a existente.
    if (!(sobrescrever && !bruto.nota?.trim())) {
      const erroNota = await repo.salvarNota(cliente, d.email, d.nota ? d.nota : null);
      if (erroNota) return falha(traduzirErro(erroNota));
    }
    atualizarTelas();
    return sucesso(original ? "Dados salvos." : `${d.nome} cadastrado(a). Já pode criar a senha em “Primeiro acesso”.`);
  },
);

export const removerParticipante = criarAcao(z.object({ email }), async (d) => {
  const cliente = await clienteServidor();
  if (d.email === (await repo.emailNormalizado(cliente))) return falha("Você não pode remover a si mesmo.");
  const { removeu, error } = await repo.removerInscrito(cliente, d.email);
  if (error) return falha(traduzirErro(error));
  if (!removeu) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso("Pessoa removida da lista. A conta dela deixa de ter acesso.");
});

export const alterarPapel = criarAcao(z.object({ email, papel }), async (d) => {
  const cliente = await clienteServidor();
  if (d.email === (await repo.emailNormalizado(cliente)) && d.papel !== "organizador")
    return falha("Você não pode tirar o seu próprio acesso de organização.");
  const { mudou, error } = await repo.mudarPapel(cliente, d.email, d.papel);
  if (error) return falha(traduzirErro(error));
  if (!mudou) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso(d.papel === "aluno" ? "Acesso removido: agora é aluno." : "Papel atualizado.");
});

export async function sair() {
  await encerrarSessao(await clienteServidor());
  redirect("/login");
}
