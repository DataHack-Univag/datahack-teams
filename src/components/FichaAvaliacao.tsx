"use client";

import { useState } from "react";
import { salvarAvaliacao } from "@/app/actions";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { fmtNota } from "@/lib/nota";
import { NIVEIS, type Rubrica } from "@/lib/rubricas";

/**
 * Ficha de uma rubrica para uma equipe: um nível por critério, nota calculada na hora
 * (peso do critério × fator do nível) e comentário. Mesma lógica das fichas do
 * cronograma_rubrica.html, agora salvando no sistema.
 */
export function FichaAvaliacao({
  rubrica,
  equipeId,
  notasIniciais,
  comentarioInicial,
  bloqueada,
}: {
  rubrica: Rubrica;
  equipeId: string;
  notasIniciais: Record<string, number>;
  comentarioInicial: string;
  bloqueada: boolean;
}) {
  const [notas, setNotas] = useState<Record<string, number>>(notasIniciais);
  const feitos = rubrica.criterios.filter((c) => typeof notas[c.id] === "number").length;
  const total = rubrica.criterios.reduce((s, c) => s + c.peso * (notas[c.id] ?? 0), 0);

  return (
    <Formulario action={salvarAvaliacao} className="space-y-4">
      <input type="hidden" name="equipe_id" value={equipeId} />
      <input type="hidden" name="rubrica" value={rubrica.id} />

      <fieldset disabled={bloqueada} className="contents">
        {rubrica.criterios.map((c, i) => (
          <section key={c.id} className="card space-y-3" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-bold">
                {c.nome} <span className="text-xs font-normal text-suave">· peso {c.peso}</span>
              </h3>
              <span className="font-mono text-sm tabular-nums text-suave">
                {typeof notas[c.id] === "number" ? `${fmtNota(c.peso * notas[c.id])} pts` : "–"}
              </span>
            </div>
            <p className="text-sm text-suave">{c.descricao}</p>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label={c.nome}>
              {NIVEIS.map((n, k) => {
                const marcado = notas[c.id] === n.fator;
                return (
                  <label
                    key={n.nome}
                    className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition ${
                      marcado
                        ? "destaque-grad"
                        : "border-borda-forte bg-superficie-solida/60 hover:border-marca"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c-${c.id}`}
                      value={n.fator}
                      checked={marcado}
                      onChange={() => setNotas((x) => ({ ...x, [c.id]: n.fator }))}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-between gap-2 font-semibold">
                      <span>{n.nome}</span>
                      <span className="font-mono text-xs text-suave">{Math.round(n.fator * 100)}%</span>
                    </span>
                    <span className="text-xs [overflow-wrap:anywhere] text-suave">{c.niveis[k]}</span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}

        <section className="card space-y-2">
          <label className="block">
            <span className="rotulo">Comentário para a equipe (opcional)</span>
            <textarea
              name="comentario"
              rows={3}
              maxLength={2000}
              defaultValue={comentarioInicial}
              placeholder="Pontos fortes, o que melhorar"
              className="campo"
            />
          </label>
        </section>
      </fieldset>

      {/* Barra fixa com a nota e o botão de salvar */}
      <div className="sticky bottom-3 z-10">
        <div className="destaque-grad flex flex-wrap items-center gap-3 rounded-2xl p-3 sm:p-4">
          <div className="mr-auto">
            <p className="text-xs text-suave">Nota da rubrica</p>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
              <span className="grad-text">{fmtNota(total)}</span>
              <span className="text-sm font-normal text-suave"> / 100</span>
            </p>
            <p className="text-xs text-suave">
              {feitos}/{rubrica.criterios.length} critérios · vale {rubrica.pesoFinal}% da nota final
            </p>
          </div>
          {bloqueada ? (
            <span className="text-sm text-suave">Avaliação encerrada</span>
          ) : (
            <BotaoEnviar>Salvar ficha</BotaoEnviar>
          )}
        </div>
      </div>
    </Formulario>
  );
}
