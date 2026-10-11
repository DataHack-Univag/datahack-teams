import { notFound } from "next/navigation";
import { buscarEquipe, lerConfiguracao } from "@/modules/equipes/infra/repositorio";
import { ExcluirEquipe } from "@/modules/equipes/ui/FormulariosOrganizacao";
import { PainelEquipe } from "@/modules/equipes/ui/PainelEquipe";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { listarSemEquipe } from "@/modules/pessoas/infra/repositorio";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Uma equipe vista pela organização (pode editar tudo).
export default async function EquipeAdmin({ params }: PageProps<"/admin/equipes/[id]">) {
  const { id } = await params;
  const { cliente, usuario } = await sessaoAtual();
  const [equipe, disponiveis, config] = await Promise.all([buscarEquipe(cliente, id), listarSemEquipe(cliente), lerConfiguracao(cliente)]);
  if (!equipe) notFound();

  return (
    <Pagina estreita>
      <CabecalhoPagina
        trilha={[
          { rotulo: "Organização", href: "/admin" },
          { rotulo: "Equipes", href: "/admin/equipes" },
          { rotulo: equipe.nome },
        ]}
        titulo="Gerenciar equipe"
        acoes={
          <BotaoLink href={`/avaliar/${equipe.id}`} icone="avaliacao" tamanho="pequeno">
            Avaliar esta equipe
          </BotaoLink>
        }
      />
      <PainelEquipe equipe={equipe} disponiveis={disponiveis} config={config} meuEmail={usuario.email} organizador rotulo="Equipe" />
      <ExcluirEquipe equipe={equipe} />
    </Pagina>
  );
}
