import { redirect } from "next/navigation";
import { Area } from "@/app/_shell/Area";
import { aoVivoMentoria } from "@/app/_shell/aoVivo";
import { comandosDasAbas, navMentoria } from "@/app/_shell/menus";
import { contarChamadosAbertos } from "@/modules/chamados/infra/repositorio";
import { listarResumo } from "@/modules/equipes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { inicioDoPapel } from "@/modules/pessoas/domain/papeis";
import type { Comando } from "@/shared/ui/PaletaComandos";
import { TempoReal } from "@/shared/ui/TempoReal";

// Área da mentoria: acompanhar as equipes e fazer a chamada. A organização entra aqui pelo "ver como".
export default async function LayoutMentoria({ children }: LayoutProps<"/mentoria">) {
  const { cliente, usuario, avatar, mentor, edicao } = await sessaoAtual();
  if (!mentor) redirect(inicioDoPapel(usuario.papel));

  const [equipes, chamados] = await Promise.all([listarResumo(cliente, edicao.id), contarChamadosAbertos(cliente, edicao.id)]);
  const itens = navMentoria({ chamados });
  const comandos: Comando[] = [
    ...comandosDasAbas(itens),
    ...equipes.map((e) => ({ grupo: "Equipes", rotulo: e.nome, href: `/mentoria/equipes#equipe-${e.id}`, icone: "equipe" as const, detalhe: `${e.total} integrantes` })),
  ];

  return (
    <Area nome={usuario.nome} papel={usuario.papel} avatar={avatar} itens={itens} comandos={comandos}>
      {/* Pedido de ajuda novo chega com aviso; presença e equipes se atualizam sozinhas. */}
      <TempoReal {...aoVivoMentoria(edicao.id)} />
      {children}
    </Area>
  );
}
