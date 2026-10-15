import { TelaCheckin } from "@/modules/checkin/ui/TelaCheckin";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";

// Organização → Check-in: ler o QR de entrada dos participantes.
export default async function CheckinOrganizacao() {
  const { edicao } = await sessaoAtual();
  return <TelaCheckin trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Check-in" }]} edicao={edicao.nome} atual={edicao.atual} />;
}
