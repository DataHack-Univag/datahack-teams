import { planilhaEquipes } from "@/modules/equipes/application/exportacao";
import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { respostaCsv } from "@/shared/lib/csv";

// Planilha das equipes (uma linha por integrante). Só a organização.
export async function GET() {
  const { cliente, edicao, real } = await sessaoAtual();
  if (real.papel !== "organizador") return new Response("Acesso restrito à organização.", { status: 403 });
  return respostaCsv(`equipes-${edicao.slug}`, planilhaEquipes(await listarEquipes(cliente, edicao.id)), ",");
}
