import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import { carregarAlocacoes, carregarMapa } from "@/modules/mapa/infra/repositorio";
import { DistribuirEquipes } from "@/modules/mapa/ui/DistribuirEquipes";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Mapa → Equipes: distribuir as equipes aprovadas nos lugares das bancadas.
export default async function DistribuirPagina() {
  const { cliente, edicao } = await sessaoAtual();
  const [mapa, equipes, alocacoes] = await Promise.all([carregarMapa(cliente, edicao.id), listarEquipes(cliente, edicao.id), carregarAlocacoes(cliente, edicao.id)]);

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Mapa", href: "/admin/mapa" }, { rotulo: "Equipes" }]}
        titulo="Equipes no mapa"
        destaque="mapa"
        descricao="Onde cada equipe fica no evento. Alunos, bancas e mentores veem o lugar da equipe."
        acoes={
          <>
            <BotaoAjuda titulo="Distribuir as equipes">
              <ul>
                <li>No computador, arraste a equipe da lista até um lugar da bancada.</li>
                <li>No celular, toque na equipe e depois no lugar.</li>
                <li>Soltar num lugar ocupado troca as duas equipes de lugar. Toda mudança tem “Desfazer”.</li>
                <li>Para mudar uma equipe de lugar, toque nela no mapa e depois no lugar novo.</li>
              </ul>
            </BotaoAjuda>
            <BotaoLink href="/admin/mapa/croqui?equipes=1" variante="secundario" icone="mapa">
              Croqui com as equipes
            </BotaoLink>
          </>
        }
      />
      <DistribuirEquipes mapa={mapa} equipes={equipes.map((e) => ({ id: e.id, nome: e.nome, icone: e.icone }))} alocacoes={alocacoes} />
    </Pagina>
  );
}
