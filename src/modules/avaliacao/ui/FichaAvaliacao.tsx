"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { salvarFicha } from "@/modules/avaliacao/application/actions";
import { CRITERIOS_COM_PERGUNTAS } from "@/modules/avaliacao/domain/perguntas";
import type { Nivel, Rubrica } from "@/modules/avaliacao/domain/regulamento";
import type { Notas } from "@/modules/avaliacao/domain/tipos";
import { PerguntasDesafio } from "@/modules/avaliacao/ui/PerguntasDesafio";
import { hora, nota as fmtNota } from "@/shared/lib/formatar";
import { Aviso } from "@/shared/ui/Aviso";
import { Botao, Girando } from "@/shared/ui/Botao";
import { Ocultos } from "@/shared/ui/Formulario";
import { Modal, useModal } from "@/shared/ui/Modal";

const iguais = (a: Notas, b: Notas) => {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
};
const digitando = (el: Element | null) => !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);

/**
 * Ficha de uma rubrica para uma equipe. Heurísticas de Nielsen:
 *  1 · estado sempre visível na barra fixa (não salvo / salvando / salvo às HH:MM / erro);
 *  3 · limpar critério, desfazer alterações, aviso ao sair e rascunho automático;
 *  5 · avisa antes de salvar incompleta e leva ao que falta;
 *  6 · descrição de cada nível no próprio botão (não precisa lembrar a rubrica);
 *  7 · atalhos: 1, 2, 3… marcam o nível do critério selecionado, ↑↓ mudam de critério, Ctrl+S salva.
 */
export function FichaAvaliacao({
  rubrica,
  niveis: NIVEIS,
  equipeId,
  equipeNome,
  notasIniciais,
  comentarioInicial,
  salvoEm,
  bloqueada,
  voltarAoSalvar,
}: {
  rubrica: Rubrica;
  /** Níveis da edição, na ordem (os atalhos 1, 2, 3… marcam cada um). */
  niveis: Nivel[];
  equipeId: string;
  equipeNome: string;
  notasIniciais: Notas;
  comentarioInicial: string;
  /** atualizado_em da ficha salva (null = ainda não salva). */
  salvoEm: string | null;
  bloqueada: boolean;
  /** true = depois de salvar volta para a lista de equipes (visão das bancas). */
  voltarAoSalvar: boolean;
}) {
  const [estado, acao, salvando] = useActionState(salvarFicha, null);
  const [notas, setNotas] = useState<Notas>(notasIniciais);
  const [comentario, setComentario] = useState(comentarioInicial);
  const [ativo, setAtivo] = useState(0);
  const [destacarFaltando, setDestacarFaltando] = useState(false);
  const [rascunho, setRascunho] = useState<{ notas: Notas; comentario: string; em: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const modalFalta = useModal();
  const confirmouIncompleta = useRef(false);

  // A cada salvamento a página recria a ficha (key com atualizado_em): o "último salvo" vem das props.
  const chaveRascunho = `dh-rascunho-${equipeId}-${rubrica.id}`;
  const alterada = !iguais(notas, notasIniciais) || comentario !== comentarioInicial;
  const faltando = rubrica.criterios.filter((c) => typeof notas[c.id] !== "number");
  const total = rubrica.criterios.reduce((s, c) => s + c.peso * (notas[c.id] ?? 0), 0);

  // Resposta do servidor: só chega aqui em caso de erro (sucesso redireciona e recria a ficha).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErro(estado?.erro ?? null);
  }, [estado]);

  // Rascunho automático: se a página fechar sem salvar, dá para continuar depois.
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

  // Atalhos de teclado (heurística 7).
  useEffect(() => {
    if (bloqueada) return;
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (alterada && !salvando) form.current?.requestSubmit();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || digitando(document.activeElement) || document.querySelector("dialog[open]")) return;
      const n = Number(e.key);
      if (n >= 1 && n <= NIVEIS.length) {
        e.preventDefault();
        marcar(rubrica.criterios[ativo].id, NIVEIS[n - 1].fator);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const prox = Math.max(0, Math.min(rubrica.criterios.length - 1, ativo + (e.key === "ArrowDown" ? 1 : -1)));
        setAtivo(prox);
        document.getElementById(`crit-${rubrica.criterios[prox].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  });

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
    setNotas(notasIniciais);
    setComentario(comentarioInicial);
    setDestacarFaltando(false);
    try {
      localStorage.removeItem(chaveRascunho);
    } catch {}
  }
  function irParaFaltando() {
    modalFalta.fechar();
    setDestacarFaltando(true);
    const i = rubrica.criterios.findIndex((c) => c.id === faltando[0]?.id);
    if (i >= 0) setAtivo(i);
    document.getElementById(`crit-${faltando[0]?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const salvoAs = salvoEm ? new Date(salvoEm) : null;
  const status = salvando
    ? { cor: "text-marca", texto: "Salvando…" }
    : erro
      ? { cor: "text-red-600 dark:text-red-300", texto: `Não salvou: ${erro}` }
      : alterada
        ? { cor: "text-amber-700 dark:text-amber-300", texto: "● Alterações ainda não salvas" }
        : salvoAs
          ? { cor: "text-emerald-700 dark:text-emerald-300", texto: `✔ Salvo às ${hora(salvoAs)}` }
          : { cor: "text-suave", texto: "Ficha ainda não preenchida" };

  return (
    <form
      ref={form}
      action={acao}
      className="space-y-4"
      onSubmit={(e) => {
        if (faltando.length && !confirmouIncompleta.current) {
          e.preventDefault();
          modalFalta.abrir();
          return;
        }
        confirmouIncompleta.current = false;
        try {
          localStorage.removeItem(chaveRascunho);
        } catch {}
      }}
    >
      <Ocultos valores={{ equipe_id: equipeId, rubrica: rubrica.id, equipe_nome: equipeNome, voltar: voltarAoSalvar ? "1" : "0" }} />
      {rubrica.criterios.map((c) => (
        <input key={c.id} type="hidden" name={`c-${c.id}`} value={notas[c.id] ?? ""} />
      ))}

      {rascunho && (
        <Aviso
          tom="alerta"
          titulo="Você tem um rascunho não salvo desta ficha"
          acao={
            <>
              <Botao
                tamanho="pequeno"
                onClick={() => {
                  setNotas(rascunho.notas);
                  setComentario(rascunho.comentario);
                  setRascunho(null);
                }}
              >
                Continuar de onde parei
              </Botao>
              <Botao
                variante="secundario"
                tamanho="pequeno"
                onClick={() => {
                  setRascunho(null);
                  try {
                    localStorage.removeItem(chaveRascunho);
                  } catch {}
                }}
              >
                Descartar
              </Botao>
            </>
          }
        >
          Feito às {hora(rascunho.em)}, mas não foi salvo.
        </Aviso>
      )}

      {!bloqueada && (
        <p className="hidden text-xs text-suave sm:block">
          Atalhos: <kbd className="rounded border border-borda px-1 font-mono">1</kbd>–<kbd className="rounded border border-borda px-1 font-mono">4</kbd> marcam o
          nível do critério selecionado · <kbd className="rounded border border-borda px-1 font-mono">↑</kbd>
          <kbd className="rounded border border-borda px-1 font-mono">↓</kbd> mudam de critério ·{" "}
          <kbd className="rounded border border-borda px-1 font-mono">Ctrl S</kbd> salva
        </p>
      )}

      <fieldset disabled={bloqueada || salvando} className="m-0 min-w-0 space-y-4 border-0 p-0 sm:space-y-5">
        {rubrica.criterios.map((c, i) => (
          <Criterio
            key={c.id}
            c={c}
            niveis={NIVEIS}
            valor={notas[c.id]}
            ativo={i === ativo && !bloqueada}
            destacar={destacarFaltando && typeof notas[c.id] !== "number"}
            selecionar={() => setAtivo(i)}
            marcar={(f) => {
              setAtivo(i);
              marcar(c.id, f);
            }}
            limpar={() => limpar(c.id)}
          />
        ))}

        <section className="card space-y-2">
          <label className="block">
            <span className="rotulo">
              Comentário para a equipe <span className="font-normal text-suave">(opcional)</span>
            </span>
            <textarea
              name="comentario"
              rows={3}
              maxLength={2000}
              value={comentario}
              onChange={(e) => {
                setErro(null);
                setComentario(e.target.value);
              }}
              placeholder="Pontos fortes e o que melhorar"
              className="campo"
            />
          </label>
        </section>
      </fieldset>

      {/* ------------------------------------------------ barra fixa: nota, estado e ações */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-10 sm:bottom-3">
        <div className="destaque-grad flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl p-3 sm:p-4">
          <div className="mr-auto min-w-0">
            <p className="truncate text-xs text-suave">
              {equipeNome} · {rubrica.curto}
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
              <span className="grad-text">{fmtNota(total)}</span>
              <span className="text-sm font-normal text-suave"> / 100</span>
              <span className="ml-2 text-xs font-normal text-suave">
                {rubrica.criterios.length - faltando.length} de {rubrica.criterios.length} critérios
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
                <Botao variante="secundario" icone="desfazer" onClick={desfazer} disabled={salvando}>
                  Desfazer alterações
                </Botao>
              )}
              <Botao type="submit" disabled={!alterada || salvando}>
                {salvando && <Girando />}
                {salvando ? "Salvando…" : alterada ? "Salvar ficha" : "Salvo"}
              </Botao>
            </div>
          )}
        </div>
      </div>

      <Modal
        refModal={modalFalta.ref}
        titulo={`Faltam ${faltando.length} critério(s)`}
        largura="sm"
        rodape={
          <>
            <Botao
              variante="secundario"
              onClick={() => {
                confirmouIncompleta.current = true;
                modalFalta.fechar();
                form.current?.requestSubmit();
              }}
            >
              Salvar assim mesmo
            </Botao>
            <Botao onClick={irParaFaltando} autoFocus>
              Voltar e completar
            </Botao>
          </>
        }
      >
        <p className="text-sm text-suave">
          Critério sem nível conta <strong className="text-foreground">0</strong> na nota desta ficha:
        </p>
        <ul className="list-disc space-y-0.5 pl-5 text-sm">
          {faltando.map((c) => (
            <li key={c.id}>
              {c.nome} <span className="text-suave">(peso {c.peso})</span>
            </li>
          ))}
        </ul>
      </Modal>
    </form>
  );
}

/** Um critério: os 4 níveis como botões com nome, % e a descrição do nível. */
function Criterio({
  c,
  niveis: NIVEIS,
  valor,
  ativo,
  destacar,
  selecionar,
  marcar,
  limpar,
}: {
  c: Rubrica["criterios"][number];
  niveis: Nivel[];
  valor: number | undefined;
  ativo: boolean;
  destacar: boolean;
  selecionar: () => void;
  marcar: (f: number) => void;
  limpar: () => void;
}) {
  return (
    <section
      id={`crit-${c.id}`}
      onClick={selecionar}
      className={`card scroll-mt-24 space-y-3 transition ${destacar ? "ring-2 ring-amber-400" : ativo ? "ring-1 ring-[var(--marca)]/60" : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">
          {c.nome} <span className="text-xs font-normal text-suave">· peso {c.peso}</span>
        </h3>
        <span className="flex items-center gap-2 text-sm">
          <span className="font-mono text-suave tabular-nums">
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
      {CRITERIOS_COM_PERGUNTAS.has(c.id) && <PerguntasDesafio />}

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
                <span className="flex items-center gap-1.5 font-mono text-xs text-suave">
                  {Math.round(n.fator * 100)}%
                  {ativo && <kbd className="hidden rounded border border-borda px-1 sm:inline">{k + 1}</kbd>}
                </span>
              </span>
              <span className="text-xs [overflow-wrap:anywhere] text-suave">{c.niveis[k]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
