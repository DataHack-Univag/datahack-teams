"use server";

import { z } from "zod";
import { ACESSOS, APROVACOES, conferirLogo, conferirSvg, corValida, FUSO_MT, TIPOS_INSTITUICAO, type MarcaEdicao } from "@/modules/instituicoes/domain/tipos";
import * as repo from "@/modules/instituicoes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { caixa, id, inteiroOpcional, texto, textoOpcional, umDe } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";

// Toda permissão real é do banco: só a organização cadastra instituições e define o acesso.

/** Logo vinda do campo oculto: vazio = sem logo; senão precisa passar na conferência. */
const logoSvg = z
  .string()
  .optional()
  .transform((v) => v?.trim() || null)
  .superRefine((v, ctx) => {
    const problema = v ? conferirSvg(v) : null;
    if (problema) ctx.addIssue({ code: "custom", message: problema });
  });

/** Cadastra ou edita uma instituição (com `id`, edita). */
export const salvarInstituicao = criarAcao(
  z.object({
    id: z.string().optional(),
    nome: texto("o nome da instituição", { min: 3, max: 160 }),
    sigla: textoOpcional(20),
    cidade: textoOpcional(80),
    uf: z
      .string()
      .optional()
      .transform((v) => v?.trim().toUpperCase() || null)
      .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Use a sigla do estado com 2 letras, por exemplo MT."),
    tipo: umDe(
      TIPOS_INSTITUICAO.map((t) => t.valor),
      "Escolha o tipo da instituição.",
    ),
    site: textoOpcional(300),
    logo_svg: logoSvg,
  }),
  async ({ id: idInstituicao, ...dados }) => {
    const { cliente } = await sessaoAtual();
    if (idInstituicao) {
      const { data, error } = await repo.atualizarInstituicao(cliente, idInstituicao, dados);
      if (error) return falha(traduzirErro(error));
      if (!data?.length) return SEM_PERMISSAO;
      atualizarTelas();
      return sucesso(`${dados.sigla || dados.nome} atualizada.`);
    }
    const { error } = await repo.criarInstituicao(cliente, dados);
    if (error) return falha(error.code === "23505" ? "Já existe uma instituição com esse nome." : traduzirErro(error));
    atualizarTelas();
    return sucesso(`${dados.sigla || dados.nome} cadastrada.`);
  },
);

/** Retira (ou traz de volta) uma instituição da lista; as edições antigas continuam com ela. */
export const arquivarInstituicao = criarAcao(z.object({ id, voltar: caixa }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.arquivarInstituicao(cliente, d.id, !d.voltar);
  if (error) return falha(traduzirErro(error));
  if (!data?.length) return SEM_PERMISSAO;
  atualizarTelas();
  return d.voltar ? sucesso("Instituição de volta à lista.") : sucesso("Instituição retirada da lista.", { id: d.id, voltar: "1" });
});

// O horário digitado é o de Mato Grosso.
const dataHora = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? `${v.trim()}:00${FUSO_MT}` : null))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Informe a data e a hora pelo calendário.");

/** Tipo de acesso, inscrições, instituições e marca da edição. */
export const salvarAcessoEdicao = criarAcao(
  z.object({
    id,
    acesso: umDe(
      ACESSOS.map((a) => a.valor),
      "Escolha quem pode participar.",
    ),
    aprovacao: umDe(
      APROVACOES.map((a) => a.valor),
      "Escolha como as inscrições são aprovadas.",
    ),
    vagas: inteiroOpcional("O número de vagas", 1, 100000),
    inscricao_abre_em: dataHora,
    inscricao_fecha_em: dataHora,
    nome_publico: textoOpcional(120),
    cor: z
      .string()
      .optional()
      .transform((v) => v?.trim() || null)
      .refine((v) => v === null || corValida(v), "Escolha a cor pelo seletor."),
    logo: z
      .string()
      .optional()
      .transform((v) => v?.trim() || null)
      .superRefine((v, ctx) => {
        const problema = v ? conferirLogo(v) : null;
        if (problema) ctx.addIssue({ code: "custom", message: problema });
      }),
  }),
  async (d, _bruto, formulario) => {
    if (d.inscricao_abre_em && d.inscricao_fecha_em && d.inscricao_fecha_em <= d.inscricao_abre_em)
      return falha("O fim das inscrições precisa ser depois do início.");
    const instituicoes = formulario.getAll("instituicoes").map(String).filter(Boolean);
    if (d.acesso === "instituicoes" && !instituicoes.length) return falha("Marque ao menos uma instituição participante.");

    const marca: MarcaEdicao = {};
    if (d.nome_publico) marca.nome_publico = d.nome_publico;
    if (d.cor) marca.cor = d.cor;
    if (d.logo) marca.logo = d.logo;

    const { cliente } = await sessaoAtual();
    const { error } = await repo.definirAcessoEdicao(
      cliente,
      d.id,
      {
        acesso: d.acesso,
        aprovacao: d.aprovacao,
        vagas: d.vagas,
        inscricao_abre_em: d.inscricao_abre_em,
        inscricao_fecha_em: d.inscricao_fecha_em,
        marca,
      },
      instituicoes,
    );
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    return sucesso("Acesso e marca da edição salvos.");
  },
);
