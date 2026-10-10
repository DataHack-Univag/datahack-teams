"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { salvarAvaliacao } from "@/app/actions";
import { fmtNota } from "@/lib/nota";
import { NIVEIS, type Rubrica } from "@/lib/rubricas";
import type { Resultado } from "@/lib/tipos";

type Notas = Record<string, number>;

const hora = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const iguais = (a: Notas, b: Notas) => {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
};

/**
 * Ficha de uma rubrica para uma equipe. Pensada nas heurísticas de Nielsen:
 *  1 · status sempre visível (não salvo / salvando / salvo às HH:MM / erro) na barra fixa;
 *  3 · controle: limpar critério, desfazer alterações, aviso ao sair, rascunho automático;
 *  5 · prevenção de erros: confirma antes de salvar incompleta e aponta o que falta;
 *  8 · foco: status e ações concentrados na barra fixa; cada nível em um card objetivo.
 */
export function FichaAvaliacao({
  rubrica,
  equipeId,
  equipeNome,
  notasIniciais,
  comentarioInicial,
  salvoEm,
  bloqueada,
  voltarAoSalvar,
}: {
  rubrica: Rubrica;
  equipeId: string;
  equipeNome: string;
  notasIniciais: Notas;
  comentarioInicial: string;
  /** atualizado_em da ficha salva (null = ainda não salva). */
  salvoEm: string | null;
  bloqueada: boolean;
  /** true = depois de salvar, volta para a lista de grupos (visão dos avaliadores). */
  voltarAoSalvar: boolean;
}) {
  const [estado, acao, salvando] = useActionState<Resultado, FormData>(salvarAvaliacao, null);
  const [notas, setNotas] = useState<Notas>(notasIniciais);
  const [comentario, setComentario] = useState(comentarioInicial);
  // último estado salvo (para "desfazer" e para saber se há alterações)
  // A cada salvamento a página recria a ficha (key com atualizado_em), então o "último salvo" vem das props.
  const salvo = { notas: notasIniciais, comentario: comentarioInicial };
  const salvoAs = salvoEm ? new Date(salvoEm) : null;
  const [destacarFaltando, setDestacarFaltando] = useState(false);
  const [rascunho, setRascunho] = useState<{ notas: Notas; comentario: string; em: string } | null>(null);
  // erro da última tentativa de salvar; some quando a pessoa altera algo
  const [erro, setErro] = useState<string | null>(null);

  const form = useRef<HTMLFormElement>(null);
  const modalFalta = useRef<HTMLDialogElement>(null);
  const confirmouIncompleta = useRef(false);

  const chaveRascunho = `dh-rascunho-${equipeId}-${rubrica.id}`;
  const alterada = !iguais(notas, salvo.notas) || comentario !== salvo.comentario;
  const faltando = rubrica.criterios.filter((c) => typeof notas[c.id] !== "number");
  const total = rubrica.criterios.reduce((s, c) => s + c.peso * (notas[c.id] ?? 0), 0);

  // Resposta do servidor: só chega aqui em caso de erro (sucesso redireciona e recria a ficha).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErro(estado?.erro ?? null);
  }, [estado]);

  // Rascunho automático: se a página fechar sem salvar, dá para restaurar depois.
  useEffect(() => {
    try {
      const r = localStorage.getItem(chaveRascunho);
      if (!r) return;
      const d = JSON.parse(r) as { notas: Notas; comentario: string; em: string };
      if (!iguais(d.notas, notasIniciais) || d.comentario !== comentarioInicial) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRascunho(d);
      } else localStorage.removeItem(chaveRascunho);
    } catch {}
    // só ao abrir a ficha
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!alterada || rascunho) return;
    try {
      localStorage.setItem(chaveRascunho, JSON.stringify({ notas, comentario, em: new Date().toISOString() }));
    } catch {}
  }, [notas, comentario, alterada, rascunho, chaveRascunho]);

  // Aviso do navegador ao fechar/recarregar com alterações não salvas.
  useEffect(() => {
    if (!alterada) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", aviso);
    return () => removeEventListener("beforeunload", aviso);
  }, [alterada]);

  function marcar(id: string, fator: number) {
    setErro(null);
    setNotas((x) => ({ ...x, [id]: fator }));
  }
  function limpar(id: string) {
    setErro(null);
    setNotas((x) => {
      const n = { ...x };
      delete n[id];
      return n;
    });
  }
  function desfazer() {
    setNotas(salvo.notas);
    setComentario(salvo.comentario);
    setDestacarFaltando(false);
    try {
      localStorage.removeItem(chaveRascunho);
    } catch {}
  }
  function irParaFaltando() {
    modalFalta.current?.close();
    setDestacarFaltando(true);
    document.getElementById(`crit-${faltando[0]?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Status para a barra fixa (heurística 1).
  const status = salvando
    ? { cor: "text-marca", texto: "Salvando…" }
    : erro
      ? { cor: "text-red-600 dark:text-red-300", texto: `Não salvou: ${erro}` }
      : alterada
        ? { cor: "text-amber-700 dark:text-amber-300", texto: "● Alterações não salvas" }
        : salvoAs
          ? { cor: "text-emerald-700 dark:text-emerald-300", texto: `✔ Salvo às ${hora(salvoAs)}` }
          : { cor: "text-suave", texto: "Ficha ainda não preenchida" };

  return (
    <form
      ref={form}
      action={acao}
      className="space-y-4"
      onSubmit={(e) => {
        // Prevenção de erros (heurística 5): avisa antes de salvar incompleta.
        if (faltando.length && !confirmouIncompleta.current) {
          e.preventDefault();
          modalFalta.current?.showModal();
          return;
        }
        confirmouIncompleta.current = false;
        // ao salvar, o rascunho deixa de existir (a ficha salva vira a referência)
        try {
          localStorage.removeItem(chaveRascunho);
        } catch {}
      }}
    >
      <input type="hidden" name="equipe_id" value={equipeId} />
      <input type="hidden" name="rubrica" value={rubrica.id} />
      <input type="hidden" name="equipe_nome" value={equipeNome} />
      <input type="hidden" name="voltar" value={voltarAoSalvar ? "1" : "0"} />
      {rubrica.criterios.map((c) => (
        <input key={c.id} type="hidden" name={`c-${c.id}`} value={notas[c.id] ?? ""} />
      ))}

      {/* rascunho encontrado (heurística 3) */}
      {rascunho && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-sm">
          <p className="mr-auto">
            Há um rascunho não salvo desta ficha ({hora(new Date(rascunho.em))}). Quer continuar de onde parou?
          </p>
          <button
            type="button"
            className="btn-primario min-h-9 px-3 text-xs"
            onClick={() => {
              setNotas(rascunho.notas);
              setComentario(rascunho.comentario);
              setRascunho(null);
            }}
          >
            Restaurar rascunho
          </button>
          <button
            type="button"
            className="btn-secundario min-h-9 px-3 text-xs"
            onClick={() => {
              setRascunho(null);
              try {
                localStorage.removeItem(chaveRascunho);
              } catch {}
            }}
          >
            Descartar
          </button>
        </div>
      )}

      <fieldset disabled={bloqueada || salvando} className="m-0 min-w-0 space-y-4 border-0 p-0 sm:space-y-5">
        {rubrica.criterios.map((c) => (
          <Criterio
            key={c.id}
            c={c}
            valor={notas[c.id]}
            destacar={destacarFaltando && typeof notas[c.id] !== "number"}
            marcar={(f) => marcar(c.id, f)}
            limpar={() => limpar(c.id)}
          />
        ))}

        <section className="card space-y-2">
          <label className="block">
            <span className="rotulo">Comentário para a equipe (opcional)</span>
            <textarea
              name="comentario"
              rows={3}
              maxLength={2000}
              value={comentario}
              onChange={(e) => {
                setErro(null);
                setComentario(e.target.value);
              }}
              placeholder="Pontos fortes, o que melhorar"
              className="campo"
            />
          </label>
        </section>
      </fieldset>

      {/* ------------------------------------------------ barra fixa: nota, status e ações */}
      <div className="sticky bottom-3 z-10">
        <div className="destaque-grad flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl p-3 sm:p-4">
          <div className="mr-auto min-w-0">
            <p className="truncate text-xs text-suave">
              {equipeNome} · {rubrica.curto}
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
              <span className="grad-text">{fmtNota(total)}</span>
              <span className="text-sm font-normal text-suave"> / 100</span>
              <span className="ml-2 text-xs font-normal text-suave">
                {rubrica.criterios.length - faltando.length}/{rubrica.criterios.length} critérios
              </span>
            </p>
            <p className={`text-xs font-semibold ${status.cor}`} role="status" aria-live="polite">
              {status.texto}
            </p>
          </div>
          {bloqueada ? (
            <span className="text-sm text-suave">Avaliação encerrada: só consulta</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {alterada && (
                <button type="button" onClick={desfazer} disabled={salvando} className="btn-secundario">
                  ↶ Desfazer alterações
                </button>
              )}
              <button type="submit" disabled={!alterada || salvando} className="btn-primario">
                {salvando && (
                  <span
                    aria-hidden
                    className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                )}
                {salvando ? "Salvando…" : alterada ? "Salvar ficha" : "Salvo"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ confirmação: ficha incompleta */}
      <dialog
        ref={modalFalta}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto w-[min(92vw,28rem)] bg-transparent p-0 text-foreground backdrop:bg-[#000b38]/60 backdrop:backdrop-blur-sm open:animate-[dh-sobe_.25s_both]"
      >
        <div className="destaque-grad faixa-topo space-y-4 rounded-2xl p-5">
          <div>
            <h2 className="text-lg font-bold">Faltam {faltando.length} critério(s)</h2>
            <p className="text-sm text-suave">
              Critério sem nível conta <strong className="text-foreground">0</strong> na nota desta ficha:
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
              {faltando.map((c) => (
                <li key={c.id}>
                  {c.nome} <span className="text-suave">(peso {c.peso})</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secundario"
              onClick={() => {
                confirmouIncompleta.current = true;
                modalFalta.current?.close();
                form.current?.requestSubmit();
              }}
            >
              Salvar assim mesmo
            </button>
            <button type="button" className="btn-primario" onClick={irParaFaltando} autoFocus>
              Voltar e completar
            </button>
          </div>
        </div>
      </dialog>
    </form>
  );
}

/** Um critério: os 4 níveis como cards clicáveis (nome, % e descrição de cada nível). */
function Criterio({
  c,
  valor,
  destacar,
  marcar,
  limpar,
}: {
  c: Rubrica["criterios"][number];
  valor: number | undefined;
  destacar: boolean;
  marcar: (f: number) => void;
  limpar: () => void;
}) {
  return (
    <section
      id={`crit-${c.id}`}
      className={`card scroll-mt-24 space-y-3 ${destacar ? "ring-2 ring-amber-400" : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">
          {c.nome} <span className="text-xs font-normal text-suave">· peso {c.peso}</span>
        </h3>
        <span className="flex items-center gap-2 text-sm">
          <span className="font-mono tabular-nums text-suave">
            {typeof valor === "number" ? `${fmtNota(c.peso * valor)} pts` : destacar ? "falta marcar" : "–"}
          </span>
          {typeof valor === "number" && (
            <button type="button" onClick={limpar} className="text-xs text-marca underline-offset-2 hover:underline">
              Limpar
            </button>
          )}
        </span>
      </div>
      <p className="text-sm text-suave">{c.descricao}</p>

      {/* cada nível é um card clicável com nome, % e a descrição do nível */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label={c.nome}>
        {NIVEIS.map((n, k) => {
          const marcado = valor === n.fator;
          return (
            <button
              key={n.nome}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => marcar(n.fator)}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left text-sm transition ${
                marcado ? "destaque-grad" : "border-borda-forte bg-superficie-solida/60 hover:border-marca"
              }`}
            >
              <span className="flex items-center justify-between gap-2 font-semibold">
                <span>
                  {marcado && "✔ "}
                  {n.nome}
                </span>
                <span className="font-mono text-xs text-suave">{Math.round(n.fator * 100)}%</span>
              </span>
              <span className="text-xs [overflow-wrap:anywhere] text-suave">{c.niveis[k]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
