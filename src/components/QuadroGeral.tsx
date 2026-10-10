"use client";

import Link from "next/link";
import { useRef, useState } from "react";

// Dados já calculados no servidor (ver app/admin/avaliacao/page.tsx).
export type FichaResumo = { avaliador: string; nota: number; niveis: Record<string, string> };
/** Uma rubrica (parte de uma fase): ex.: F1 · Pitch (professores) ou F1 · Mesa (organizadores). */
export type ParteResumo = {
  id: string;
  curto: string;
  nome: string;
  bancaTexto: string;
  peso: number;
  media: number | null;
  pontos: number | null;
  completa: boolean;
  criterios: { id: string; nome: string; peso: number; media: number | null }[];
  fichas: FichaResumo[];
};
export type FaseResumo = {
  id: string;
  nome: string;
  peso: number;
  /** nota da fase 0–100 (junta pitch e mesa pelos pesos). */
  nota: number | null;
  pontos: number;
  completa: boolean;
  partes: ParteResumo[];
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
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Quadro geral da avaliação (só organização): lista dos grupos com a nota de cada fase
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
              Nota de cada fase (fases 1 e 2 = pitch + mesa) e nota final. Clique num grupo para ver como cada avaliador
              avaliou.
            </span>
          </span>
          <span className="btn-secundario min-h-9 shrink-0 px-3 text-xs">
            <span className="group-open:hidden">Mostrar ▾</span>
            <span className="hidden group-open:inline">Esconder ▴</span>
          </span>
        </summary>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs text-suave">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">Grupo</th>
                {fases.map((f) => (
                  <th key={f.id} className="py-2 pr-2 text-right font-semibold" title={f.nome}>
                    {f.id === "NEG" ? "Negócio" : f.id}
                    <span className="block font-normal">{f.peso}%</span>
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
                      {fmt(f.nota)}
                      <span className="block text-[11px] text-suave">
                        {f.partes.length > 1
                          ? f.partes.map((p) => `${p.curto.split(" · ")[1]} ${fmt(p.media, 0)}`).join(" · ")
                          : `${f.partes[0]?.fichas.length ?? 0} aval.`}
                      </span>
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
        className="m-auto max-h-[92dvh] w-[min(96vw,68rem)] overflow-y-auto bg-transparent p-0 text-foreground backdrop:bg-[#000b38]/70 backdrop:backdrop-blur-sm open:animate-[dh-sobe_.25s_both]"
      >
        {aberta && <Dashboard e={aberta} fechar={() => modal.current?.close()} />}
      </dialog>
    </>
  );
}

function Dashboard({ e, fechar }: { e: EquipeResumoNota; fechar: () => void }) {
  const partes = e.fases.flatMap((f) => f.partes);
  const bruta = e.fases.reduce((s, f) => s + f.pontos, 0);
  const pen = e.penalidades.reduce((s, p) => s + p.pontos, 0);
  const avaliadores = [...new Set(partes.flatMap((p) => p.fichas.map((x) => x.avaliador)))];

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
          <section key={f.id} className="min-w-0 space-y-4 rounded-2xl border border-borda bg-superficie p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold">
                  {f.id === "NEG" ? "Negócio" : f.id} · {f.peso}%
                </h3>
                <p className="truncate text-xs text-suave" title={f.nome}>
                  {f.nome}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xl font-bold tabular-nums">{fmt(f.nota)}</p>
                <p className="text-[11px] text-suave">nota da fase · {fmt(f.pontos)} pts</p>
              </div>
            </div>

            {f.partes.map((p) => (
              <div key={p.id} className="space-y-2 rounded-xl border border-borda p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {p.curto} <span className="font-normal text-suave">· {p.peso}%</span>
                    </p>
                    <p className="truncate text-[11px] text-suave">{p.bancaTexto}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono font-bold tabular-nums">{fmt(p.media)}</p>
                    <p className="text-[11px] text-suave">média dos avaliadores</p>
                  </div>
                </div>

                {p.fichas.length === 0 ? (
                  <p className="text-sm text-suave">
                    Ninguém avaliou.{" "}
                    <Link href={`/avaliar/${e.id}?r=${p.id}`} className="text-marca underline">
                      Avaliar agora
                    </Link>
                  </p>
                ) : (
                  <>
                    {/* nota de cada avaliador, em barras, com a linha da média */}
                    <ul className="space-y-2">
                      {p.fichas.map((x, k) => (
                        <li key={`${x.avaliador}-${k}`} className="space-y-1">
                          <div className="flex justify-between gap-2 text-sm">
                            <span className="truncate">{x.avaliador}</span>
                            <span className="font-mono font-semibold tabular-nums">{fmt(x.nota)}</span>
                          </div>
                          <div className="relative h-2 rounded-full bg-borda">
                            <span
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{ width: `${x.nota}%`, background: "var(--grad)" }}
                            />
                            {p.media !== null && (
                              <span
                                className="absolute -inset-y-1 w-0.5 rounded bg-[var(--magenta)]"
                                style={{ left: `${p.media}%` }}
                                title={`média ${fmt(p.media)}`}
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
                              {p.fichas.map((x, k) => (
                                <th key={`${x.avaliador}-${k}`} className="py-1 pr-2 font-semibold">
                                  {x.avaliador.split(" ")[0]}
                                </th>
                              ))}
                              <th className="py-1 font-semibold">Média</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.criterios.map((c) => (
                              <tr key={c.id} className="border-t border-borda">
                                <td className="py-1 pr-2">
                                  {c.nome} <span className="text-suave">({c.peso})</span>
                                </td>
                                {p.fichas.map((x, k) => (
                                  <td key={`${x.avaliador}-${k}`} className="py-1 pr-2">
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
                    {!p.completa && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">Algum critério ainda sem nota.</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>

      {/* resumo por avaliador: nota em cada rubrica que avaliou e a média dele */}
      {avaliadores.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-borda bg-superficie p-4">
          <h3 className="font-bold">Resumo por avaliador</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-xs text-suave">
                  <th className="py-1 pr-2 font-semibold">Avaliador</th>
                  {partes.map((p) => (
                    <th key={p.id} className="py-1 pr-2 text-right font-semibold">
                      {p.curto}
                    </th>
                  ))}
                  <th className="py-1 text-right font-semibold">Média dele</th>
                </tr>
              </thead>
              <tbody>
                {avaliadores.map((a) => {
                  const notas = partes.map((p) => p.fichas.find((x) => x.avaliador === a)?.nota ?? null);
                  const dadas = notas.filter((n): n is number => n !== null);
                  return (
                    <tr key={a} className="border-t border-borda">
                      <td className="max-w-40 truncate py-1 pr-2">{a}</td>
                      {notas.map((n, k) => (
                        <td key={k} className="py-1 pr-2 text-right font-mono tabular-nums">
                          {fmt(n)}
                        </td>
                      ))}
                      <td className="py-1 text-right font-mono font-semibold tabular-nums">
                        {fmt(media(dadas))}
                        <span className="block text-[11px] font-normal text-suave">
                          {dadas.length} rubrica{dadas.length > 1 ? "s" : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-borda font-semibold">
                  <td className="py-1 pr-2">Média dos avaliadores</td>
                  {partes.map((p) => (
                    <td key={p.id} className="py-1 pr-2 text-right font-mono tabular-nums">
                      {fmt(p.media)}
                    </td>
                  ))}
                  <td className="py-1 text-right text-xs font-normal text-suave">nota final abaixo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-suave">
            “Média dele” = média simples das notas que o avaliador deu nas rubricas em que participou (para comparar
            avaliadores). A nota final do grupo usa a média de cada rubrica com os pesos do regulamento.
          </p>
        </section>
      )}

      {/* cálculo da nota final */}
      <section className="space-y-2 rounded-2xl border border-borda bg-superficie p-4">
        <h3 className="font-bold">Cálculo da nota final</h3>
        <ul className="space-y-1 font-mono text-sm tabular-nums">
          {partes.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2">
              <span className="text-suave">
                {p.curto}: {p.peso}% × {fmt(p.media)}
              </span>
              <span>= {fmt(p.pontos ?? 0)}</span>
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
          Em cada rubrica, a média é calculada critério por critério entre os avaliadores (regra do regulamento). Fases 1
          e 2: pitch (professores) + mesa (organizadores).
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
