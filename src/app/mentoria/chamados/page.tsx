import { TelaChamados } from "@/modules/chamados/ui/TelaChamados";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Mentoria → Chamados: quem pediu ajuda, onde está no mapa e há quanto tempo espera.
export default async function MentoriaChamados({ searchParams }: PageProps<"/mentoria/chamados">) {
  const { aba } = await searchParams;
  const { cliente, edicao } = await sessaoAtual();
  return (
    <Pagina>
      <CabecalhoPagina
        titulo="Pedidos de ajuda"
        destaque="ajuda"
        descricao="Toque em “Vou atender” para a equipe saber que alguém está a caminho; depois, em “Resolvido”."
      />
      <TelaChamados cliente={cliente} edicao={edicao} aba={aba === "encerrados" ? "encerrados" : "abertos"} base="/mentoria/chamados" />
    </Pagina>
  );
}
