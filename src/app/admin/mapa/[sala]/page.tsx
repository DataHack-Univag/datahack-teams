import { notFound } from "next/navigation";
import { medida } from "@/modules/mapa/domain/catalogo";
import { buscarSala, carregarMapa } from "@/modules/mapa/infra/repositorio";
import { EditorSala } from "@/modules/mapa/ui/EditorSala";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Editor de uma sala do mapa.
export default async function AdminSala({ params }: PageProps<"/admin/mapa/[sala]">) {
  const { sala: id } = await params;
  const { cliente, edicao } = await sessaoAtual();
  const [sala, mapa] = await Promise.all([buscarSala(cliente, id), carregarMapa(cliente, edicao.id)]);
  if (!sala || sala.edicao_id !== edicao.id) notFound();
  const piso = mapa.pisos.find((p) => p.id === sala.piso_id);
  const elementos = mapa.elementos.filter((e) => e.sala_id === sala.id);

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Mapa", href: "/admin/mapa" }, { rotulo: sala.nome }]}
        titulo={sala.nome}
        descricao={`${piso && piso.nome !== "Piso único" ? `${piso.nome} · ` : ""}${medida(sala.largura_cm)} × ${medida(sala.profundidade_cm)} · ${elementos.reduce((t, e) => t + (e.lugares ?? 0), 0)} lugar(es) para equipes`}
        acoes={
          <BotaoLink href="/admin/mapa/croqui" variante="secundario" icone="mapa">
            Ver croqui
          </BotaoLink>
        }
      />
      <EditorSala sala={sala} elementos={elementos} />
    </Pagina>
  );
}
