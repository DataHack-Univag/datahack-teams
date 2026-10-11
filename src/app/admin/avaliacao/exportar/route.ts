import type { NextRequest } from "next/server";
import { carregarRanking } from "@/modules/avaliacao/application/consultas";
import { planilhaAvaliacao, TIPOS_EXPORTACAO } from "@/modules/avaliacao/application/exportacao";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { respostaCsv } from "@/shared/lib/csv";

// Planilhas da avaliação (CSV ";" com vírgula decimal, abre certo no Excel em português).
// ?tipo=ranking (padrão) | analitico | brutos | fichas. Só a organização.
export async function GET(request: NextRequest) {
  const { cliente, edicao, real } = await sessaoAtual();
  if (real.papel !== "organizador") return new Response("Acesso restrito à organização.", { status: 403 });

  const pedido = request.nextUrl.searchParams.get("tipo");
  const tipo = TIPOS_EXPORTACAO.find((t) => t === pedido) ?? "ranking";
  const { reg, linhas } = await carregarRanking(cliente, edicao);
  const planilha = planilhaAvaliacao(reg, tipo, linhas);
  return respostaCsv(`${planilha.nome}-${edicao.slug}`, planilha.linhas);
}
