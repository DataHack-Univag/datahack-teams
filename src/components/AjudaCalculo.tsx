"use client";

import { useRef } from "react";
import {
  BANCAS,
  DESCLASSIFICACAO,
  DESEMPATE,
  DIVISAO_FASES_1_2,
  FASES,
  FORMULA,
  NIVEIS,
  PENALIDADES,
  RUBRICAS,
} from "@/lib/rubricas";

const pct = (f: number) => `${Math.round(f * 100)}%`;
const fmt = (v: number) => v.toFixed(1).replace(".", ",");

/**
 * Botão "Como a nota é calculada?" com a regra completa (cronograma_rubrica_v2.html),
 * gerada das próprias rubricas do sistema (src/lib/rubricas.ts) para nunca ficar desatualizada.
 */
export function AjudaCalculo({ className = "btn-secundario" }: { className?: string }) {
  const modal = useRef<HTMLDialogElement>(null);
  const f1Pitch = RUBRICAS.find((r) => r.id === "F1_PITCH");
  const f1Mesa = RUBRICAS.find((r) => r.id === "F1_MESA");

  return (
    <>
      <button type="button" onClick={() => modal.current?.showModal()} className={className}>
        ❓ Como a nota é calculada?
      </button>

      <dialog
        ref={modal}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto max-h-[92dvh] w-[min(96vw,56rem)] overflow-y-auto bg-transparent p-0 text-foreground backdrop:bg-[#000b38]/70 backdrop:backdrop-blur-sm open:animate-[dh-sobe_.25s_both]"
      >
        <div className="destaque-grad faixa-topo space-y-5 rounded-2xl p-4 text-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mr-auto">
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
                Regulamento · cronograma_rubrica_v2
              </p>
              <h2 className="text-2xl font-extrabold">
                Como a nota é <span className="grad-text">calculada</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => modal.current?.close()}
              className="btn-secundario size-9 min-h-9 p-0"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          {/* 1. níveis */}
          <section className="space-y-2">
            <h3 className="text-base font-bold">1. Cada critério recebe um nível</h3>
            <p className="text-suave">O avaliador marca um nível por critério. Cada nível vale uma fração do peso do critério:</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NIVEIS.map((n) => (
                <div key={n.nome} className="rounded-xl border border-borda bg-superficie p-2 text-center">
                  <p className="font-semibold">{n.nome}</p>
                  <p className="font-mono text-lg">{pct(n.fator)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. nota da ficha */}
          <section className="space-y-2">
            <h3 className="text-base font-bold">2. Nota de uma ficha (0 a 100)</h3>
            <p className="rounded-xl border border-borda bg-superficie p-3 font-mono">
              nota da ficha = Σ (peso do critério × fator do nível)
            </p>
            <p className="text-suave">
              Os pesos dos critérios de cada rubrica somam 100. Critério ainda sem nível conta 0 (a ficha aparece como
              incompleta).
            </p>
            {f1Pitch && (
              <p className="text-suave">
                Exemplo ({f1Pitch.curto}): {f1Pitch.criterios.map((c) => `${c.nome} (${c.peso})`).join(", ")}. Se todos
                forem Proficiente: {f1Pitch.criterios.map((c) => `${c.peso}×0,8`).join(" + ")} ={" "}
                <strong className="text-foreground">80</strong>.
              </p>
            )}
          </section>

          {/* 3. vários avaliadores */}
          <section className="space-y-2">
            <h3 className="text-base font-bold">3. Vários avaliadores na mesma rubrica: média por critério</h3>
            <p className="text-suave">
              Cada avaliador preenche a própria ficha. Para a equipe, a nota da rubrica usa a{" "}
              <strong className="text-foreground">média por critério</strong> entre os avaliadores que avaliaram:
            </p>
            <p className="rounded-xl border border-borda bg-superficie p-3 font-mono">
              nota da rubrica = Σ (peso do critério × média dos fatores dos avaliadores)
            </p>
            <p className="text-suave">
              Com as fichas completas, isso é igual à média das notas dos avaliadores. Ex.: avaliador A deu 80 e B deu
              70 → nota da rubrica = 75.
            </p>
          </section>

          {/* 4. rubricas e bancas */}
          <section className="space-y-2">
            <h3 className="text-base font-bold">4. As rubricas, quem avalia e o peso de cada uma</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="text-left text-xs text-suave">
                    <th className="py-1 pr-2 font-semibold">Fase</th>
                    <th className="py-1 pr-2 font-semibold">Rubrica</th>
                    <th className="py-1 pr-2 font-semibold">Quem avalia</th>
                    <th className="py-1 pr-2 text-right font-semibold">Peso na nota final</th>
                  </tr>
                </thead>
                <tbody>
                  {FASES.map((f) =>
                    RUBRICAS.filter((r) => f.partes.includes(r.id)).map((r, k) => (
                      <tr key={r.id} className="border-t border-borda">
                        <td className="py-1 pr-2">{k === 0 ? `${f.id === "NEG" ? "Negócio" : f.id} (${f.peso}%)` : ""}</td>
                        <td className="py-1 pr-2">{r.nome}</td>
                        <td className="py-1 pr-2 text-suave">{BANCAS[r.banca]}</td>
                        <td className="py-1 pr-2 text-right font-mono">{r.pesoFinal}%</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            {DIVISAO_FASES_1_2 && (
              <p className="text-suave">
                Fases 1 e 2 têm duas avaliações: <strong className="text-foreground">pitch</strong> (banca de professores,
                visão macro) e <strong className="text-foreground">mesa</strong> (organizadores, visão técnica). Dentro da
                fase: pitch {DIVISAO_FASES_1_2.pitch}% · mesa {DIVISAO_FASES_1_2.mesa}%.
              </p>
            )}
          </section>

          {/* 5. nota da fase */}
          <section className="space-y-2">
            <h3 className="text-base font-bold">5. Nota de uma fase (só para acompanhar)</h3>
            <p className="rounded-xl border border-borda bg-superficie p-3 font-mono">
              nota da fase = Σ (peso da rubrica × nota da rubrica) ÷ peso da fase
            </p>
            {f1Pitch && f1Mesa && (
              <p className="text-suave">
                Ex.: F1 com pitch 100 e mesa 50 → ({f1Pitch.pesoFinal}×100 + {f1Mesa.pesoFinal}×50) ÷{" "}
                {f1Pitch.pesoFinal + f1Mesa.pesoFinal} ={" "}
                <strong className="text-foreground">
                  {fmt((f1Pitch.pesoFinal * 100 + f1Mesa.pesoFinal * 50) / (f1Pitch.pesoFinal + f1Mesa.pesoFinal))}
                </strong>
                , que soma {fmt((f1Pitch.pesoFinal * 100 + f1Mesa.pesoFinal * 50) / 100)} pontos na nota final.
              </p>
            )}
          </section>

          {/* 6. nota final */}
          <section className="space-y-2">
            <h3 className="text-base font-bold">6. Nota final</h3>
            <p className="rounded-xl border border-borda bg-superficie p-3 font-mono [overflow-wrap:anywhere]">
              {FORMULA}
            </p>
            <p className="text-suave">
              Cada termo é peso × nota da rubrica ÷ 100. Penalidades são somadas no fim. A nota final nunca fica abaixo de 0.
              Exemplo: todos os critérios em Proficiente (80) e uma penalidade de −3 → 80 − 3 ={" "}
              <strong className="text-foreground">77</strong>.
            </p>
          </section>

          {/* 7. penalidades */}
          <section className="space-y-2">
            <h3 className="text-base font-bold">7. Penalidades (marcadas pela organização)</h3>
            <ul className="space-y-1">
              {PENALIDADES.map((p) => (
                <li key={p.id} className="flex gap-2">
                  <span className="w-8 shrink-0 font-mono font-semibold text-red-600 dark:text-red-300">{p.pontos}</span>
                  <span className="text-suave">{p.texto}</span>
                </li>
              ))}
            </ul>
            <p className="text-suave">
              <strong className="text-foreground">Desclassificação:</strong> {DESCLASSIFICACAO}
            </p>
          </section>

          {/* 8. desempate */}
          <section className="space-y-2">
            <h3 className="text-base font-bold">8. Desempate (nesta ordem)</h3>
            <ol className="list-decimal space-y-1 pl-5 text-suave">
              {DESEMPATE.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ol>
          </section>

          <section className="space-y-1 rounded-xl border border-borda bg-superficie p-3 text-xs text-suave">
            <p>
              <strong className="text-foreground">Quem vê o quê:</strong> cada avaliador vê só as próprias fichas. A
              organização vê todas, a média de cada rubrica, a nota de cada avaliador, as penalidades e o ranking.
            </p>
            <p>
              <strong className="text-foreground">“Média dele”</strong> (painel da organização) é só a média simples das
              notas que um avaliador deu, para comparar avaliadores; não entra na nota final.
            </p>
          </section>

          <div className="flex justify-end">
            <button type="button" onClick={() => modal.current?.close()} className="btn-primario">
              Entendi
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
