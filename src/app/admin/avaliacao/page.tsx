import Link from "next/link";
import { alternarPenalidade, excluirAvaliacao, salvarEncerramentoAvaliacao } from "@/app/actions";
import { AjudaCalculo } from "@/components/AjudaCalculo";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { Pagina } from "@/components/Pagina";
import { QuadroGeral, type EquipeResumoNota } from "@/components/QuadroGeral";
import {
  avaliacaoEncerrada,
  carregarAvaliacoes,
  carregarPenalidades,
  exigir,
  SELECT_EQUIPE,
  sessaoAtual,
} from "@/lib/dados";
import { compararRanking, consolidarEquipe, fmtNota, notaFicha } from "@/lib/nota";
import { DESCLASSIFICACAO, DESEMPATE, FASES, FORMULA, NIVEIS, PENALIDADES, RUBRICAS } from "@/lib/rubricas";
import type { Equipe } from "@/lib/tipos";

const nivelDe = (f: number | undefined) => NIVEIS.find((n) => n.fator === f)?.nome ?? "–";

// Aba "Avaliação": consolidação das fichas das bancas, penalidades e ranking final.
export default async function AdminAvaliacao() {
  const { supabase } = await sessaoAtual();
  const [rEquipes, fichas, penalidades, encerrada] = await Promise.all([
    supabase.from("equipes").select(SELECT_EQUIPE).order("nome").returns<Equipe[]>(),
    carregarAvaliacoes(supabase),
    carregarPenalidades(supabase),
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

  const ranking = equipes
    .map((e) => {
      const fe = fichas.filter((f) => f.equipe_id === e.id);
      const pens = penalidades.get(e.id) ?? [];
      return { equipe: e, fichas: fe, pens, r: consolidarEquipe(fe, pens) };
    })
    .sort((a, b) => compararRanking(a.r, b.r));
  const avaliadores = new Set(fichas.map((f) => f.avaliador)).size;

  // Dados prontos para o quadro geral / dashboard (componente do navegador).
  const quadro: EquipeResumoNota[] = ranking.map(({ equipe, fichas: fe, pens, r }, i) => ({
    id: equipe.id,
    nome: equipe.nome,
    posicao: i + 1,
    final: r.final,
    completa: r.completa,
    penalidades: pens.map((id) => {
      const p = PENALIDADES.find((x) => x.id === id);
      return { texto: p?.texto ?? id, pontos: p?.pontos ?? 0 };
    }),
    fases: FASES.map((fa) => ({
      id: fa.id,
      nome: fa.nome,
      peso: fa.peso,
      nota: r.fases[fa.id].nota,
      pontos: r.fases[fa.id].pontos,
      completa: r.fases[fa.id].completa,
      partes: RUBRICAS.filter((rb) => fa.partes.includes(rb.id)).map((rb) => {
        const x = r.rubricas[rb.id];
        return {
          id: rb.id,
          curto: rb.curto,
          nome: rb.nome,
          bancaTexto: rb.bancaTexto,
          peso: rb.pesoFinal,
          media: x.nota,
          pontos: x.nota === null ? null : (rb.pesoFinal * x.nota) / 100,
          completa: x.completa,
          criterios: rb.criterios.map((c) => ({ id: c.id, nome: c.nome, peso: c.peso, media: x.mediaCriterio[c.id] })),
          fichas: fe
            .filter((f) => f.rubrica === rb.id)
            .map((f) => ({
              avaliador: f.quem?.nome ?? f.avaliador,
              nota: notaFicha(rb, f.notas ?? {}),
              niveis: Object.fromEntries(rb.criterios.map((c) => [c.id, nivelDe(f.notas?.[c.id])])),
            })),
        };
      }),
    })),
  }));

  return (
    <Pagina>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            Ranking e <span className="grad-text">avaliação</span>
          </h1>
          <p className="text-sm text-suave">
            {fichas.length} fichas de {avaliadores} avaliador(es). {FORMULA}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AjudaCalculo />
          <Link href="/avaliar" className="btn-primario">
            Lançar notas
          </Link>
          <a href="/admin/avaliacao/exportar" className="btn-secundario">
            Exportar ranking
          </a>
          <a href="/admin/avaliacao/exportar?tipo=fichas" className="btn-secundario">
            Exportar notas por avaliador
          </a>
        </div>
      </div>

      {/* ------------------------------------------------ encerramento */}
      <section className="card flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm">
          {encerrada ? (
            <>
              <strong>Avaliação encerrada.</strong> As bancas só consultam as fichas; a organização ainda edita.
            </>
          ) : (
            <>
              <strong>Avaliação aberta.</strong> As bancas podem lançar e alterar as fichas.
            </>
          )}
        </p>
        <Formulario
          action={salvarEncerramentoAvaliacao}
          rotuloConfirmar={encerrada ? "Reabrir" : "Encerrar avaliação"}
          confirmar={
            encerrada
              ? "Reabrir a avaliação? As bancas voltam a poder alterar as fichas."
              : "Encerrar a avaliação? As bancas não poderão mais alterar as fichas."
          }
        >
          <input type="hidden" name="encerrar" value={encerrada ? "0" : "1"} />
          <BotaoEnviar className={encerrada ? "btn-secundario" : "btn-primario"}>
            {encerrada ? "Reabrir avaliação" : "Encerrar avaliação"}
          </BotaoEnviar>
        </Formulario>
      </section>

      {/* ------------------------------------------------ quadro geral + dashboard por grupo */}
      {quadro.length > 0 && <QuadroGeral equipes={quadro} />}

      {/* ------------------------------------------------ ranking (detalhe por equipe) */}
      {ranking.length === 0 ? (
        <p className="card text-sm text-suave">Nenhuma equipe cadastrada.</p>
      ) : (
        <details className="group space-y-3">
          <summary className="card flex cursor-pointer list-none items-center justify-between gap-2 select-none">
            <span>
              <span className="text-lg font-semibold">Detalhe por grupo</span>
              <span className="block text-sm text-suave">Notas de cada avaliador, penalidades e fichas.</span>
            </span>
            <span className="btn-secundario min-h-9 shrink-0 px-3 text-xs">
              <span className="group-open:hidden">Mostrar ▾</span>
              <span className="hidden group-open:inline">Esconder ▴</span>
            </span>
          </summary>
        <ol className="space-y-3">
          {ranking.map(({ equipe, fichas: fe, pens, r }, i) => (
            <li
              key={equipe.id}
              className={`card min-w-0 space-y-3 ${i === 0 && r.final > 0 ? "destaque-grad" : "faixa-topo"}`}
              style={{ animation: "dh-carta .7s cubic-bezier(.2,.8,.2,1) both", animationDelay: `${i * 45}ms` }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-sm font-bold text-white"
                  style={{ background: i < 3 ? "var(--grad)" : "var(--azul)" }}
                >
                  {i + 1}º
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold">{equipe.nome}</h2>
                  <p className="text-xs text-suave">
                    {r.completa ? "todas as rubricas completas" : "avaliação incompleta"}
                    {r.penalidades ? ` · penalidades ${r.penalidades}` : ""}
                  </p>
                </div>
                <Link href={`/avaliar/${equipe.id}`} className="btn-primario min-h-9 px-3 text-xs">
                  Avaliar
                </Link>
                <p className="text-right">
                  <span className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums">
                    <span className="grad-text">{fmtNota(r.final)}</span>
                  </span>
                  <span className="block text-xs text-suave">nota final</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {RUBRICAS.map((rb) => {
                  const x = r.rubricas[rb.id];
                  const daRubrica = fe.filter((f) => f.rubrica === rb.id);
                  return (
                    <div key={rb.id} className="min-w-0 rounded-xl border border-borda bg-marca-fundo/40 p-2">
                      <p className="truncate text-[11px] text-suave" title={rb.nome}>
                        {rb.curto} · {rb.pesoFinal}%
                      </p>
                      <p className="font-mono text-lg font-semibold tabular-nums" title="média dos avaliadores">
                        {fmtNota(x.nota)}
                        {x.avaliadores > 1 && <span className="ml-1 text-[11px] font-normal text-suave">média</span>}
                      </p>
                      {/* quanto cada avaliador deu nesta etapa */}
                      {daRubrica.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-[11px] text-suave">
                          {daRubrica.map((f) => (
                            <li key={f.id} className="flex justify-between gap-2">
                              <span className="truncate">{(f.quem?.nome ?? f.avaliador).split(" ")[0]}</span>
                              <span className="font-mono tabular-nums">{fmtNota(notaFicha(rb, f.notas ?? {}))}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Link href={`/avaliar/${equipe.id}?r=${rb.id}`} className="text-[11px] text-marca underline">
                          Lançar notas →
                        </Link>
                      )}
                      {x.avaliadores > 0 && !x.completa && <p className="text-[11px] text-amber-700 dark:text-amber-300">incompleta</p>}
                    </div>
                  );
                })}
              </div>

              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-marca select-none">
                  Penalidades e fichas ({fe.length})
                </summary>
                <div className="mt-3 space-y-4">
                  {/* penalidades */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Penalidades</h3>
                    <div className="flex flex-wrap gap-2">
                      {PENALIDADES.map((p) => {
                        const ativa = pens.includes(p.id);
                        return (
                          <Formulario key={`${equipe.id}-${p.id}-${ativa}`} action={alternarPenalidade}>
                            <input type="hidden" name="equipe_id" value={equipe.id} />
                            <input type="hidden" name="penalidade" value={p.id} />
                            <input type="hidden" name="aplicar" value={ativa ? "0" : "1"} />
                            <BotaoEnviar
                              className={`btn min-h-9 px-3 text-left text-xs ${
                                ativa
                                  ? "border border-red-400/60 bg-red-500/15 text-red-700 dark:text-red-300"
                                  : "btn-secundario"
                              }`}
                              title={p.texto}
                            >
                              {ativa ? "✔ " : ""}
                              {p.pontos} · {p.texto}
                            </BotaoEnviar>
                          </Formulario>
                        );
                      })}
                    </div>
                  </div>

                  {/* fichas por rubrica */}
                  {RUBRICAS.map((rb) => {
                    const daRubrica = fe.filter((f) => f.rubrica === rb.id);
                    const x = r.rubricas[rb.id];
                    return (
                      <div key={rb.id} className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          {rb.nome} <span className="font-normal text-suave">· média {fmtNota(x.nota)}</span>
                        </h3>
                        {daRubrica.length === 0 ? (
                          <p className="text-xs text-suave">
                            Sem fichas.{" "}
                            <Link href={`/avaliar/${equipe.id}?r=${rb.id}`} className="text-marca underline">
                              Abrir a ficha desta fase ({rb.criterios.length} critérios)
                            </Link>
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[520px] text-xs">
                              <thead>
                                <tr className="text-left text-suave">
                                  <th className="py-1 pr-2 font-semibold">Critério (peso)</th>
                                  {daRubrica.map((f) => (
                                    <th key={f.id} className="py-1 pr-2 font-semibold">
                                      {f.quem?.nome ?? f.avaliador}
                                    </th>
                                  ))}
                                  <th className="py-1 font-semibold">Média</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rb.criterios.map((c) => (
                                  <tr key={c.id} className="border-t border-borda">
                                    <td className="py-1 pr-2">
                                      {c.nome} <span className="text-suave">({c.peso})</span>
                                    </td>
                                    {daRubrica.map((f) => (
                                      <td key={f.id} className="py-1 pr-2">
                                        {nivelDe(f.notas?.[c.id])}
                                      </td>
                                    ))}
                                    <td className="py-1 font-mono">
                                      {x.mediaCriterio[c.id] === null
                                        ? "–"
                                        : `${Math.round((x.mediaCriterio[c.id] ?? 0) * 100)}%`}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="border-t border-borda font-semibold">
                                  <td className="py-1 pr-2">Nota da ficha</td>
                                  {daRubrica.map((f) => (
                                    <td key={f.id} className="py-1 pr-2 font-mono">
                                      {fmtNota(notaFicha(rb, f.notas ?? {}))}
                                    </td>
                                  ))}
                                  <td className="py-1 font-mono">{fmtNota(x.nota)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                        {daRubrica.map((f) => (
                              <div key={`c-${f.id}`} className="flex flex-wrap items-start gap-2 text-xs">
                                <p className="min-w-0 flex-1 text-suave [overflow-wrap:anywhere]">
                                  <strong className="text-foreground">{f.quem?.nome ?? f.avaliador}:</strong>{" "}
                                  {f.comentario ? `“${f.comentario}”` : "sem comentário"}
                                </p>
                                <Formulario
                                  action={excluirAvaliacao}
                                  rotuloConfirmar="Apagar ficha"
                                  confirmar={`Apagar a ficha de ${f.quem?.nome ?? f.avaliador} (${rb.id}) para a ${equipe.nome}?`}
                                >
                                  <input type="hidden" name="id" value={f.id} />
                                  <BotaoEnviar className="btn-perigo min-h-7 px-2 text-[11px]">Apagar ficha</BotaoEnviar>
                                </Formulario>
                              </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </details>
            </li>
          ))}
        </ol>
        </details>
      )}

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Regras</h2>
        <p className="text-suave">
          Cada rubrica vale 0–100 (soma de peso do critério × fator do nível). Com mais de um avaliador na mesma rubrica,
          usa-se a média por critério. Nota final mínima 0.
        </p>
        <p className="text-suave">
          <strong className="text-foreground">Desempate:</strong> {DESEMPATE.join(" → ")}
        </p>
        <p className="text-suave">
          <strong className="text-foreground">Desclassificação:</strong> {DESCLASSIFICACAO}
        </p>
      </section>
    </Pagina>
  );
}
