"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { conferirRegulamento, regulamentoDoCanonico, type RegulamentoCanonico } from "@/modules/avaliacao/domain/regulamento";
import { MODOS_FORMACAO, SITUACOES_EDICAO } from "@/modules/edicoes/domain/tipos";
import * as repo from "@/modules/edicoes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { caixa, id, inteiroOpcional, sim, texto, textoOpcional, umDe } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { gravarEdicaoEscolhida } from "@/shared/auth/edicao";
import { apagarSimulacao } from "@/shared/auth/simulacao";
import { traduzirErro } from "@/shared/db/erros";

const data = z
  .string()
  .optional()
  .transform((v) => v?.trim() || null)
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Informe a data no formato do calendário.");
const modo = umDe(
  MODOS_FORMACAO.map((m) => m.valor),
  "Escolha como as equipes são formadas.",
);
const situacao = umDe(
  SITUACOES_EDICAO.map((m) => m.valor),
  "Escolha a situação da edição.",
);
const limite = (rotulo: string) => inteiroOpcional(rotulo, 1, 20).refine((v) => v !== null, `Informe ${rotulo.toLowerCase()}.`).transform((v) => v!);

/** Troca a edição que a organização está administrando (seletor do cabeçalho). */
export async function escolherEdicao(formulario: FormData) {
  const alvo = String(formulario.get("edicao") ?? "");
  const { edicoesDoUsuario, edicoesOrganizadas } = await sessaoAtual();
  if (edicoesDoUsuario.some((e) => e.id === alvo)) {
    await gravarEdicaoEscolhida(alvo, { lembrar: edicoesOrganizadas.length > 0 });
    await apagarSimulacao();
  }
  atualizarTelas();
  redirect(String(formulario.get("voltar") ?? "/admin") || "/admin");
}

/** Dados gerais da edição (nome, datas, local, descrição, formato). */
export const salvarDadosEdicao = criarAcao(
  z.object({
    id,
    nome: texto("o nome da edição", { min: 3, max: 120 }),
    data_inicio: data,
    data_fim: data,
    local: textoOpcional(200),
    descricao: textoOpcional(4000),
    formato: textoOpcional(8000),
    situacao,
  }),
  async (d) => {
    if (d.data_inicio && d.data_fim && d.data_fim < d.data_inicio) return falha("A data de fim precisa ser depois da data de início.");
    const { cliente } = await sessaoAtual();
    const { id: idEdicao, ...dados } = d;
    const { alterou, error } = await repo.atualizarEdicao(cliente, idEdicao, dados);
    if (error) return falha(traduzirErro(error));
    if (!alterou) return SEM_PERMISSAO;
    atualizarTelas();
    return sucesso("Dados da edição salvos.");
  },
);

/** Regras das equipes na edição. */
export const salvarRegrasEquipes = criarAcao(
  z.object({
    id,
    modo_formacao: modo,
    min_membros: limite("O mínimo de integrantes"),
    max_membros: limite("O máximo de integrantes"),
    permite_trocas: caixa,
    equipes_travadas: caixa,
  }),
  async (d) => {
    if (d.min_membros > d.max_membros) return falha("O mínimo de integrantes não pode passar do máximo.");
    const { cliente } = await sessaoAtual();
    const { id: idEdicao, ...dados } = d;
    const { alterou, error } = await repo.atualizarEdicao(cliente, idEdicao, dados);
    if (error) return falha(traduzirErro(error));
    if (!alterou) return SEM_PERMISSAO;
    atualizarTelas();
    return sucesso(d.equipes_travadas ? "Regras salvas. Os alunos só visualizam as equipes." : "Regras das equipes salvas.");
  },
);

/** Encerra/reabre o lançamento de notas pelas bancas (a organização continua editando). */
export const definirEncerramento = criarAcao(z.object({ encerrar: sim }), async (d) => {
  const { cliente, edicao } = await sessaoAtual();
  const { alterou, error } = await repo.atualizarEdicao(cliente, edicao.id, { avaliacao_encerrada: d.encerrar });
  if (error) return falha(traduzirErro(error));
  if (!alterou) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso(d.encerrar ? "Avaliação encerrada: as bancas só consultam as fichas." : "Avaliação reaberta: as bancas voltam a editar.");
});

/** Cria uma edição (opcionalmente copiando o regulamento e a organização de outra). */
export const criarEdicao = criarAcao(
  z.object({
    nome: texto("o nome da edição", { min: 3, max: 120 }),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]{3,60}$/, "O endereço curto usa só letras minúsculas, números e hífen (ex.: datahack-2027)."),
    data_inicio: data,
    data_fim: data,
    local: textoOpcional(200),
    modo_formacao: modo,
    min_membros: limite("O mínimo de integrantes"),
    max_membros: limite("O máximo de integrantes"),
    permite_trocas: caixa,
    copiar_de: z.string().optional().transform((v) => v || undefined),
  }),
  async (d) => {
    if (d.data_inicio && d.data_fim && d.data_fim < d.data_inicio) return falha("A data de fim precisa ser depois da data de início.");
    if (d.min_membros > d.max_membros) return falha("O mínimo de integrantes não pode passar do máximo.");
    const { cliente } = await sessaoAtual();
    const { copiar_de, ...dados } = d;
    const { data: novoId, error } = await repo.criarEdicao(cliente, dados, copiar_de);
    if (error) return falha(error.code === "23505" ? "Já existe uma edição com esse endereço curto. Escolha outro." : traduzirErro(error));
    await gravarEdicaoEscolhida(novoId);
    atualizarTelas();
    redirect(`/admin/edicoes?criada=1`);
  },
);

/** Faz da edição a atual: alunos e bancas passam a ver esta edição ao entrar. */
export const tornarAtual = criarAcao(z.object({ id }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { error } = await repo.definirEdicaoAtual(cliente, d.id);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Pronto: esta é a edição atual. Alunos e bancas veem esta edição ao entrar.");
});

/** Importa o regulamento (JSON no formato canônico) numa edição que ainda não tem um. */
export const importarRegulamento = criarAcao(z.object({ id, json: z.string().min(2, "Cole o JSON do regulamento.") }), async (d) => {
  let canonico: RegulamentoCanonico;
  try {
    canonico = JSON.parse(d.json);
  } catch {
    return falha("O texto colado não é um JSON válido. Use o arquivo exportado de outra edição (config/regulamento_2026.json).");
  }
  try {
    const erros = conferirRegulamento(regulamentoDoCanonico(canonico));
    if (erros.length) return falha(`O regulamento tem problemas: ${erros.join(" ")}`);
  } catch {
    return falha("O JSON não está no formato de regulamento (bancas, níveis, fases, rubricas, penalidades, desempate).");
  }
  const { cliente } = await sessaoAtual();
  const { error } = await repo.definirRegulamento(cliente, d.id, canonico);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Regulamento importado.");
});
