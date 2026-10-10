"use client";

import Link from "next/link";
import { useRef, useState } from "react";

// Dados já calculados no servidor (ver app/admin/avaliacao/page.tsx).
export type FichaResumo = { avaliador: string; nota: number; niveis: Record<string, string> };
export type FaseResumo = {
  id: string;
  nome: string;
  peso: number;
  media: number | null;
  pontos: number | null;
  completa: boolean;
  criterios: { id: string; nome: string; peso: number; media: number | null }[];
  fichas: FichaResumo[];
};
export type EquipeResumoNota = {
  id: string;
  nome: string;
  posicao: number;
  final: number;
  completa: boolean;
  penalidades: { texto: string; pontos: number }[];
  fases: FaseResumo[];
};

const fmt = (v: number | null | undefined, casas = 1) =>
  v === null || v === undefined ? "—" : v.toFixed(casas).replace(".", ",");

/**
 * Quadro geral da avaliação (só organização): lista dos grupos com a média de cada fase
 * e a nota final. Clicar num grupo abre o dashboard com a nota de cada avaliador.
 */
export function QuadroGeral({ equipes }: { equipes: EquipeResumoNota[] }) {
  const [aberta, setAberta] = useState<EquipeResumoNota | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const fases = equipes[0]?.fases ?? [];

  function abrir(e: EquipeResumoNota) {
    setAberta(e);
    modal.current?.showModal();
  }

  return (
    <>
      <details open className="card group space-y-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 select-none">
          <span>
            <span className="text-lg font-semibold">Quadro geral · nota final</span>
            <span className="block text-sm text-suave">
              Média dos avaliadores em cada fase e nota final. Clique num grupo para ver como cada avaliador avaliou.
            </span>
          </span>
          <span className="btn-secundario min-h-9 shrink-0 px-3 text-xs">
            <span className="group-open:hidden">Mostrar ▾</span>
            <span className="hidden group-open:inline">Esconder ▴</span>
          </span>
        </summary>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-suave">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">Grupo</th>
                {fases.map((f) => (
                  <th key={f.id} className="py-2 pr-2 text-right font-semibold" title={f.nome}>
                    {f.id.replace("_", " ")}
                    <span className="block font-normal">média · {f.peso}%</span>
                  </th>
                ))}
                <th className="py-2 pr-2 text-right font-semibold">Penal.</th>
                <th className="py-2 text-right font-semibold">Nota final</th>
              </tr>
            </thead>
            <tbody>
              {equipes.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => abrir(e)}
                  className="cursor-pointer border-t border-borda transition hover:bg-marca-fundo"
                  title="Ver como cada avaliador avaliou"
                >
                  <td className="py-2 pr-2 font-mono text-suave">{e.posicao}º</td>
                  <td className="max-w-48 truncate py-2 pr-2 font-semibold">
                    <button type="button" className="text-left hover:text-marca hover:underline">
                      {e.nome}
                    </button>
                  </td>
                  {e.fases.map((f) => (
                    <td key={f.id} className="py-2 pr-2 text-right font-mono tabular-nums">
                      {fmt(f.media)}
                      <span className="block text-[11px] text-suave">{f.fichas.length} aval.</span>
                    </td>
                  ))}
                  <td className="py-2 pr-2 text-right font-mono tabular-nums text-red-600 dark:text-red-300">
                    {e.penalidades.length ? e.penalidades.reduce((s, p) => s + p.pontos, 0) : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <span className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums">
                      <span className="grad-text">{fmt(e.final)}</span>
                    </span>
                    {!e.completa && <span className="block text-[11px] text-amber-700 dark:text-amber-300">parcial</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* ------------------------------------------------ dashboard do grupo */}
      <dialog
        ref={modal}
        onClick={(ev) => ev.target === ev.currentTarget && ev.currentTarget.close()}
        onClose={() => setAberta(null)}
        className="m-auto max-h-[92dvh] w-[min(96vw,64rem)] overflow-y-auto bg-transparent p-0 text-foreground backdrop:bg-[#000b38]/70 backdrop:backdrop-blur-sm open:animate-[dh-sobe_.25s_both]"
      >
        {aberta && <Dashboard e={aberta} fechar={() => modal.current?.close()} />}
      </dialog>
    </>
  );
}

function Dashboard({ e, fechar }: { e: EquipeResumoNota; fechar: () => void }) {
  const bruta = e.fases.reduce((s, f) => s + (f.pontos ?? 0), 0);
  const pen = e.penalidades.reduce((s, p) => s + p.pontos, 0);
  const avaliadores = [...new Set(e.fases.flatMap((f) => f.fichas.map((x) => x.avaliador)))];

  return (
    <div className="destaque-grad faixa-topo space-y-5 rounded-2xl p-4 sm:p-6">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto min-w-0">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
            {e.posicao}º lugar · {avaliadores.length} avaliador(es)
          </p>
          <h2 className="text-2xl font-extrabold break-words sm:text-3xl">
            <span className="grad-text">{e.nome}</span>
          </h2>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums">
            <span className="grad-text">{fmt(e.final)}</span>
          </p>
          <p className="text-xs text-suave">nota final{e.completa ? "" : " (parcial)"}</p>
        </div>
        <button type="button" onClick={fechar} className="btn-secundario size-9 min-h-9 p-0" aria-label="Fechar">
          ✕
        </button>
      </div>

      {/* fases */}
      <div className="grid gap-3 lg:grid-cols-2">
        {e.fases.map((f) => (
          <section key={f.id} className="min-w-0 space-y-3 rounded-2xl border border-borda bg-superficie p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold">{f.id.replace("_", " ")} · {f.peso}%</h3>
                <p className="truncate text-xs text-suave" title={f.nome}>
                  {f.nome}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xl font-bold tabular-nums">{fmt(f.media)}</p>
                <p className="text-[11px] text-suave">média dos avaliadores</p>
              </div>
            </div>

            {f.fichas.length === 0 ? (
              <p className="text-sm text-suave">
                Ninguém avaliou esta fase.{" "}
                <Link href={`/avaliar/${e.id}?r=${f.id}`} className="text-marca underline">
                  Avaliar agora
                </Link>
              </p>
            ) : (
              <>
                {/* nota de cada avaliador, em barras, com a linha da média */}
                <ul className="space-y-2">
                  {f.fichas.map((x) => (
                    <li key={x.avaliador} className="space-y-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate">{x.avaliador}</span>
                        <span className="font-mono font-semibold tabular-nums">{fmt(x.nota)}</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-borda">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${x.nota}%`, background: "var(--grad)" }}
                        />
                        {f.media !== null && (
                          <span
                            className="absolute -inset-y-1 w-0.5 rounded bg-[var(--magenta)]"
                            style={{ left: `${f.media}%` }}
                            title={`média ${fmt(f.media)}`}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* critério × avaliador */}
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-marca select-none">
                    Ver critério por critério
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-xs">
                      <thead>
                        <tr className="text-left text-suave">
                          <th className="py-1 pr-2 font-semibold">Critério (peso)</th>
                          {f.fichas.map((x) => (
                            <th key={x.avaliador} className="py-1 pr-2 font-semibold">
                              {x.avaliador.split(" ")[0]}
                            </th>
                          ))}
                          <th className="py-1 font-semibold">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.criterios.map((c) => (
                          <tr key={c.id} className="border-t border-borda">
                            <td className="py-1 pr-2">
                              {c.nome} <span className="text-suave">({c.peso})</span>
                            </td>
                            {f.fichas.map((x) => (
                              <td key={x.avaliador} className="py-1 pr-2">
                                {x.niveis[c.id] ?? "–"}
                              </td>
                            ))}
                            <td className="py-1 font-mono">
                              {c.media === null ? "–" : `${Math.round(c.media * 100)}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
            {f.fichas.length > 0 && !f.completa && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300">Algum critério ainda sem nota.</p>
            )}
          </section>
        ))}
      </div>

      {/* cálculo da nota final */}
      <section className="space-y-2 rounded-2xl border border-borda bg-superficie p-4">
        <h3 className="font-bold">Cálculo da nota final</h3>
        <ul className="space-y-1 font-mono text-sm tabular-nums">
          {e.fases.map((f) => (
            <li key={f.id} className="flex flex-wrap justify-between gap-2">
              <span className="text-suave">
                {f.id.replace("_", " ")}: {f.peso}% × {fmt(f.media)}
              </span>
              <span>= {fmt(f.pontos ?? 0)}</span>
            </li>
          ))}
          {e.penalidades.map((p) => (
            <li key={p.texto} className="flex justify-between gap-2 text-red-600 dark:text-red-300">
              <span className="truncate">Penalidade: {p.texto}</span>
              <span>{p.pontos}</span>
            </li>
          ))}
          <li className="flex justify-between gap-2 border-t border-borda pt-1 font-bold">
            <span>Nota final {bruta + pen < 0 ? "(mínimo 0)" : ""}</span>
            <span>
              {fmt(bruta)}
              {pen ? ` ${pen}` : ""} = <span className="grad-text">{fmt(e.final)}</span>
            </span>
          </li>
        </ul>
        <p className="text-xs text-suave">
          Em cada fase, a média é calculada critério por critério entre os avaliadores (regra do regulamento).
        </p>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={`/avaliar/${e.id}`} className="btn-secundario">
          Avaliar este grupo
        </Link>
        <button type="button" onClick={fechar} className="btn-primario">
          Fechar
        </button>
      </div>
    </div>
  );
}
