import { nomeBanca, rubricasDaBanca, situacaoFicha } from "@/modules/avaliacao/domain/bancas";
import { notaFicha } from "@/modules/avaliacao/domain/nota";
import { carregarRegulamento, listarFichas } from "@/modules/avaliacao/infra/repositorio";
import { AjudaCalculo } from "@/modules/avaliacao/ui/AjudaCalculo";
import { ListaAvaliar } from "@/modules/avaliacao/ui/ListaAvaliar";
import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { nota } from "@/shared/lib/formatar";
import { Aviso } from "@/shared/ui/Aviso";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Lista das equipes para a banca avaliar, com o andamento das fichas do avaliador logado.
export default async function Avaliar() {
  const { cliente, usuario, organizador, banca, edicao } = await sessaoAtual();
  const [reg, equipes, fichas] = await Promise.all([
    carregarRegulamento(cliente, edicao.id),
    listarEquipes(cliente, edicao.id),
    listarFichas(cliente, edicao.id, { avaliador: usuario.email }),
  ]);
  const encerrada = edicao.avaliacao_encerrada || edicao.situacao === "encerrada";
  // A lista mostra só as rubricas da própria banca; na ficha a organização pode abrir as outras.
  const minhas = rubricasDaBanca(reg, banca);

  const ficha = (equipeId: string, rubrica: string) => fichas.find((f) => f.equipe_id === equipeId && f.rubrica === rubrica);
  const total = equipes.length * minhas.length;
  const completas = equipes.reduce((s, e) => s + minhas.filter((r) => situacaoFicha(r, ficha(e.id, r.id)?.notas) === "completa").length, 0);
  const minhasNotas = equipes.flatMap((e) =>
    minhas.flatMap((r) => {
      const f = ficha(e.id, r.id);
      return f ? [notaFicha(r, f.notas ?? {})] : [];
    }),
  );
  const media = minhasNotas.length ? minhasNotas.reduce((a, b) => a + b, 0) / minhasNotas.length : null;

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: nomeBanca(reg, banca) || "Avaliação" }, { rotulo: "Avaliar" }]}
        titulo="Avaliar equipes"
        destaque="equipes"
        descricao={`Suas rubricas: ${minhas.map((r) => `${r.curto} (${r.pesoFinal}%)`).join(" · ")}`}
        acoes={<AjudaCalculo reg={reg} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="card p-4!">
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
            {completas} de {total}
          </p>
          <p className="text-xs text-suave">fichas completas</p>
        </div>
        <div className="card p-4!">
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
            <span className="grad-text">{nota(media)}</span>
          </p>
          <p className="text-xs text-suave">sua média ({minhasNotas.length} fichas)</p>
        </div>
      </div>

      {encerrada && (
        <Aviso tom="alerta" titulo="Avaliação encerrada">
          As fichas estão só para consulta{organizador ? " (você, como organização, ainda pode editar)." : "."}
        </Aviso>
      )}

      {equipes.length === 0 ? (
        <EstadoVazio icone="equipe" titulo="Nenhuma equipe cadastrada ainda">
          As equipes aparecem aqui assim que a organização montar os grupos.
        </EstadoVazio>
      ) : (
        <ListaAvaliar equipes={equipes} minhas={minhas} fichas={fichas} />
      )}
    </Pagina>
  );
}
