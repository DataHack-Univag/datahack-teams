import { planilhaEquipes } from "@/modules/equipes/application/exportacao";
import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import { respostaCsv } from "@/shared/lib/csv";
import { clienteServidor } from "@/shared/db/servidor";

// Planilha das equipes (uma linha por integrante). Só a organização.
export async function GET() {
  const cliente = await clienteServidor();
  const { data: organizador } = await cliente.rpc("eh_organizador");
  if (!organizador) return new Response("Acesso restrito à organização.", { status: 403 });
  return respostaCsv("equipes-datahack", planilhaEquipes(await listarEquipes(cliente)), ",");
}
