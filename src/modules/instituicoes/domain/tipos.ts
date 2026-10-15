// Instituições (Univag, UFMT, IFMT…) e a "cara" de cada edição: tipo de acesso e marca.

export type TipoInstituicao = "universidade" | "instituto" | "escola" | "empresa" | "outra";

export type Instituicao = {
  id: string;
  nome: string;
  sigla: string | null;
  cidade: string | null;
  uf: string | null;
  tipo: TipoInstituicao;
  site: string | null;
  logo_svg: string | null;
  removido_em: string | null;
};

export const TIPOS_INSTITUICAO: { valor: TipoInstituicao; rotulo: string }[] = [
  { valor: "universidade", rotulo: "Universidade / centro universitário" },
  { valor: "instituto", rotulo: "Instituto federal / técnico" },
  { valor: "escola", rotulo: "Escola" },
  { valor: "empresa", rotulo: "Empresa" },
  { valor: "outra", rotulo: "Outra" },
];

/** "UNIVAG" quando tem sigla; senão o nome. */
export const nomeCurto = (i: Pick<Instituicao, "nome" | "sigla">) => i.sigla || i.nome;

// ---------------------------------------------------------------- acesso

export type Acesso = "lista" | "instituicoes" | "aberto";
export type Aprovacao = "automatica" | "manual";

export const ACESSOS: { valor: Acesso; rotulo: string; descricao: string }[] = [
  {
    valor: "lista",
    rotulo: "Fechado: lista da organização",
    descricao: "Só entra quem a organização cadastra ou importa da planilha (como o DATAHack Univag 2026).",
  },
  {
    valor: "instituicoes",
    rotulo: "Instituições escolhidas",
    descricao: "A pessoa se inscreve e informa uma das instituições participantes.",
  },
  { valor: "aberto", rotulo: "Aberto a todos", descricao: "Qualquer pessoa se inscreve, estudando ou não, até acabarem as vagas." },
];

export const APROVACOES: { valor: Aprovacao; rotulo: string; descricao: string }[] = [
  { valor: "automatica", rotulo: "Automática", descricao: "A inscrição já entra aprovada (até acabarem as vagas)." },
  { valor: "manual", rotulo: "Pela organização", descricao: "Cada inscrição espera a organização aprovar." },
];

export const rotuloAcesso = (a: string) => ACESSOS.find((x) => x.valor === a)?.rotulo ?? a;

// ---------------------------------------------------------------- marca

export type MarcaEdicao = { nome_publico?: string; cor?: string; logo_svg?: string };

/** O que o cabeçalho mostra: logo da edição → logo da 1ª instituição → só a marca do DATAHack. */
export type MarcaResolvida = { nome: string; cor: string | null; logo: string | null; origem: "edicao" | "instituicao" | null };

export function resolverMarca(
  edicao: { nome: string; marca?: MarcaEdicao | null },
  instituicoes: Pick<Instituicao, "nome" | "sigla" | "logo_svg">[],
): MarcaResolvida {
  const m = edicao.marca ?? {};
  const daInstituicao = instituicoes.find((i) => i.logo_svg);
  return {
    nome: m.nome_publico?.trim() || edicao.nome,
    cor: m.cor && COR.test(m.cor) ? m.cor : null,
    logo: m.logo_svg ?? daInstituicao?.logo_svg ?? null,
    origem: m.logo_svg ? "edicao" : daInstituicao ? "instituicao" : null,
  };
}

const COR = /^#[0-9a-fA-F]{6}$/;
export const corValida = (c: string) => COR.test(c);

// ---------------------------------------------------------------- logo em SVG

export const LIMITE_SVG = 200_000;

/**
 * Confere a logo antes de gravar (o banco repete a regra). A logo é sempre mostrada como
 * <img>, que não executa nada; mesmo assim, SVG com script, eventos (onload=…), javascript:
 * ou foreignObject é recusado. Devolve o problema em texto, ou null se estiver tudo certo.
 */
export function conferirSvg(svg: string): string | null {
  const t = svg.trim();
  if (!t) return "O arquivo está vazio.";
  if (t.length > LIMITE_SVG) return `A logo tem ${Math.round(t.length / 1000)} KB; o limite é ${LIMITE_SVG / 1000} KB. Exporte o SVG otimizado (ex.: SVGOMG).`;
  if (!/<svg[\s>]/i.test(t)) return "Este arquivo não é um SVG. Exporte a logo como .svg.";
  if (/<script|javascript:|<foreignobject|\son[a-z]+\s*=/i.test(t))
    return "A logo tem código embutido (script ou eventos), o que não é permitido. Exporte de novo como SVG simples.";
  return null;
}

/** SVG em texto → endereço para <img src>, sem precisar de arquivo. */
export const svgComoImagem = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;

// ---------------------------------------------------------------- datas das inscrições

/** Mato Grosso não tem horário de verão: o horário do evento é sempre UTC−4. */
export const FUSO_MT = "-04:00";

/** Data/hora gravada (UTC) → valor do campo datetime-local, no horário de MT. */
export function paraCampoDataHora(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t - 4 * 3600_000).toISOString().slice(0, 16);
}
