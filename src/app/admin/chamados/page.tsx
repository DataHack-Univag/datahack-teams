import { TelaChamados } from "@/modules/chamados/ui/TelaChamados";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Organização → Chamados: os pedidos de ajuda das equipes (a mentoria vê a mesma tela).
export default async function AdminChamados({ searchParams }: PageProps<"/admin/chamados">) {
  const { aba } = await searchParams;
  const { cliente, edicao } = await sessaoAtual();
  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Chamados" }]}
        titulo="Pedidos de ajuda"
        destaque="ajuda"
        descricao="As equipes que pediram ajuda, na ordem de atendimento: problemas primeiro, depois quem espera há mais tempo."
      />
      <TelaChamados cliente={cliente} edicao={edicao} aba={aba === "encerrados" ? "encerrados" : "abertos"} base="/admin/chamados" />
    </Pagina>
  );
}
