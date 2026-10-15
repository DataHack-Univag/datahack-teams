import type { MarcaEdicao } from "@/modules/instituicoes/domain/tipos";
import type { Campo, PerguntaCatalogo, Respostas } from "@/modules/inscricoes/domain/campos";
import type { EdicaoPublica, SituacaoInscricao } from "@/modules/inscricoes/domain/publica";
import { ErroCarregamento, exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";
import type { Json } from "@/shared/db/tipos-banco";

// Perguntas de inscrição: o banco de perguntas prontas e as perguntas de cada edição.

const COLUNAS = "chave, rotulo, ajuda, tipo, opcoes, condicao, obrigatorio, sensivel";

export async function carregarCatalogo(cliente: Cliente): Promise<PerguntaCatalogo[]> {
  const r = await cliente
    .from("perguntas_catalogo")
    .select("grupo, chave, rotulo, ajuda, tipo, opcoes, condicao, sensivel, traz")
    .is("removido_em", null)
    .order("ordem")
    .overrideTypes<Omit<PerguntaCatalogo, "obrigatorio">[], { merge: false }>();
  return (exigir(r, "o banco de perguntas") ?? []).map((p) => ({ ...p, obrigatorio: true }));
}

/** As perguntas ativas da edição, na ordem do formulário. */
export async function camposDaEdicao(cliente: Cliente, edicaoId: string): Promise<Campo[]> {
  const r = await cliente
    .from("campos_inscricao")
    .select(COLUNAS)
    .eq("edicao_id", edicaoId)
    .is("removido_em", null)
    .order("ordem")
    .overrideTypes<Campo[], { merge: false }>();
  return exigir(r, "as perguntas da inscrição") ?? [];
}

/** Quantas inscrições a edição tem (para avisar antes de mudar o formulário). */
export async function contarInscricoes(cliente: Cliente, edicaoId: string): Promise<number> {
  const r = await cliente.from("inscricoes").select("id", { count: "exact", head: true }).eq("edicao_id", edicaoId).neq("situacao", "cancelada");
  return r.count ?? 0;
}

/** Salva o formulário inteiro (o banco arquiva o que saiu e confere as condições). */
export const definirCampos = (cliente: Cliente, edicaoId: string, campos: Campo[]) =>
  cliente.rpc("definir_campos_inscricao", { p_edicao: edicaoId, p_campos: campos as unknown as Json });

// ---------------------------------------------------------------- inscrição pública

/** A edição como a página pública mostra (null = não existe ou é evento fechado). */
export async function edicaoPublica(cliente: Cliente, slug: string): Promise<EdicaoPublica | null> {
  const { data, error } = await cliente.rpc("edicao_publica", { p_slug: slug });
  if (error) throw new ErroCarregamento("a página de inscrição", error);
  return (data as unknown as EdicaoPublica | null) ?? null;
}

export const inscreverPublico = (cliente: Cliente, d: { slug: string; nome: string; email: string; respostas: Respostas; termo: number | null }) =>
  cliente.rpc("inscrever_publico", {
    p_slug: d.slug,
    p_nome: d.nome,
    p_email: d.email,
    p_respostas: d.respostas as unknown as Json,
    p_termo_versao: d.termo ?? undefined,
  });

export type MinhaInscricao = {
  edicao: string;
  numero: number;
  slug: string;
  marca: MarcaEdicao;
  data_inicio: string | null;
  data_fim: string | null;
  local: string | null;
  situacao: SituacaoInscricao;
  criado_em: string;
  posicao: number | null;
};

/** As inscrições de quem está logado (mesmo sem participar de nenhuma edição ainda). */
export async function minhasInscricoes(cliente: Cliente): Promise<MinhaInscricao[]> {
  const { data, error } = await cliente.rpc("minhas_inscricoes");
  if (error) return [];
  return (data as unknown as MinhaInscricao[]) ?? [];
}

export type Vitrine = {
  atual: { nome: string; marca: MarcaEdicao; local: string | null; data_inicio: string | null; data_fim: string | null } | null;
  inscricoes: { slug: string; nome: string; situacao: "aberta" | "em_breve"; data_inicio: string | null; local: string | null }[];
};

/** Para o login: a marca da edição atual e as inscrições abertas (vazio se o banco não tiver a 020). */
export async function vitrine(cliente: Cliente): Promise<Vitrine> {
  const { data, error } = await cliente.rpc("vitrine");
  if (error || !data) return { atual: null, inscricoes: [] };
  return data as unknown as Vitrine;
}

// ---------------------------------------------------------------- fila da organização

export type LinhaInscricao = {
  id: string;
  email: string;
  nome: string;
  situacao: SituacaoInscricao;
  origem: "importacao" | "formulario";
  respostas: Respostas;
  instituicao: string | null;
  termo_versao: number | null;
  criado_em: string;
  decidido_em: string | null;
};

export async function listarInscricoes(cliente: Cliente, edicaoId: string): Promise<LinhaInscricao[]> {
  const r = await cliente
    .from("inscricoes")
    .select("id, email, situacao, origem, respostas, termo_versao, criado_em, decidido_em, pessoas (nome), instituicoes (sigla, nome)")
    .eq("edicao_id", edicaoId)
    .order("criado_em");
  return (exigir(r, "as inscrições") ?? []).map((x) => ({
    id: x.id,
    email: x.email,
    nome: x.pessoas?.nome ?? x.email,
    situacao: x.situacao as SituacaoInscricao,
    origem: x.origem as LinhaInscricao["origem"],
    respostas: (x.respostas ?? {}) as Respostas,
    instituicao: x.instituicoes ? (x.instituicoes.sigla ?? x.instituicoes.nome) : null,
    termo_versao: x.termo_versao,
    criado_em: x.criado_em,
    decidido_em: x.decidido_em,
  }));
}

export const decidirInscricao = (cliente: Cliente, id: string, situacao: SituacaoInscricao) =>
  cliente.rpc("decidir_inscricao", { p_inscricao: id, p_situacao: situacao });

export async function termoAtual(cliente: Cliente, edicaoId: string): Promise<{ versao: number; texto: string } | null> {
  const { data } = await cliente.from("termos").select("versao, texto").eq("edicao_id", edicaoId).order("versao", { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

export const definirTermo = (cliente: Cliente, edicaoId: string, texto: string) => cliente.rpc("definir_termo", { p_edicao: edicaoId, p_texto: texto });

/** Inscrições esperando a organização (número no menu). Zero se o banco não tiver a 018. */
export async function contarPendentes(cliente: Cliente, edicaoId: string): Promise<number> {
  const r = await cliente.from("inscricoes").select("id", { count: "exact", head: true }).eq("edicao_id", edicaoId).eq("situacao", "pendente");
  return r.error ? 0 : (r.count ?? 0);
}

// ---------------------------------------------------------------- cadastro pela organização

/** Respostas de cada pessoa na edição (por e-mail), para o cadastro em Pessoas. */
export async function respostasDaEdicao(cliente: Cliente, edicaoId: string): Promise<Record<string, Respostas>> {
  const r = await cliente.from("inscricoes").select("email, respostas").eq("edicao_id", edicaoId);
  return Object.fromEntries((exigir(r, "as respostas da inscrição") ?? []).map((x) => [x.email, (x.respostas ?? {}) as Respostas]));
}

/** A organização preenche as perguntas da edição para alguém (curso, semestre e CR vão por outro caminho). */
export const salvarRespostasOrganizacao = (cliente: Cliente, edicaoId: string, email: string, respostas: Respostas) =>
  cliente.rpc("salvar_respostas_organizacao", { p_edicao: edicaoId, p_email: email, p_respostas: respostas as unknown as Json });
