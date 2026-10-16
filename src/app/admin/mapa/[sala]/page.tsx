import { notFound } from "next/navigation";
import Link from "next/link";
import { Aviso } from "@/shared/ui/Aviso";
import { Pagina } from "@/shared/ui/Pagina";
import { buscarSala, carregarMapa } from "@/modules/mapa/infra/repositorio";
import { EditorSala } from "@/modules/mapa/ui/EditorSala";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";

// Editor de uma sala do mapa, em tela cheia (os painéis ficam nas laterais).
export default async function AdminSala({ params }: PageProps<"/admin/mapa/[sala]">) {
  const { sala: id } = await params;
  const { cliente, edicao } = await sessaoAtual();
  const [sala, mapa] = await Promise.all([buscarSala(cliente, id), carregarMapa(cliente, edicao.id)]);
  if (!sala || sala.edicao_id !== edicao.id) notFound();
  const piso = mapa.pisos.find((p) => p.id === sala.piso_id);
  const variosPisos = mapa.pisos.filter((p) => p.salas.length).length > 1;

  // Edição encerrada: o desenho não muda mais (o croqui continua para consulta).
  if (edicao.situacao === "encerrada")
    return (
      <Pagina>
        <Aviso tom="info" titulo={`Edição ${edicao.numero} encerrada`}>
          O desenho das salas não muda mais. Para ver o mapa, abra o{" "}
          <Link href="/admin/mapa/croqui" className="font-semibold text-marca underline">
            Croqui
          </Link>
          .
        </Aviso>
      </Pagina>
    );
  return <EditorSala sala={sala} elementos={mapa.elementos.filter((e) => e.sala_id === sala.id)} piso={variosPisos ? piso?.nome : null} />;
}
