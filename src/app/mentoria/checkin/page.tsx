import { TelaCheckin } from "@/modules/checkin/ui/TelaCheckin";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";

// Mentoria → Check-in: ler o QR de entrada dos participantes.
export default async function CheckinMentoria() {
  const { edicao } = await sessaoAtual();
  return <TelaCheckin trilha={[{ rotulo: "Mentoria", href: "/mentoria" }, { rotulo: "Check-in" }]} edicao={edicao.nome} atual={edicao.atual} />;
}
