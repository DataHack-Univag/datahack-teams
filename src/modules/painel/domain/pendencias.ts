// O que precisa de atenção no evento agora (heurística 1: estado do sistema num lugar só).

import type { Andamento } from "@/modules/avaliacao/domain/consolidacao";
import { pendenciasEquipe, situacaoRepo } from "@/modules/equipes/domain/permissoes";
import type { Configuracao, Equipe } from "@/modules/equipes/domain/tipos";
import type { Inscrito } from "@/modules/pessoas/domain/tipos";
import type { Troca } from "@/modules/trocas/domain/tipos";

export type Pendencia = {
  id: string;
  tom: "alerta" | "erro" | "info";
  titulo: string;
  detalhe: string;
  href: string;
  acao: string;
};

export type ResumoEvento = {
  equipes: number;
  alunosComEquipe: number;
  totalAlunos: number;
  reposPublicos: number;
  trocasPendentes: number;
  fichasCompletas: number;
  fichasEsperadas: number;
};

export function resumirEvento(equipes: Equipe[], totalAlunos: number, trocas: Troca[], andamento: Andamento[]): ResumoEvento {
  return {
    equipes: equipes.length,
    alunosComEquipe: equipes.reduce((s, e) => s + e.membros.length, 0),
    totalAlunos,
    reposPublicos: equipes.filter((e) => situacaoRepo(e) === "publico").length,
    trocasPendentes: trocas.length,
    fichasCompletas: andamento.reduce((s, a) => s + a.completas, 0),
    fichasEsperadas: andamento.reduce((s, a) => s + a.total, 0),
  };
}

export function listarPendencias({
  equipes,
  semEquipe,
  trocas,
  andamento,
  config,
  encerrada,
  propostas = [],
}: {
  equipes: Equipe[];
  /** Equipes propostas pelos alunos ainda não aprovadas. */
  propostas?: Equipe[];
  semEquipe: Inscrito[];
  trocas: Troca[];
  andamento: Andamento[];
  config: Configuracao;
  encerrada: boolean;
}): Pendencia[] {
  const p: Pendencia[] = [];
  const nomes = (xs: { nome: string }[]) => xs.slice(0, 4).map((x) => x.nome).join(", ") + (xs.length > 4 ? ` e mais ${xs.length - 4}` : "");

  const aguardando = propostas.filter((e) => e.situacao === "aguardando_aprovacao");
  if (aguardando.length)
    p.push({
      id: "propostas",
      tom: "alerta",
      titulo: `${aguardando.length} equipe(s) proposta(s) aguardando aprovação`,
      detalhe: nomes(aguardando),
      href: "/admin/equipes/propostas",
      acao: "Analisar",
    });
  if (equipes.length === 0 && !propostas.length)
    p.push(
      config.modo_formacao === "alunos_propoem"
        ? { id: "sem-equipes", tom: "info", titulo: "Nenhuma equipe proposta ainda", detalhe: "Nesta edição os alunos propõem as equipes pelo sistema.", href: "/admin/equipes/propostas", acao: "Ver propostas" }
        : { id: "sem-equipes", tom: "info", titulo: "Nenhuma equipe criada", detalhe: "Monte as equipes com o gerador ou crie à mão.", href: "/admin/equipes/gerador", acao: "Abrir o gerador" },
    );
  if (semEquipe.length)
    p.push({
      id: "sem-equipe",
      tom: "alerta",
      titulo: `${semEquipe.length} aluno(s) sem equipe`,
      detalhe: nomes(semEquipe),
      href: "/admin/pessoas?filtro=sem_equipe",
      acao: "Ver quem são",
    });
  if (trocas.length)
    p.push({
      id: "trocas",
      tom: "info",
      titulo: `${trocas.length} pedido(s) de troca aguardando`,
      detalhe: "Alguém da equipe de destino precisa aceitar. A organização pode cancelar.",
      href: "/admin/equipes/trocas?status=pendente",
      acao: "Ver pedidos",
    });

  const semLider = equipes.filter((e) => pendenciasEquipe(e).includes("sem líder"));
  if (semLider.length)
    p.push({ id: "sem-lider", tom: "alerta", titulo: `${semLider.length} equipe(s) sem líder`, detalhe: nomes(semLider), href: "/admin/equipes?filtro=pendentes", acao: "Ver equipes" });
  const semRepo = equipes.filter((e) => situacaoRepo(e) === "pendente");
  if (semRepo.length)
    p.push({ id: "sem-repo", tom: "alerta", titulo: `${semRepo.length} equipe(s) sem repositório`, detalhe: nomes(semRepo), href: "/admin/equipes?filtro=pendentes", acao: "Ver equipes" });
  const privados = equipes.filter((e) => situacaoRepo(e) === "privado");
  if (privados.length)
    p.push({
      id: "repo-privado",
      tom: "erro",
      titulo: `${privados.length} repositório(s) privado(s) ou inexistente(s)`,
      detalhe: `${nomes(privados)}. A banca não consegue abrir.`,
      href: "/admin/equipes?filtro=pendentes",
      acao: "Ver equipes",
    });

  if (!encerrada) {
    const incompletas = andamento.filter((a) => a.avaliadores > 0 && a.completas < a.total);
    for (const a of incompletas)
      p.push({
        id: `andamento-${a.rubrica}`,
        tom: "info",
        titulo: `${a.curto}: ${a.total - a.completas} equipe(s) sem ficha completa`,
        detalhe: a.bancaTexto,
        href: "/admin/avaliacao?aba=andamento",
        acao: "Ver andamento",
      });
  }
  if (config.edicao_bloqueada)
    p.push({ id: "bloqueada", tom: "info", titulo: "Edição pelos alunos bloqueada", detalhe: "Os alunos só visualizam a equipe.", href: "/admin/equipes#regras", acao: "Mudar" });
  return p;
}
