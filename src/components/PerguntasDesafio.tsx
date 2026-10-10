"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PERGUNTAS } from "@/lib/perguntas";

/**
 * Link "Ver perguntas do desafio" + modal com P1–P5 e B1–B2.
 * O gatilho é um <a> e o modal vai para o <body> (portal) porque a ficha fica dentro de um
 * <fieldset disabled> quando está bloqueada ou salvando, e botões ali dentro ficariam inativos.
 */
export function PerguntasDesafio() {
  const [aberto, setAberto] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (aberto) modal.current?.showModal();
  }, [aberto]);

  return (
    <>
      <a
        href="#perguntas"
        role="button"
        onClick={(e) => {
          e.preventDefault();
          setAberto(true);
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-marca underline-offset-2 hover:underline"
      >
        📋 Ver perguntas do desafio
      </a>

      {aberto &&
        createPortal(
          <dialog
            ref={modal}
            onClose={() => setAberto(false)}
            onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
            className="m-auto max-h-[92dvh] w-[min(96vw,48rem)] overflow-y-auto bg-transparent p-0 text-foreground backdrop:bg-[#000b38]/70 backdrop:backdrop-blur-sm open:animate-[dh-sobe_.25s_both]"
          >
            <div className="destaque-grad faixa-topo space-y-4 rounded-2xl p-4 text-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="mr-auto">
                  <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
                    Rota do Diploma · dashboard
                  </p>
                  <h2 className="text-2xl font-extrabold">
                    Perguntas do <span className="grad-text">desafio</span>
                  </h2>
                  <p className="text-xs text-suave">5 obrigatórias (P1–P5) e 2 bônus (B1–B2).</p>
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

              <ol className="space-y-3">
                {PERGUNTAS.map((p) => (
                  <li key={p.id} className="space-y-2 rounded-xl border border-borda bg-superficie p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold">
                        <span className="grad-text">{p.id}</span>
                      </span>
                      <span
                        className={`selo ${
                          p.obrigatoria
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                            : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {p.obrigatoria ? "● Obrigatória" : "◇ Bônus"}
                      </span>
                    </div>
                    <h3 className="font-bold">{p.titulo}</h3>
                    <p className="text-suave">{p.texto}</p>
                    <p className="text-xs">
                      <span className="font-semibold">Bases:</span> <span className="text-suave">{p.bases}</span>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {p.colunas.map((c) => (
                        <code key={c} className="rounded-md border border-borda px-1.5 py-0.5 font-mono text-[11px]">
                          {c}
                        </code>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="flex justify-end">
                <button type="button" onClick={() => modal.current?.close()} className="btn-primario">
                  Fechar
                </button>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
