import { sessaoAtual } from "@/modules/pessoas/application/sessao";

// Regulamento da edição no formato canônico (JSON), para copiar para outra edição. Só a organização.
export async function GET() {
  const { cliente, edicao, real } = await sessaoAtual();
  if (real.papel !== "organizador") return new Response("Acesso restrito à organização.", { status: 403 });
  const { data, error } = await cliente.rpc("exportar_regulamento", { p_edicao: edicao.id });
  if (error) return new Response("Não foi possível exportar o regulamento.", { status: 500 });
  return new Response(JSON.stringify(data, null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="regulamento-${edicao.slug}.json"`,
    },
  });
}
