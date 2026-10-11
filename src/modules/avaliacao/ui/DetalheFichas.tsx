import Link from "next/link";
import { alternarPenalidade, excluirFicha } from "@/modules/avaliacao/application/actions";
import { nomeNivel, nomeRubrica } from "@/modules/avaliacao/domain/bancas";
import type { LinhaRanking } from "@/modules/avaliacao/domain/consolidacao";
import { notaFicha } from "@/modules/avaliacao/domain/nota";
import { PENALIDADES, RUBRICAS } from "@/modules/avaliacao/domain/rubricas";
import { dataHora, nota } from "@/shared/lib/formatar";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

/** Penalidades de uma equipe: cada uma liga/desliga com um clique, com "Desfazer". */
export function Penalidades({ equipeId, aplicadas }: { equipeId: string; aplicadas: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PENALIDADES.map((p) => {
        const ativa = aplicadas.includes(p.id);
        return (
          <Formulario key={`${equipeId}-${p.id}-${ativa}`} action={alternarPenalidade} acaoDesfazer={alternarPenalidade}>
            <Ocultos valores={{ equipe_id: equipeId, penalidade: p.id, aplicar: ativa ? "0" : "1" }} />
            <BotaoEnviar
              variante="secundario"
              tamanho="pequeno"
              className={`text-left ${ativa ? "border-red-400/60! bg-red-500/15! text-red-700 dark:text-red-300" : ""}`}
              title={ativa ? "Clique para retirar" : "Clique para aplicar"}
            >
              <span aria-hidden>{ativa ? "☑" : "☐"}</span>
              <span className="font-mono">{p.pontos}</span> {p.texto}
            </BotaoEnviar>
          </Formulario>
        );
      })}
    </div>
  );
}

/** Fichas de cada equipe, critério por critério, com comentário e "apagar ficha". */
export function DetalheFichas({ linhas }: { linhas: LinhaRanking[] }) {
  return (
    <ol className="space-y-3">
      {linhas.map(({ equipe, fichas, penalidades, resultado: r, posicao }) => (
        <li key={equipe.id} className="card faixa-topo min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold text-white" style={{ background: posicao <= 3 ? "var(--grad)" : "var(--azul)" }}>
              {posicao}º
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{equipe.nome}</h2>
              <p className="text-xs text-suave">
                {r.completa ? "todas as rubricas completas" : "avaliação incompleta"}
                {r.penalidades ? ` · penalidades ${r.penalidades}` : ""} · nota final {nota(r.final)}
              </p>
            </div>
            <Link href={`/avaliar/${equipe.id}`} className="btn-secundario min-h-9 px-3 text-xs">
              <Icone nome="editar" className="size-4" /> Lançar notas
            </Link>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Penalidades</h3>
            <Penalidades equipeId={equipe.id} aplicadas={penalidades} />
          </div>

          {RUBRICAS.map((rb) => {
            const daRubrica = fichas.filter((f) => f.rubrica === rb.id);
            const x = r.rubricas[rb.id];
            return (
              <details key={rb.id} className="group rounded-xl border border-borda p-3" open={daRubrica.length > 0 && !x.completa}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 select-none">
                  <span className="text-sm font-semibold">
                    {nomeRubrica(rb.id)} <span className="font-normal text-suave">· média {nota(x.nota)} · {daRubrica.length} ficha(s)</span>
                  </span>
                  <Icone nome="avancar" className="size-4 text-suave transition group-open:rotate-90" />
                </summary>
                <div className="mt-3 space-y-3">
                  {daRubrica.length === 0 ? (
                    <p className="text-xs text-suave">
                      Ninguém avaliou ainda.{" "}
                      <Link href={`/avaliar/${equipe.id}?r=${rb.id}`} className="text-marca underline">
                        Abrir a ficha ({rb.criterios.length} critérios)
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
                                  {nomeNivel(f.notas?.[c.id])}
                                </td>
                              ))}
                              <td className="py-1 font-mono">{x.mediaCriterio[c.id] === null ? "–" : `${Math.round((x.mediaCriterio[c.id] ?? 0) * 100)}%`}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-borda font-semibold">
                            <td className="py-1 pr-2">Nota da ficha</td>
                            {daRubrica.map((f) => (
                              <td key={f.id} className="py-1 pr-2 font-mono">
                                {nota(notaFicha(rb, f.notas ?? {}))}
                              </td>
                            ))}
                            <td className="py-1 font-mono">{nota(x.nota)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {daRubrica.map((f) => (
                    <div key={`c-${f.id}`} className="flex flex-wrap items-start gap-2 text-xs">
                      <p className="min-w-0 flex-1 text-suave [overflow-wrap:anywhere]">
                        <strong className="text-foreground">{f.quem?.nome ?? f.avaliador}</strong> · {dataHora(f.atualizado_em)}:{" "}
                        {f.comentario ? `“${f.comentario}”` : "sem comentário"}
                      </p>
                      <Formulario
                        action={excluirFicha}
                        tituloConfirmar="Apagar esta ficha?"
                        rotuloConfirmar="Apagar ficha"
                        confirmar={`A ficha de ${f.quem?.nome ?? f.avaliador} (${nomeRubrica(rb.id)}) para a ${equipe.nome} é apagada e sai da média. Não dá para desfazer.`}
                      >
                        <Ocultos valores={{ id: f.id }} />
                        <BotaoEnviar variante="perigo" tamanho="pequeno" icone="lixo">
                          Apagar ficha
                        </BotaoEnviar>
                      </Formulario>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </li>
      ))}
    </ol>
  );
}
