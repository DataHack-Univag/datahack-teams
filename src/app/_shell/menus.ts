// Itens de navegação e da busca rápida de cada área (um lugar só, para ficarem consistentes).

import type { Comando } from "@/shared/ui/PaletaComandos";
import type { ItemNav } from "@/shared/ui/Navegacao";

/** Organização: 6 abas na ordem do evento. No celular: 4 na barra + "Mais". */
export function navOrganizacao(contagens: { trocas?: number } = {}): { itens: ItemNav[]; mais: ItemNav[] } {
  return {
    itens: [
      { href: "/admin", rotulo: "Painel", icone: "painel" },
      { href: "/admin/equipes", rotulo: "Equipes", icone: "equipe", prefixos: ["/admin/equipes"], contagem: contagens.trocas },
      { href: "/admin/avaliacao", rotulo: "Avaliação", icone: "avaliacao", prefixos: ["/admin/avaliacao", "/avaliar"] },
      { href: "/admin/ranking", rotulo: "Ranking", icone: "ranking", prefixos: ["/admin/ranking"] },
    ],
    mais: [
      { href: "/admin/pessoas", rotulo: "Pessoas", icone: "pessoas", prefixos: ["/admin/pessoas"] },
      { href: "/admin/materiais", rotulo: "Materiais", icone: "materiais", prefixos: ["/admin/materiais"] },
      { href: "/admin/edicoes", rotulo: "Edições", icone: "relogio", prefixos: ["/admin/edicoes"] },
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

/** Aluno: abas por parâmetro (?aba=). `base` muda no modo "ver como". */
export function navAluno(base: string, contagens: { trocas?: number } = {}, comAjuda = true): ItemNav[] {
  const sep = base.includes("?") ? "&" : "?";
  const itens: ItemNav[] = [
    { href: `${base}${sep}aba=equipe`, rotulo: "Minha equipe", icone: "equipe", aba: "equipe", padrao: true },
    { href: `${base}${sep}aba=trocas`, rotulo: "Trocas", icone: "trocas", aba: "trocas", contagem: contagens.trocas },
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
  { grupo: "Telas", rotulo: "Nova edição", href: "/admin/edicoes#nova", icone: "mais_novo" },
  { grupo: "Telas", rotulo: "Regulamento da edição", href: "/admin/edicoes/regulamento", icone: "avaliacao" },
  { grupo: "Telas", rotulo: "Andamento das fichas", href: "/admin/avaliacao?aba=andamento", icone: "avaliacao" },
  { grupo: "Telas", rotulo: "Fichas e penalidades", href: "/admin/avaliacao?aba=fichas", icone: "avaliacao" },
  { grupo: "Telas", rotulo: "Lançar notas (fichas)", href: "/avaliar", icone: "editar" },
  { grupo: "Telas", rotulo: "Cadastrar pessoa", href: "/admin/pessoas#cadastrar", icone: "mais_novo" },
];
