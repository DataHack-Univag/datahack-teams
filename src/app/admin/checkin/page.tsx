import { entradasDaEdicao } from "@/modules/checkin/infra/repositorio";
import { TelaCheckin } from "@/modules/checkin/ui/TelaCheckin";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";

// Organização → Check-in: ler o QR de entrada e a lista de quem entrou e de quem falta.
export default async function CheckinOrganizacao({ searchParams }: PageProps<"/admin/checkin">) {
  const { aba } = await searchParams;
  const { cliente, edicao } = await sessaoAtual();
  const entradas = await entradasDaEdicao(cliente, edicao.id);
  return (
    <TelaCheckin
      trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Check-in" }]}
      edicao={edicao.nome}
      edicaoId={edicao.id}
      atual={edicao.atual}
      base="/admin/checkin"
      aba={aba === "lista" ? "lista" : "leitor"}
      entradas={entradas}
    />
  );
}
