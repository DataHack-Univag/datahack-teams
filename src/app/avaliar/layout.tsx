import { redirect } from "next/navigation";
import { Area } from "@/app/_shell/Area";
import { aoVivoBancas, aoVivoOrganizacao } from "@/app/_shell/aoVivo";
import { comandosDasAbas, comandosExtrasOrganizacao, navBancas, navOrganizacao } from "@/app/_shell/menus";
import { listarResumo } from "@/modules/equipes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import type { Comando } from "@/shared/ui/PaletaComandos";
import { TempoReal } from "@/shared/ui/TempoReal";

// Área das bancas: avaliadores (técnico/negócio) e organizadores.
// A organização continua com as abas dela; as bancas veem só "Avaliar" e "Ajuda".
export default async function LayoutAvaliar({ children }: LayoutProps<"/avaliar">) {
  const { cliente, usuario, avatar, organizador, avaliador, edicao } = await sessaoAtual();
  if (!organizador && !avaliador) redirect("/");

  const equipes = await listarResumo(cliente, edicao.id);
  const nav = organizador ? navOrganizacao() : { itens: navBancas(), mais: undefined };
  const comandos: Comando[] = [
    ...comandosDasAbas([...nav.itens, ...(nav.mais ?? [])]),
    ...(organizador ? comandosExtrasOrganizacao : []),
    ...equipes.map((e) => ({ grupo: "Avaliar equipe", rotulo: e.nome, href: `/avaliar/${e.id}`, icone: "avaliacao" as const })),
  ];

  return (
    <Area nome={usuario.nome} papel={usuario.papel} avatar={avatar} itens={nav.itens} mais={nav.mais} comandos={comandos}>
      <TempoReal {...(organizador ? aoVivoOrganizacao(edicao.id) : aoVivoBancas(edicao.id))} />
      {children}
    </Area>
  );
}
