import { redirect } from "next/navigation";
import { Area } from "@/app/_shell/Area";
import { comandosDasAbas, comandosExtrasOrganizacao, navOrganizacao } from "@/app/_shell/menus";
import { contarChamadosAbertos } from "@/modules/chamados/infra/repositorio";
import { listarResumo } from "@/modules/equipes/infra/repositorio";
import { contarPendentes } from "@/modules/inscricoes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { rotuloPapel } from "@/modules/pessoas/domain/papeis";
import { listarPessoasResumo } from "@/modules/pessoas/infra/repositorio";
import { trocasPendentes } from "@/modules/trocas/infra/repositorio";
import type { Comando } from "@/shared/ui/PaletaComandos";

// Área da organização (só organizadores). Cada aba é uma rota em /admin/*.
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const { cliente, usuario, avatar, organizador, edicao } = await sessaoAtual();
  if (!organizador) redirect("/");

  const [equipes, pessoas, trocas, chamados, inscricoes] = await Promise.all([
    listarResumo(cliente, edicao.id),
    listarPessoasResumo(cliente, edicao.id),
    trocasPendentes(cliente, edicao.id),
    contarChamadosAbertos(cliente, edicao.id),
    contarPendentes(cliente, edicao.id),
  ]);
  const nav = navOrganizacao({ trocas: trocas.length, chamados, inscricoes });
  const comandos: Comando[] = [
    ...comandosDasAbas([...nav.itens, ...nav.mais]),
    ...comandosExtrasOrganizacao,
    ...equipes.map((e) => ({ grupo: "Equipes", rotulo: e.nome, href: `/admin/equipes/${e.id}`, icone: "equipe" as const, detalhe: `${e.total} integrantes` })),
    ...pessoas
      .filter((p) => p.papel !== "organizador")
      .map((p) => ({ grupo: "Ver como", rotulo: p.nome, href: `/ver-como?email=${encodeURIComponent(p.email)}`, icone: "olho" as const, detalhe: rotuloPapel(p.papel) })),
    ...pessoas.map((p) => ({ grupo: "Pessoas", rotulo: p.nome, href: `/admin/pessoas?busca=${encodeURIComponent(p.nome)}`, icone: "pessoas" as const, detalhe: p.email })),
  ];

  return (
    <Area nome={usuario.nome} papel={usuario.papel} avatar={avatar} itens={nav.itens} mais={nav.mais} comandos={comandos}>
      {children}
    </Area>
  );
}
