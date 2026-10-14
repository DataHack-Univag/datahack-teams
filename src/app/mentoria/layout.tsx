import { redirect } from "next/navigation";
import { Area } from "@/app/_shell/Area";
import { comandosDasAbas, navMentoria } from "@/app/_shell/menus";
import { listarResumo } from "@/modules/equipes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { inicioDoPapel } from "@/modules/pessoas/domain/papeis";
import type { Comando } from "@/shared/ui/PaletaComandos";

// Área da mentoria: acompanhar as equipes e fazer a chamada. A organização entra aqui pelo "ver como".
export default async function LayoutMentoria({ children }: LayoutProps<"/mentoria">) {
  const { cliente, usuario, avatar, mentor, edicao } = await sessaoAtual();
  if (!mentor) redirect(inicioDoPapel(usuario.papel));

  const equipes = await listarResumo(cliente, edicao.id);
  const itens = navMentoria();
  const comandos: Comando[] = [
    ...comandosDasAbas(itens),
    ...equipes.map((e) => ({ grupo: "Equipes", rotulo: e.nome, href: `/mentoria/equipes#equipe-${e.id}`, icone: "equipe" as const, detalhe: `${e.total} integrantes` })),
  ];

  return (
    <Area nome={usuario.nome} papel={usuario.papel} avatar={avatar} itens={itens} comandos={comandos}>
      {children}
    </Area>
  );
}
