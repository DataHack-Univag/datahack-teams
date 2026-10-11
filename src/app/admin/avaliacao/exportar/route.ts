import type { NextRequest } from "next/server";
import { carregarRanking } from "@/modules/avaliacao/application/consultas";
import { planilhaAvaliacao, TIPOS_EXPORTACAO } from "@/modules/avaliacao/application/exportacao";
import { clienteServidor } from "@/shared/db/servidor";
import { respostaCsv } from "@/shared/lib/csv";

// Planilhas da avaliação (CSV ";" com vírgula decimal, abre certo no Excel em português).
// ?tipo=ranking (padrão) | analitico | brutos | fichas. Só a organização.
export async function GET(request: NextRequest) {
  const cliente = await clienteServidor();
  const { data: organizador } = await cliente.rpc("eh_organizador");
  if (!organizador) return new Response("Acesso restrito à organização.", { status: 403 });

  const pedido = request.nextUrl.searchParams.get("tipo");
  const tipo = TIPOS_EXPORTACAO.find((t) => t === pedido) ?? "ranking";
  const { linhas } = await carregarRanking(cliente);
  const planilha = planilhaAvaliacao(tipo, linhas);
  return respostaCsv(planilha.nome, planilha.linhas);
}
