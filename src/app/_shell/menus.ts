// Itens de navegação e da busca rápida de cada área (um lugar só, para ficarem consistentes).

import type { Comando } from "@/shared/ui/PaletaComandos";
import type { ItemNav } from "@/shared/ui/Navegacao";

/**
 * Organização: 4 abas do dia a dia (também a barra do celular) e o resto em grupos por tarefa,
 * que no computador viram menus ("Participantes ▾"…) e no celular, seções do "Mais".
 */
export function navOrganizacao(contagens: { trocas?: number; chamados?: number; inscricoes?: number; paraAprovar?: number } = {}): { itens: ItemNav[]; mais: ItemNav[] } {
  return {
    itens: [
      { href: "/admin", rotulo: "Painel", icone: "painel" },
      // Pendências de Equipes: trocas pedidas + propostas prontas para a organização aprovar.
      { href: "/admin/equipes", rotulo: "Equipes", icone: "equipe", prefixos: ["/admin/equipes"], contagem: (contagens.trocas ?? 0) + (contagens.paraAprovar ?? 0) || undefined },
      { href: "/admin/avaliacao", rotulo: "Avaliação", icone: "avaliacao", prefixos: ["/admin/avaliacao", "/avaliar"] },
      { href: "/admin/ranking", rotulo: "Ranking", icone: "ranking", prefixos: ["/admin/ranking"] },
    ],
    mais: [
      { grupo: "Participantes", href: "/admin/pessoas", rotulo: "Pessoas", icone: "pessoas", prefixos: ["/admin/pessoas"] },
      { grupo: "Participantes", href: "/admin/inscricoes", rotulo: "Inscrições", icone: "editar", prefixos: ["/admin/inscricoes"], contagem: contagens.inscricoes },
      { grupo: "Participantes", href: "/admin/checkin", rotulo: "Check-in", icone: "qr", prefixos: ["/admin/checkin"] },
      { grupo: "Durante o evento", href: "/admin/chamados", rotulo: "Chamados", icone: "sino", prefixos: ["/admin/chamados"], contagem: contagens.chamados },
      { grupo: "Durante o evento", href: "/admin/mapa", rotulo: "Mapa", icone: "mapa", prefixos: ["/admin/mapa"] },
      { grupo: "Durante o evento", href: "/admin/materiais", rotulo: "Materiais", icone: "materiais", prefixos: ["/admin/materiais"] },
      // Formulário e regulamento (subpáginas de Edições) têm item próprio; "nova" fica em Edições.
      { grupo: "Configurar", href: "/admin/edicoes", rotulo: "Edições", icone: "relogio", prefixos: ["/admin/edicoes/nova"] },
      { grupo: "Configurar", href: "/admin/edicoes/inscricao", rotulo: "Formulário de inscrição", icone: "editar", prefixos: ["/admin/edicoes/inscricao"] },
      { grupo: "Configurar", href: "/admin/edicoes/regulamento", rotulo: "Regulamento", icone: "avaliacao", prefixos: ["/admin/edicoes/regulamento"] },
      { grupo: "Configurar", href: "/admin/instituicoes", rotulo: "Instituições", icone: "instituicao", prefixos: ["/admin/instituicoes"] },
      { href: "/ajuda", rotulo: "Ajuda", icone: "ajuda", prefixos: ["/ajuda"] },
    ],
  };
}

/** Bancas (professores e jurados): avaliar e ajuda. */
export function navBancas(): ItemNav[] {
  return [
    { href: "/avaliar", rotulo: "Avaliar", icone: "avaliacao", prefixos: ["/avaliar"] },
    { href: "/ajuda", rotulo: "Ajuda", icone: "ajuda", prefixos: ["/ajuda"] },
  ];
}

/** Mentoria: acompanhar as equipes e registrar a presença dos alunos. */
export function navMentoria(contagens: { chamados?: number } = {}): ItemNav[] {
  return [
    { href: "/mentoria/equipes", rotulo: "Equipes", icone: "equipe", prefixos: ["/mentoria/equipes"] },
    { href: "/mentoria/chamados", rotulo: "Chamados", icone: "sino", prefixos: ["/mentoria/chamados"], contagem: contagens.chamados },
    { href: "/mentoria/checkin", rotulo: "Check-in", icone: "qr", prefixos: ["/mentoria/checkin"] },
    { href: "/mentoria/pessoas", rotulo: "Pessoas", icone: "pessoas", prefixos: ["/mentoria/pessoas"] },
    { href: "/ajuda", rotulo: "Ajuda", icone: "ajuda", prefixos: ["/ajuda"] },
  ];
}

/** Aluno: abas por parâmetro (?aba=). `base` muda no modo "ver como". */
export function navAluno(base: string, contagens: { trocas?: number } = {}, comAjuda = true, permiteTrocas = true): ItemNav[] {
  const sep = base.includes("?") ? "&" : "?";
  const itens: ItemNav[] = [
    { href: `${base}${sep}aba=equipe`, rotulo: "Minha equipe", icone: "equipe", aba: "equipe", padrao: true },
    // Trocas só existem na edição que permite (o menu é o mesmo em todas as telas do aluno).
    ...(permiteTrocas ? [{ href: `${base}${sep}aba=trocas`, rotulo: "Trocas", icone: "trocas" as const, aba: "trocas", contagem: contagens.trocas }] : []),
    { href: `${base}${sep}aba=materiais`, rotulo: "Materiais", icone: "materiais", aba: "materiais" },
  ];
  if (comAjuda) itens.push({ href: "/ajuda", rotulo: "Ajuda", icone: "ajuda", prefixos: ["/ajuda"] });
  return itens;
}

export function comandosDasAbas(itens: ItemNav[], grupo = "Telas"): Comando[] {
  return itens.map((i) => ({ grupo, rotulo: i.rotulo, href: i.href, icone: i.icone }));
}

export const comandosExtrasOrganizacao: Comando[] = [
  { grupo: "Telas", rotulo: "Gerador de equipes", href: "/admin/equipes/gerador", icone: "gerador" },
  { grupo: "Telas", rotulo: "Histórico de trocas", href: "/admin/equipes/trocas", icone: "trocas" },
  { grupo: "Telas", rotulo: "Propostas de equipe", href: "/admin/equipes/propostas", icone: "equipe" },
  { grupo: "Telas", rotulo: "Nova edição", href: "/admin/edicoes/nova", icone: "mais_novo" },
  { grupo: "Telas", rotulo: "Acesso e marca da edição", href: "/admin/edicoes#acesso", icone: "instituicao" },
  { grupo: "Telas", rotulo: "Andamento das fichas", href: "/admin/avaliacao?aba=andamento", icone: "avaliacao" },
  { grupo: "Telas", rotulo: "Fichas e penalidades", href: "/admin/avaliacao?aba=fichas", icone: "avaliacao" },
  { grupo: "Telas", rotulo: "Lançar notas (fichas)", href: "/avaliar", icone: "editar" },
  { grupo: "Telas", rotulo: "Cadastrar pessoa", href: "/admin/pessoas#cadastrar", icone: "mais_novo" },
  { grupo: "Telas", rotulo: "Croqui do evento", href: "/admin/mapa/croqui", icone: "mapa" },
  { grupo: "Telas", rotulo: "Distribuir equipes no mapa", href: "/admin/mapa/equipes", icone: "equipe" },
  { grupo: "Telas", rotulo: "Pedidos de ajuda (chamados)", href: "/admin/chamados", icone: "sino" },
];
