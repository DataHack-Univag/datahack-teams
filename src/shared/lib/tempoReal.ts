// Regras dos avisos ao vivo: qual mudança do banco vira um aviso na tela ("Nova inscrição
// recebida"). Funções puras, testadas sem navegador.

export type TabelaAoVivo =
  | "inscricoes"
  | "participacoes"
  | "equipes"
  | "membros"
  | "trocas"
  | "chamados"
  | "fichas"
  | "notas_criterio"
  | "penalidades_equipe"
  | "materiais"
  | "alocacoes"
  | "fases"
  | "criterios";

/** Uma tabela para acompanhar, com filtro do Realtime (ex.: "edicao_id=eq.<id>"). */
export type Assinatura = { tabela: TabelaAoVivo; filtro?: string };

type Condicao = string | { diferente: string };

export type RegraAviso = {
  tabela: TabelaAoVivo;
  /** Padrão: inserção ou alteração. */
  evento?: "INSERT" | "UPDATE";
  /** Colunas da linha nova que precisam bater (ou ser diferentes, ex.: "não fui eu"). */
  onde?: Record<string, Condicao>;
  /** Coluna de data que precisa ser de agora há pouco (evita avisar de alteração antiga). */
  recente?: string;
  texto: string;
  /** Texto quando chegam vários juntos; "{n}" vira a quantidade. */
  plural?: string;
  /** Tela para onde o botão "Ver" do aviso leva. */
  link?: string;
};

export type Mudanca = { tabela: string; evento: string; linha: Record<string, unknown> };

const RECENTE_MS = 2 * 60 * 1000;

export function casaRegra(regra: RegraAviso, m: Mudanca, agora = Date.now()): boolean {
  if (regra.tabela !== m.tabela) return false;
  if (regra.evento ? regra.evento !== m.evento : m.evento !== "INSERT" && m.evento !== "UPDATE") return false;
  for (const [coluna, condicao] of Object.entries(regra.onde ?? {})) {
    const valor = m.linha[coluna] == null ? null : String(m.linha[coluna]);
    if (typeof condicao === "string" ? valor !== condicao : valor === condicao.diferente) return false;
  }
  if (regra.recente) {
    const quando = m.linha[regra.recente];
    const t = typeof quando === "string" ? Date.parse(quando) : NaN;
    if (Number.isNaN(t) || agora - t > RECENTE_MS) return false;
  }
  return true;
}

/** A mesma linha não avisa duas vezes o mesmo texto (ex.: duas alterações seguidas). */
export const chaveDoAviso = (regra: RegraAviso, m: Mudanca) => `${regra.texto}|${m.tabela}|${String(m.linha.id ?? JSON.stringify(m.linha))}`;

/** Avisos que chegaram juntos viram um só por texto ("3 novas inscrições"). */
export function agruparAvisos(regras: RegraAviso[]): { texto: string; link?: string }[] {
  const contagem = new Map<RegraAviso, number>();
  for (const r of regras) contagem.set(r, (contagem.get(r) ?? 0) + 1);
  const porTexto = new Map<string, { regra: RegraAviso; n: number }>();
  for (const [regra, n] of contagem) {
    const atual = porTexto.get(regra.texto);
    porTexto.set(regra.texto, { regra, n: (atual?.n ?? 0) + n });
  }
  return [...porTexto.values()].map(({ regra, n }) => ({
    texto: n > 1 && regra.plural ? regra.plural.replace("{n}", String(n)) : regra.texto,
    link: regra.link,
  }));
}
