"use client";

import { useEffect, useRef, useState } from "react";

export type LinhaRanking = {
  id: string;
  nome: string;
  final: number;
  completa: boolean;
  penalidades: number;
  integrantes: string[];
  fases: { id: string; nota: number | null }[];
};

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toFixed(1).replace(".", ","));
const MEDALHA = ["🥇", "🥈", "🥉"];

/**
 * Ranking final com pódio. "Modo revelação" esconde tudo e revela uma posição por clique,
 * do último para o 1º (para a premiação no telão).
 */
export function Podio({ linhas, encerrada }: { linhas: LinhaRanking[]; encerrada: boolean }) {
  const total = linhas.length;
  // revelados = quantas posições, contando do fim, já estão visíveis. total = tudo visível.
  const [revelados, setRevelados] = useState(total);
  const [telao, setTelao] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const revelacao = revelados < total;
  const visivel = (pos: number) => pos > total - revelados; // pos começa em 1

  // Sai do "modo telão" também quando a pessoa aperta Esc.
  useEffect(() => {
    const aoMudar = () => setTelao(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  function alternarTelao() {
    const el = area.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }

  const podio = linhas.slice(0, 3);
  const resto = linhas.slice(3);
  // ordem visual do pódio: 2º, 1º, 3º
  const ordem = [podio[1], podio[0], podio[2]].map((l, i) => ({ l, pos: [2, 1, 3][i] })).filter((x) => x.l);

  return (
    <div
      ref={area}
      className={`space-y-6 ${telao ? "overflow-y-auto bg-background p-6 sm:p-10" : ""}`}
    >
      {/* ------------------------------------------------ controles */}
      <div className="flex flex-wrap items-center gap-2">
        {!encerrada && (
          <span className="selo mr-auto bg-amber-500/15 text-amber-800 dark:text-amber-300">
            Avaliação em andamento: ranking parcial
          </span>
        )}
        <div className={`flex flex-wrap gap-2 ${encerrada ? "ml-auto" : ""}`}>
          {revelacao ? (
            <>
              <button type="button" onClick={() => setRevelados((r) => Math.min(total, r + 1))} className="btn-primario">
                Revelar {total - revelados}º lugar
              </button>
              <button type="button" onClick={() => setRevelados(total)} className="btn-secundario">
                Mostrar tudo
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setRevelados(0)} className="btn-secundario" disabled={!total}>
              🎬 Modo revelação
            </button>
          )}
          <button type="button" onClick={alternarTelao} className="btn-secundario">
            {telao ? "Sair do telão" : "📺 Modo telão"}
          </button>
        </div>
      </div>

      {total === 0 ? (
        <p className="card text-sm text-suave">Nenhuma equipe avaliada ainda.</p>
      ) : (
        <>
          {/* ------------------------------------------------ pódio */}
          <section className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Pódio">
            {ordem.map(({ l, pos }) => {
              const mostra = visivel(pos);
              const altura = pos === 1 ? "h-40 sm:h-56" : pos === 2 ? "h-28 sm:h-40" : "h-20 sm:h-28";
              return (
                <div key={pos} className="flex min-w-0 flex-col items-center gap-2">
                  {/* card do time em cima do degrau */}
                  <div
                    className={`w-full min-w-0 text-center ${mostra ? "" : "opacity-0"}`}
                    style={mostra ? { animation: "dh-carta .8s cubic-bezier(.2,.8,.2,1) both" } : undefined}
                  >
                    <p className={pos === 1 ? "text-4xl sm:text-6xl" : "text-3xl sm:text-5xl"}>{MEDALHA[pos - 1]}</p>
                    <p
                      className={`truncate font-[family-name:var(--font-display)] font-extrabold ${
                        pos === 1 ? "text-lg sm:text-3xl" : "text-sm sm:text-xl"
                      }`}
                      title={l.nome}
                    >
                      {l.nome}
                    </p>
                    <p className={`font-mono font-bold tabular-nums ${pos === 1 ? "text-2xl sm:text-4xl" : "text-lg sm:text-2xl"}`}>
                      <span className="grad-text">{fmt(l.final)}</span>
                    </p>
                    <p className="hidden truncate text-xs text-suave sm:block" title={l.integrantes.join(", ")}>
                      {l.integrantes.join(" · ")}
                    </p>
                  </div>
                  {/* degrau */}
                  <div
                    className={`relative flex w-full items-start justify-center overflow-hidden rounded-t-2xl ${altura} ${
                      pos === 1 ? "destaque-grad" : "border border-borda-forte bg-superficie"
                    }`}
                    style={{ animation: `dh-sobe .7s ${pos === 1 ? ".3s" : pos === 2 ? ".15s" : "0s"} both` }}
                  >
                    <span
                      className={`mt-3 font-[family-name:var(--font-display)] font-extrabold ${
                        pos === 1 ? "text-5xl sm:text-7xl" : "text-4xl sm:text-5xl"
                      }`}
                    >
                      <span className="grad-text">{pos}º</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          {/* ------------------------------------------------ demais posições */}
          {resto.length > 0 && (
            <ol className="space-y-2">
              {resto.map((l, i) => {
                const pos = i + 4;
                const mostra = visivel(pos);
                return (
                  <li
                    key={l.id}
                    className={`card faixa-topo flex min-w-0 flex-wrap items-center gap-3 p-3! sm:p-4! ${mostra ? "" : "opacity-30 blur-sm"}`}
                    style={mostra ? { animation: "dh-carta .6s cubic-bezier(.2,.8,.2,1) both" } : undefined}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--azul)] font-[family-name:var(--font-display)] text-sm font-bold text-white">
                      {pos}º
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{mostra ? l.nome : "••••••"}</p>
                      <p className="truncate text-xs text-suave">
                        {mostra
                          ? l.fases.map((f) => `${f.id === "NEG" ? "Negócio" : f.id} ${fmt(f.nota)}`).join(" · ") +
                            (l.penalidades ? ` · penalidades ${l.penalidades}` : "")
                          : "aguardando revelação"}
                      </p>
                    </div>
                    <p className="text-right">
                      <span className="font-mono text-2xl font-bold tabular-nums">
                        <span className="grad-text">{mostra ? fmt(l.final) : "—"}</span>
                      </span>
                      {mostra && !l.completa && <span className="block text-[11px] text-amber-700 dark:text-amber-300">parcial</span>}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
