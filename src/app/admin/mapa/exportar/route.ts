import { exportarMapa } from "@/modules/mapa/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";

// Mapa da edição no formato de importação (JSON em metros): backup ou ponto de partida da próxima edição.
export async function GET() {
  const { cliente, edicao, real } = await sessaoAtual();
  if (real.papel !== "organizador") return new Response("Acesso restrito à organização.", { status: 403 });
  const { data, error } = await exportarMapa(cliente, edicao.id);
  if (error) return new Response("Não foi possível exportar o mapa.", { status: 500 });
  return new Response(JSON.stringify(data, null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mapa-${edicao.slug}.json"`,
    },
  });
}
