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

/**
 * A "cara" da edição. `logo` é a imagem do topo das telas: um data URL (PNG, JPG, WEBP ou SVG
 * enviado pela organização) ou um arquivo do próprio sistema ("/logo-datahack.png").
 * `cor` pinta a placa da logo e a faixa no topo.
 */
export type MarcaEdicao = { nome_publico?: string; cor?: string; logo?: string };

/** O que o cabeçalho e o menu de edições mostram. Sem logo, aparece só o nome "DATAHack". */
export type MarcaResolvida = { nome: string; cor: string | null; logo: string | null };

export function resolverMarca(edicao: { nome: string; marca?: MarcaEdicao | null }): MarcaResolvida {
  const m = edicao.marca ?? {};
  return {
    nome: m.nome_publico?.trim() || edicao.nome,
    cor: m.cor && COR.test(m.cor) ? m.cor : null,
    logo: m.logo && logoValida(m.logo) ? m.logo : null,
  };
}

const COR = /^#[0-9a-fA-F]{6}$/;
export const corValida = (c: string) => COR.test(c);

/** Placa padrão da logo (o azul-marinho do DATAHack). */
export const COR_PADRAO = "#000b38";

// ---------------------------------------------------------------- logo da edição (imagem)

/** Limite do arquivo da logo, depois de virar texto (data URL). */
export const LIMITE_LOGO = 700_000;

const LOGO = /^(data:image\/(png|jpeg|webp|svg\+xml)[;,]|\/[A-Za-z0-9_./-]+$)/;
export const logoValida = (logo: string) => LOGO.test(logo) && logo.length <= LIMITE_LOGO;

/** Confere a logo da edição (data URL ou caminho); devolve o problema em texto ou null. */
export function conferirLogo(logo: string): string | null {
  if (!LOGO.test(logo)) return "Use uma imagem PNG, JPG, WEBP ou SVG.";
  if (logo.length > LIMITE_LOGO) return `A logo ficou com ${Math.round(logo.length / 1000)} KB; o limite é ${LIMITE_LOGO / 1000} KB. Use uma imagem menor.`;
  return null;
}

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
