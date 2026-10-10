import Link from "next/link";
import { Pagina } from "@/components/Pagina";
import { avaliacaoEncerrada, carregarAvaliacoes, exigir, SELECT_EQUIPE, sessaoAtual } from "@/lib/dados";
import { fmtNota, notaFicha } from "@/lib/nota";
import { BANCAS, RUBRICAS } from "@/lib/rubricas";
import type { Equipe } from "@/lib/tipos";

// Lista das equipes para a banca avaliar, com o andamento das fichas do avaliador logado.
export default async function Avaliar() {
  const { supabase, inscrito, organizador, banca } = await sessaoAtual();
  // Organização: as rubricas técnicas dela (mesa F1/F2 e F3); pode abrir as outras na ficha.
  const minhas = RUBRICAS.filter((r) => r.banca === banca);

  const [rEquipes, fichas, encerrada] = await Promise.all([
    supabase.from("equipes").select(SELECT_EQUIPE).order("nome").returns<Equipe[]>(),
    carregarAvaliacoes(supabase, { avaliador: inscrito.email }),
    avaliacaoEncerrada(supabase),
  ]);
  const equipes = exigir(rEquipes, "equipes") ?? [];

  if (fichas === null) {
    return (
      <Pagina>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Avaliação</h1>
        <p className="card text-sm text-suave">
          O módulo de avaliação ainda não está ativo: rode <code>supabase/008_avaliacao.sql</code> no Supabase.
        </p>
      </Pagina>
    );
  }

  const ficha = (equipeId: string, rubrica: string) =>
    fichas.find((f) => f.equipe_id === equipeId && f.rubrica === rubrica);
  // Notas que o avaliador logado deu (uma por fase avaliada) e a média delas.
  const minhasNotas = (equipeId: string) =>
    minhas.flatMap((r) => {
      const f = ficha(equipeId, r.id);
      return f ? [notaFicha(r, f.notas ?? {})] : [];
    });
  const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const todasMinhas = equipes.flatMap((e) => minhasNotas(e.id));
  const totalFichas = equipes.length * minhas.length;
  const completas = equipes.reduce(
    (s, e) =>
      s +
      minhas.filter((r) => {
        const f = ficha(e.id, r.id);
        return f && r.criterios.every((c) => typeof f.notas?.[c.id] === "number");
      }).length,
    0,
  );

  return (
    <Pagina>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
            {banca ? BANCAS[banca] : ""}{organizador ? " · pode lançar qualquer rubrica" : ""}
          </p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            Avaliar <span className="grad-text">equipes</span>
          </h1>
          <p className="text-sm text-suave">
            Suas rubricas: {minhas.map((r) => `${r.curto} (${r.pesoFinal}%)`).join(" · ")}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="card p-4! text-right">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
              {completas}/{totalFichas}
            </p>
            <p className="text-xs text-suave">fichas completas</p>
          </div>
          <div className="card p-4! text-right">
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
              <span className="grad-text">{fmtNota(media(todasMinhas))}</span>
            </p>
            <p className="text-xs text-suave">sua média geral ({todasMinhas.length} fichas)</p>
          </div>
        </div>
      </div>

      {encerrada && (
        <p className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-sm">
          A avaliação foi encerrada pela organização: as fichas estão só para consulta
          {organizador ? " (você, como organização, ainda pode editar)." : "."}
        </p>
      )}

      {equipes.length === 0 ? (
        <p className="card text-sm text-suave">Nenhuma equipe cadastrada ainda.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          {equipes.map((e, i) => (
            <li
              key={e.id}
              className="card faixa-topo min-w-0 space-y-3"
              style={{ animation: "dh-carta .7s cubic-bezier(.2,.8,.2,1) both", animationDelay: `${i * 45}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">{e.nome}</h2>
                  <p className="truncate text-xs text-suave">
                    {e.membros.length} integrantes · {e.links.length} link(s) de entrega
                    {e.repo_github ? "" : " · sem repositório"}
                  </p>
                </div>
                <Link href={`/avaliar/${e.id}`} className="btn-primario min-h-9 shrink-0 px-4 text-xs">
                  Avaliar
                </Link>
              </div>
              {minhasNotas(e.id).length > 0 && (
                <p className="text-sm">
                  Sua média neste grupo:{" "}
                  <strong className="font-mono tabular-nums">{fmtNota(media(minhasNotas(e.id)))}</strong>
                  <span className="text-xs text-suave">
                    {" "}
                    ({minhasNotas(e.id).length} fase{minhasNotas(e.id).length > 1 ? "s" : ""} avaliada
                    {minhasNotas(e.id).length > 1 ? "s" : ""})
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {minhas.map((r) => {
                  const f = ficha(e.id, r.id);
                  const feitos = f ? r.criterios.filter((c) => typeof f.notas?.[c.id] === "number").length : 0;
                  const ok = feitos === r.criterios.length;
                  return (
                    <Link
                      key={r.id}
                      href={`/avaliar/${e.id}?r=${r.id}`}
                      className={`selo ${
                        ok
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          : feitos
                            ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                            : "bg-marca-fundo text-suave"
                      }`}
                      title={r.nome}
                    >
                      {r.curto}: {ok ? `✔ ${fmtNota(notaFicha(r, f!.notas))}` : `${feitos}/${r.criterios.length}`}
                    </Link>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Pagina>
  );
}
