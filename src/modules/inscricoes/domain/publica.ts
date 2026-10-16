// A edição como aparece na página pública de inscrição e o andamento de cada inscrição.

import type { Acesso, Aprovacao, MarcaEdicao } from "@/modules/instituicoes/domain/tipos";
import type { Campo, Respostas } from "@/modules/inscricoes/domain/campos";

export type SituacaoInscricoes = "fechada" | "em_breve" | "aberta" | "encerrada";
export type SituacaoInscricao = "pendente" | "aprovada" | "espera" | "recusada" | "cancelada";

export type EdicaoPublica = {
  id: string;
  numero: number;
  slug: string;
  nome: string;
  marca: MarcaEdicao;
  descricao: string | null;
  local: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  acesso: Acesso;
  aprovacao: Aprovacao;
  vagas: number | null;
  inscricao_abre_em: string | null;
  inscricao_fecha_em: string | null;
  situacao: SituacaoInscricoes;
  aprovadas: number;
  campos: Campo[];
  instituicoes: { id: string; nome: string }[];
  termo: { versao: number; texto: string } | null;
};

export const SITUACOES_INSCRICAO: { valor: SituacaoInscricao; rotulo: string; tom: "sucesso" | "alerta" | "marca" | "erro" | "neutro"; explicacao: string }[] = [
  { valor: "pendente", rotulo: "Em análise", tom: "alerta", explicacao: "A organização ainda vai analisar a sua inscrição." },
  { valor: "aprovada", rotulo: "Aprovada", tom: "sucesso", explicacao: "Você está no evento. Entre no sistema para ver sua equipe e as informações." },
  { valor: "espera", rotulo: "Lista de espera", tom: "marca", explicacao: "As vagas acabaram. Se alguém desistir, você entra na ordem da fila." },
  { valor: "recusada", rotulo: "Não aprovada", tom: "erro", explicacao: "A organização não aprovou esta inscrição. Em caso de dúvida, fale com ela." },
  { valor: "cancelada", rotulo: "Cancelada", tom: "neutro", explicacao: "Esta inscrição foi cancelada." },
];

/**
 * Situação das inscrições pelo site — a mesma regra do banco (situacao_inscricao, migração 028):
 * só abre na edição atual e dentro do prazo. Planejada e ainda não atual: "ainda não abriram".
 */
export function situacaoDasInscricoes(
  e: { acesso?: string | null; situacao: string; atual: boolean; inscricao_abre_em?: string | null; inscricao_fecha_em?: string | null },
  agora = Date.now(),
): SituacaoInscricoes {
  if (!e.acesso || e.acesso === "lista") return "fechada";
  if (e.situacao === "encerrada" || (e.inscricao_fecha_em && agora >= Date.parse(e.inscricao_fecha_em))) return "encerrada";
  if (e.inscricao_abre_em && agora < Date.parse(e.inscricao_abre_em)) return "em_breve";
  if (!e.atual) return e.situacao === "planejada" ? "em_breve" : "encerrada";
  return "aberta";
}

/**
 * Pergunta pronta "Li e aceito o uso dos meus dados" (chave "termo"): quando a edição tem o
 * termo de uso cadastrado, ela some da tela e o aceite do termo vale por ela (um aceite só).
 */
export const ehAceiteDosDados = (c: Pick<Campo, "chave" | "tipo">) => c.tipo === "aceite" && c.chave === "termo";

export const perguntasNaTela = (campos: Campo[], temTermo: boolean) => (temTermo ? campos.filter((c) => !ehAceiteDosDados(c)) : campos);

/** Respostas com o aceite do termo copiado para a pergunta pronta, se ela existir. */
export function comAceiteDoTermo(campos: Campo[], respostas: Respostas, temTermo: boolean, aceitou: boolean): Respostas {
  if (!temTermo) return respostas;
  const r = { ...respostas };
  for (const c of campos.filter(ehAceiteDosDados)) {
    if (aceitou) r[c.chave] = true;
    else delete r[c.chave];
  }
  return r;
}

/** Nome como o banco guarda: espaços repetidos (inclusive os "invisíveis") viram um só. */
export const limparNome = (nome: string) => nome.replace(/\s+/g, " ").trim();

/** A mesma regra do banco (inscrever_publico): nome e sobrenome, de 3 a 120 letras. */
export function problemaNoNome(nome: string): string | null {
  const n = limparNome(nome);
  if (n.length < 3) return "Informe o seu nome completo.";
  if (n.length > 120) return "O nome pode ter no máximo 120 caracteres.";
  if (!n.includes(" ")) return "Informe o nome e o sobrenome (ex.: Maria Silva).";
  return null;
}

export const situacaoInscricao = (s: string) => SITUACOES_INSCRICAO.find((x) => x.valor === s) ?? SITUACOES_INSCRICAO[0];

/** Vagas que sobram (null = sem limite). */
export const vagasRestantes = (e: Pick<EdicaoPublica, "vagas" | "aprovadas">) => (e.vagas === null ? null : Math.max(0, e.vagas - e.aprovadas));

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Cuiaba", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Frase do estado das inscrições ("Inscrições abertas até 30/05/2027 18:00"). */
export function fraseInscricoes(e: Pick<EdicaoPublica, "situacao" | "inscricao_abre_em" | "inscricao_fecha_em">): string {
  if (e.situacao === "em_breve") return e.inscricao_abre_em ? `As inscrições abrem em ${dataHora(e.inscricao_abre_em)}.` : "As inscrições ainda não foram abertas.";
  if (e.situacao === "encerrada") return "As inscrições estão encerradas.";
  if (e.situacao === "fechada") return "Este evento é só para convidados da organização.";
  return e.inscricao_fecha_em ? `Inscrições abertas até ${dataHora(e.inscricao_fecha_em)}.` : "Inscrições abertas.";
}
