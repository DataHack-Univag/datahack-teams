"use client";

import { useCallback, useRef, type ReactNode, type RefObject } from "react";
import { Icone } from "@/shared/ui/Icone";

/** Abre/fecha um <Modal>. */
export function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  const abrir = useCallback(() => ref.current?.showModal(), []);
  const fechar = useCallback(() => ref.current?.close(), []);
  return { ref, abrir, fechar };
}

/**
 * Janela modal do sistema (dialog nativo): Esc, clique fora e o "X" sempre fecham
 * (heurística 3: saída de emergência clara).
 */
export function Modal({
  refModal,
  titulo,
  subtitulo,
  children,
  rodape,
  largura = "md",
  aoFechar,
  destaque = true,
}: {
  refModal: RefObject<HTMLDialogElement | null>;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  children?: ReactNode;
  rodape?: ReactNode;
  largura?: "sm" | "md" | "lg" | "xl";
  aoFechar?: () => void;
  destaque?: boolean;
}) {
  const w = { sm: "26rem", md: "34rem", lg: "56rem", xl: "68rem" }[largura];
  return (
    <dialog
      ref={refModal}
      onClose={aoFechar}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      style={{ width: `min(96vw, ${w})` }}
      className="m-auto max-h-[92dvh] overflow-y-auto bg-transparent p-0 text-foreground backdrop:bg-[var(--veu)] backdrop:backdrop-blur-sm open:animate-[dh-sobe_.25s_both]"
    >
      <div className={`${destaque ? "destaque-grad" : "border border-borda bg-superficie-solida"} faixa-topo space-y-4 rounded-2xl p-4 sm:p-6`}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold [overflow-wrap:anywhere]">{titulo}</h2>
            {subtitulo && <p className="text-sm text-suave">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={() => refModal.current?.close()}
            className="btn-secundario size-9 min-h-9 shrink-0 p-0"
            aria-label="Fechar (Esc)"
            title="Fechar (Esc)"
          >
            <Icone nome="fechar" className="size-4" />
          </button>
        </div>
        {children}
        {rodape && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{rodape}</div>}
      </div>
    </dialog>
  );
}
