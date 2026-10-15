import { edicoesPorInstituicao, listarInstituicoes } from "@/modules/instituicoes/infra/repositorio";
import { FormInstituicao, ListaInstituicoes } from "@/modules/instituicoes/ui/Instituicoes";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Instituições: cadastradas uma vez, escolhidas em cada edição (com a logo de cada uma).
export default async function AdminInstituicoes() {
  const { cliente } = await sessaoAtual();
  const [instituicoes, edicoes] = await Promise.all([listarInstituicoes(cliente, { arquivadas: true }), edicoesPorInstituicao(cliente)]);

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[
          { rotulo: "Organização", href: "/admin" },
          { rotulo: "Edições", href: "/admin/edicoes" },
          { rotulo: "Instituições" },
        ]}
        titulo="Instituições"
        destaque="Instituições"
        descricao="Cadastre cada instituição uma vez, com a logo. Em cada edição você escolhe quais participam."
        acoes={
          <BotaoAjuda titulo="Instituições">
            <ul>
              <li>Uma edição fechada (como a da Univag) tem uma instituição; um evento regional pode ter várias; um evento aberto aceita qualquer uma.</li>
              <li>A logo vai no topo das telas das edições da instituição, a menos que a edição tenha logo própria.</li>
              <li>Retirar uma instituição não muda as edições antigas: elas continuam com ela.</li>
            </ul>
          </BotaoAjuda>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <ListaInstituicoes instituicoes={instituicoes} edicoesPorInstituicao={edicoes} />
        <section className="card h-fit space-y-3 lg:sticky lg:top-20">
          <h2 className="text-lg font-semibold">Nova instituição</h2>
          <FormInstituicao />
        </section>
      </div>
    </Pagina>
  );
}
