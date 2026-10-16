import { listarMateriais } from "@/modules/materiais/infra/repositorio";
import { FormMaterial, ListaMateriais } from "@/modules/materiais/ui/Materiais";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Aba "Materiais": tudo que a organização publica aqui aparece para todos os alunos.
export default async function AdminMateriais() {
  const { cliente, edicao } = await sessaoAtual();
  const materiais = await listarMateriais(cliente, edicao.id);

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Materiais" }]}
        titulo="Materiais do evento"
        destaque="Materiais"
        descricao="Desafios, documentação, fontes e dicionários de dados. Tudo publicado aqui aparece para todos os participantes."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="card h-fit space-y-3">
          <h2 className="text-lg font-semibold">Publicar material</h2>
          <FormMaterial />
        </section>
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">Publicados ({materiais.length})</h2>
          <ListaMateriais materiais={materiais} editavel />
        </section>
      </div>
    </Pagina>
  );
}
