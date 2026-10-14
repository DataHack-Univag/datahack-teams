import { notFound } from "next/navigation";
import { configuracaoDa, presencaDosMembros, situacaoEquipe } from "@/modules/equipes/domain/tipos";
import { buscarEquipe } from "@/modules/equipes/infra/repositorio";
import { locaisDaEdicao } from "@/modules/mapa/infra/repositorio";
import { ArquivarEquipe } from "@/modules/equipes/ui/FormulariosOrganizacao";
import { PainelEquipe } from "@/modules/equipes/ui/PainelEquipe";
import { AnalisarProposta } from "@/modules/equipes/ui/Propostas";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { listarSemEquipe, presencaDaEdicao } from "@/modules/pessoas/infra/repositorio";
import { PresencaEquipe } from "@/modules/pessoas/ui/MarcarPresenca";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";
import { Selo } from "@/shared/ui/Selo";

// Uma equipe vista pela organização (pode editar tudo).
export default async function EquipeAdmin({ params }: PageProps<"/admin/equipes/[id]">) {
  const { id } = await params;
  const { cliente, usuario, edicao } = await sessaoAtual();
  const [equipe, disponiveis, presenca, locais] = await Promise.all([
    buscarEquipe(cliente, id),
    listarSemEquipe(cliente, edicao.id),
    presencaDaEdicao(cliente, edicao.id),
    locaisDaEdicao(cliente, edicao.id),
  ]);
  if (!equipe || equipe.edicao_id !== edicao.id) notFound();
  const situacao = situacaoEquipe(equipe.situacao);
  const emAnalise = equipe.situacao === "formando" || equipe.situacao === "aguardando_aprovacao";

  return (
    <Pagina estreita>
      <CabecalhoPagina
        trilha={[
          { rotulo: "Organização", href: "/admin" },
          { rotulo: "Equipes", href: emAnalise ? "/admin/equipes/propostas" : "/admin/equipes" },
          { rotulo: equipe.nome },
        ]}
        titulo="Gerenciar equipe"
        descricao={equipe.situacao !== "aprovada" ? <Selo tom={situacao.tom}>{situacao.rotulo}</Selo> : undefined}
        acoes={
          equipe.situacao === "aprovada" && (
            <BotaoLink href={`/avaliar/${equipe.id}`} icone="avaliacao" tamanho="pequeno">
              Avaliar esta equipe
            </BotaoLink>
          )
        }
      />
      {emAnalise && <AnalisarProposta equipe={equipe} />}
      <PainelEquipe equipe={equipe} disponiveis={disponiveis} config={configuracaoDa(edicao)} meuEmail={usuario.email} organizador rotulo="Equipe" local={locais[equipe.id]} />
      {equipe.situacao === "aprovada" && equipe.membros.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">Presença no evento</h2>
          <PresencaEquipe equipe={equipe.nome} pessoas={presencaDosMembros(equipe, presenca)} />
        </section>
      )}
      {equipe.situacao === "aprovada" && <ArquivarEquipe equipe={equipe} />}
    </Pagina>
  );
}
