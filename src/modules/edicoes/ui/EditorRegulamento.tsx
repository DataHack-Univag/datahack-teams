"use client";

import { useState, type ReactNode } from "react";
import type { RegulamentoCanonico } from "@/modules/avaliacao/domain/regulamento";
import { importarRegulamento } from "@/modules/edicoes/application/actions";
import { Botao } from "@/shared/ui/Botao";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

type Reg = RegulamentoCanonico;
type Rubrica = Reg["rubricas"][number];
type Criterio = Rubrica["criterios"][number];

/** Código a partir do nome ("Fase 1 · Pitch" → "fase_1_pitch"), para ninguém precisar inventar códigos. */
const codigoDe = (nome: string, usados: string[], maiusculo = false) => {
  let base = nome.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "item";
  base = maiusculo ? base.toUpperCase() : base.toLowerCase();
  let c = base;
  for (let n = 2; usados.includes(c); n++) c = `${base}_${n}`;
  return c;
};

export const REGULAMENTO_VAZIO: Reg = {
  bancas: [
    { codigo: "organizacao", nome: "Organização", da_organizacao: true },
    { codigo: "professores", nome: "Banca de professores" },
  ],
  niveis: [
    { nome: "Insuficiente", fator: 0 },
    { nome: "Básico", fator: 0.5 },
    { nome: "Proficiente", fator: 0.8 },
    { nome: "Excelente", fator: 1 },
  ],
  fases: [],
  rubricas: [],
  penalidades: [],
  desempate: [{ descricao: "Decisão conjunta das bancas", tipo: "manual" }],
  formula: "",
  desclassificacao: "",
};

/**
 * Montar o regulamento na tela, item por item (alternativa ao JSON). Mostra as somas dos pesos
 * ao vivo e avisa o que não fecha (heurísticas 1 e 5). Ao salvar, vira o mesmo JSON da importação
 * e passa pela mesma conferência no servidor.
 */
export function EditorRegulamento({ edicaoId, inicial, substituir }: { edicaoId: string; inicial: Reg; substituir: boolean }) {
  const [reg, setReg] = useState<Reg>(inicial);
  const mudar = (f: (r: Reg) => Reg) => setReg((r) => f(structuredClone(r)));

  const somaFases = reg.fases.reduce((t, f) => t + Number(f.peso || 0), 0);
  const avisos: string[] = [];
  if (Math.abs(somaFases - 100) > 1e-9) avisos.push(`As fases somam ${somaFases}% (precisam somar 100%).`);
  reg.fases.forEach((f) => {
    const s = reg.rubricas.filter((r) => r.fase === f.codigo).reduce((t, r) => t + Number(r.peso_final || 0), 0);
    if (Math.abs(s - Number(f.peso)) > 1e-9) avisos.push(`${f.nome}: as rubricas somam ${s}%, mas a fase vale ${f.peso}%.`);
  });
  reg.rubricas.forEach((r) => {
    const s = r.criterios.reduce((t, c) => t + Number(c.peso || 0), 0);
    if (Math.abs(s - 100) > 1e-9) avisos.push(`${r.nome || r.codigo}: os critérios somam ${s} (precisam somar 100).`);
  });

  const novoCriterio = (r: Rubrica): Criterio => ({
    codigo: codigoDe("criterio", r.criterios.map((c) => c.codigo)),
    nome: "",
    peso: 0,
    descricao: "",
    niveis: reg.niveis.map((n) => ({ fator: n.fator, descricao: "" })),
  });

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------ bancas */}
      <Bloco titulo="Bancas" dica="Quem avalia. A da organização é obrigatória (organizadores avaliam por ela).">
        {reg.bancas.map((b, i) => (
          <Linha key={i} aoTirar={b.da_organizacao ? undefined : () => mudar((r) => ({ ...r, bancas: r.bancas.filter((_, k) => k !== i) }))}>
            <Entrada rotulo="Nome" valor={b.nome} aoMudar={(v) => mudar((r) => ((r.bancas[i].nome = v), r))} largo />
            {b.da_organizacao && <span className="selo bg-marca-fundo text-marca">organização</span>}
          </Linha>
        ))}
        <Adicionar aoTocar={() => mudar((r) => ({ ...r, bancas: [...r.bancas, { codigo: codigoDe("banca", r.bancas.map((x) => x.codigo)), nome: "Nova banca" }] }))}>Banca</Adicionar>
      </Bloco>

      {/* ------------------------------------------------ fases e rubricas */}
      <Bloco titulo="Fases e rubricas" dica="Cada fase vale uma parte da nota final; as rubricas da fase dividem esse peso entre as bancas.">
        {reg.fases.map((f, i) => {
          const daFase = reg.rubricas.map((r, k) => ({ r, k })).filter(({ r }) => r.fase === f.codigo);
          return (
            <div key={f.codigo} className="space-y-3 rounded-xl border border-borda p-3">
              <Linha aoTirar={() => mudar((r) => ({ ...r, fases: r.fases.filter((_, k) => k !== i), rubricas: r.rubricas.filter((x) => x.fase !== f.codigo) }))}>
                <Entrada rotulo="Fase" valor={f.nome} aoMudar={(v) => mudar((r) => ((r.fases[i].nome = v), r))} largo />
                <Entrada rotulo="Peso na nota (%)" numero valor={f.peso} aoMudar={(v) => mudar((r) => ((r.fases[i].peso = Number(v)), r))} />
              </Linha>
              {daFase.map(({ r: rub, k }) => (
                <details key={rub.codigo} className="rounded-lg bg-marca-fundo/40 p-3" open={!rub.nome}>
                  <summary className="cursor-pointer text-sm font-semibold">
                    {rub.nome || "Nova rubrica"} · {rub.peso_final}% · {reg.bancas.find((b) => b.codigo === rub.banca)?.nome ?? rub.banca} · {rub.criterios.length} critério(s)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <Linha aoTirar={() => mudar((r) => ({ ...r, rubricas: r.rubricas.filter((_, x) => x !== k) }))}>
                      <Entrada rotulo="Nome da rubrica" valor={rub.nome} aoMudar={(v) => mudar((r) => ((r.rubricas[k].nome = v), (r.rubricas[k].curto = v), r))} largo />
                      <Entrada rotulo="Peso na nota (%)" numero valor={rub.peso_final} aoMudar={(v) => mudar((r) => ((r.rubricas[k].peso_final = Number(v)), r))} />
                      <label className="flex flex-col gap-1 text-xs font-semibold">
                        Banca
                        <select className="campo min-h-9 py-1 text-sm" value={rub.banca} onChange={(ev) => mudar((r) => ((r.rubricas[k].banca = ev.target.value), r))}>
                          {reg.bancas.map((b) => (
                            <option key={b.codigo} value={b.codigo}>
                              {b.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Entrada rotulo="Quando (opcional)" valor={rub.momento ?? ""} aoMudar={(v) => mudar((r) => ((r.rubricas[k].momento = v), r))} />
                    </Linha>
                    {rub.criterios.map((c, j) => (
                      <div key={c.codigo} className="space-y-2 rounded-lg border border-borda p-2.5">
                        <Linha aoTirar={() => mudar((r) => ((r.rubricas[k].criterios = r.rubricas[k].criterios.filter((_, x) => x !== j)), r))}>
                          <Entrada rotulo="Critério" valor={c.nome} aoMudar={(v) => mudar((r) => ((r.rubricas[k].criterios[j].nome = v), r))} largo />
                          <Entrada rotulo="Peso (de 100)" numero valor={c.peso} aoMudar={(v) => mudar((r) => ((r.rubricas[k].criterios[j].peso = Number(v)), r))} />
                        </Linha>
                        <Entrada rotulo="O que a banca observa" valor={c.descricao ?? ""} aoMudar={(v) => mudar((r) => ((r.rubricas[k].criterios[j].descricao = v), r))} largo />
                        <div className="grid gap-2 sm:grid-cols-2">
                          {reg.niveis.map((n, x) => (
                            <Entrada
                              key={n.nome}
                              largo
                              rotulo={n.nome}
                              valor={c.niveis.find((y) => Number(y.fator) === Number(n.fator))?.descricao ?? ""}
                              aoMudar={(v) =>
                                mudar((r) => {
                                  const lista = r.rubricas[k].criterios[j].niveis;
                                  const item = lista.find((y) => Number(y.fator) === Number(n.fator));
                                  if (item) item.descricao = v;
                                  else lista.splice(x, 0, { fator: n.fator, descricao: v });
                                  return r;
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    <Adicionar aoTocar={() => mudar((r) => ((r.rubricas[k].criterios = [...r.rubricas[k].criterios, novoCriterio(r.rubricas[k])]), r))}>Critério</Adicionar>
                  </div>
                </details>
              ))}
              <Adicionar
                aoTocar={() =>
                  mudar((r) => ({
                    ...r,
                    rubricas: [
                      ...r.rubricas,
                      {
                        codigo: codigoDe(`${f.codigo}_rubrica`, r.rubricas.map((x) => x.codigo), true),
                        fase: f.codigo,
                        banca: r.bancas.find((b) => !b.da_organizacao)?.codigo ?? r.bancas[0].codigo,
                        nome: "",
                        curto: "",
                        peso_final: 0,
                        criterios: [],
                      },
                    ],
                  }))
                }
              >
                Rubrica nesta fase
              </Adicionar>
            </div>
          );
        })}
        <Adicionar aoTocar={() => mudar((r) => ({ ...r, fases: [...r.fases, { codigo: codigoDe(`F${r.fases.length + 1}`, r.fases.map((x) => x.codigo), true), nome: `Fase ${r.fases.length + 1}`, peso: 0 }] }))}>
          Fase
        </Adicionar>
      </Bloco>

      {/* ------------------------------------------------ penalidades e desempate */}
      <Bloco titulo="Penalidades" dica="Pontos descontados da nota final (sempre negativos).">
        {reg.penalidades.map((p, i) => (
          <Linha key={p.codigo} aoTirar={() => mudar((r) => ({ ...r, penalidades: r.penalidades.filter((_, k) => k !== i) }))}>
            <Entrada rotulo="Quando acontece" valor={p.texto} aoMudar={(v) => mudar((r) => ((r.penalidades[i].texto = v), r))} largo />
            <Entrada rotulo="Pontos" numero valor={p.pontos} aoMudar={(v) => mudar((r) => ((r.penalidades[i].pontos = -Math.abs(Number(v))), r))} />
          </Linha>
        ))}
        <Adicionar aoTocar={() => mudar((r) => ({ ...r, penalidades: [...r.penalidades, { codigo: codigoDe("penalidade", r.penalidades.map((x) => x.codigo)), texto: "", pontos: -2 }] }))}>Penalidade</Adicionar>
      </Bloco>

      <Bloco titulo="Desempate" dica="Em ordem. O último costuma ser a decisão das bancas.">
        {reg.desempate.map((d, i) => (
          <Linha key={i} aoTirar={reg.desempate.length > 1 ? () => mudar((r) => ({ ...r, desempate: r.desempate.filter((_, k) => k !== i) })) : undefined}>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Critério de desempate
              <select
                className="campo min-h-9 py-1 text-sm"
                value={d.tipo === "manual" ? "manual" : `${d.tipo}:${d.rubrica}:${d.criterio ?? ""}`}
                onChange={(ev) =>
                  mudar((r) => {
                    const [tipo, rubrica, criterio] = ev.target.value.split(":");
                    const rub = r.rubricas.find((x) => x.codigo === rubrica);
                    r.desempate[i] =
                      tipo === "manual"
                        ? { descricao: "Decisão conjunta das bancas", tipo: "manual" }
                        : { tipo, rubrica, criterio: criterio || null, descricao: tipo === "rubrica" ? `Maior nota em ${rub?.nome}` : `Maior nota em “${rub?.criterios.find((c) => c.codigo === criterio)?.nome}” (${rub?.nome})` };
                    return r;
                  })
                }
              >
                <option value="manual">Decisão das bancas</option>
                {reg.rubricas.map((r) => (
                  <optgroup key={r.codigo} label={r.nome || r.codigo}>
                    <option value={`rubrica:${r.codigo}:`}>Maior nota na rubrica</option>
                    {r.criterios.map((c) => (
                      <option key={c.codigo} value={`criterio:${r.codigo}:${c.codigo}`}>
                        Maior nota em “{c.nome || c.codigo}”
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </Linha>
        ))}
        <Adicionar aoTocar={() => mudar((r) => ({ ...r, desempate: [...r.desempate, { descricao: "Decisão conjunta das bancas", tipo: "manual" }] }))}>Regra de desempate</Adicionar>
      </Bloco>

      {/* ------------------------------------------------ conferência e gravação */}
      {avisos.length > 0 ? (
        <div role="status" className="rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold">Ainda não fecha:</p>
          <ul className="mt-1 list-disc pl-5">
            {avisos.slice(0, 8).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p role="status" className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          Os pesos fecham: fases somam 100% e cada rubrica tem critérios somando 100.
        </p>
      )}
      <Formulario
        action={importarRegulamento}
        confirmar={substituir ? "O regulamento atual sai e entra este. O atual fica guardado no histórico." : undefined}
        tituloConfirmar={substituir ? "Salvar este regulamento?" : undefined}
        rotuloConfirmar="Salvar regulamento"
        perigo={false}
      >
        <Ocultos valores={{ id: edicaoId, substituir: substituir ? "1" : "", json: JSON.stringify(reg) }} />
        <BotaoEnviar icone="ok">Salvar regulamento</BotaoEnviar>
      </Formulario>
    </div>
  );
}

function Bloco({ titulo, dica, children }: { titulo: string; dica: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="font-semibold">{titulo}</h3>
        <p className="text-xs text-suave">{dica}</p>
      </div>
      {children}
    </section>
  );
}

function Linha({ children, aoTirar }: { children: ReactNode; aoTirar?: () => void }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {children}
      {aoTirar && (
        <button type="button" onClick={aoTirar} className="mb-1 rounded-lg p-1.5 text-suave hover:bg-red-500/10 hover:text-red-600" aria-label="Tirar">
          <Icone nome="lixo" className="size-4" />
        </button>
      )}
    </div>
  );
}

function Entrada({ rotulo, valor, aoMudar, numero = false, largo = false }: { rotulo: string; valor: string | number; aoMudar: (v: string) => void; numero?: boolean; largo?: boolean }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-xs font-semibold ${largo ? "flex-1 basis-56" : "w-32"}`}>
      {rotulo}
      <input className="campo min-h-9 py-1 text-sm font-normal" type={numero ? "number" : "text"} step="any" value={valor} onChange={(ev) => aoMudar(ev.target.value)} />
    </label>
  );
}

function Adicionar({ aoTocar, children }: { aoTocar: () => void; children: ReactNode }) {
  return (
    <Botao variante="fantasma" tamanho="pequeno" icone="mais_novo" onClick={aoTocar}>
      {children}
    </Botao>
  );
}
