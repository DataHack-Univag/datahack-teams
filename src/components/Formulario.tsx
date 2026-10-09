"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { Resultado } from "@/lib/tipos";

type Acao = (estado: Resultado, fd: FormData) => Promise<Resultado>;

// Ações destrutivas ganham o botão vermelho no modal de confirmação.
const DESTRUTIVA = /^(remover|excluir|apagar|tirar)/i;

/**
 * Formulário ligado a uma Server Action: desabilita os campos enquanto envia
 * e mostra a mensagem de sucesso/erro devolvida pela action.
 * Com `confirmar`, abre um modal do DATAHack antes de enviar (no lugar do confirm do navegador).
 */
export function Formulario({
  action,
  children,
  className,
  confirmar,
  rotuloConfirmar = "Confirmar",
}: {
  action: Acao;
  children: React.ReactNode;
  className?: string;
  /** Se informado, pede confirmação antes de enviar. */
  confirmar?: string;
  /** Texto do botão de confirmação no modal. */
  rotuloConfirmar?: string;
}) {
  const [estado, formAction, pendente] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const confirmado = useRef(false);
  const perigo = !!confirmar && DESTRUTIVA.test(confirmar);

  function confirmarEnvio() {
    confirmado.current = true;
    modalRef.current?.close();
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={className}
        onSubmit={(e) => {
          if (confirmar && !confirmado.current) {
            e.preventDefault();
            modalRef.current?.showModal();
            return;
          }
          confirmado.current = false;
        }}
      >
        <fieldset disabled={pendente} className="contents">
          {children}
        </fieldset>
        <Mensagem estado={estado} />
      </form>

      {confirmar && (
        <dialog
          ref={modalRef}
          // Clique fora do cartão fecha o modal.
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
          className="m-auto w-[min(92vw,26rem)] bg-transparent p-0 text-foreground backdrop:bg-[#000b38]/60 backdrop:backdrop-blur-sm open:animate-[dh-sobe_.25s_both]"
        >
          <div className="destaque-grad faixa-topo space-y-5 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
                  perigo ? "bg-red-500" : ""
                }`}
                style={perigo ? undefined : { background: "var(--grad)" }}
              >
                {perigo ? "!" : "★"}
              </span>
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-bold">{perigo ? "Tem certeza?" : "Confirmar"}</h2>
                <p className="text-sm [overflow-wrap:anywhere] text-suave">{confirmar}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => modalRef.current?.close()} className="btn-secundario" autoFocus>
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEnvio}
                className={perigo ? "btn border-0 bg-red-600 text-white hover:bg-red-500" : "btn-primario"}
              >
                {perigo ? rotuloConfirmar.replace(/^Confirmar$/, "Sim, confirmar") : rotuloConfirmar}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

export function Mensagem({ estado }: { estado: Resultado }) {
  if (!estado?.erro && !estado?.ok) return null;
  return (
    <p
      role="status"
      className={`basis-full text-sm ${estado.erro ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
    >
      {estado.erro ?? estado.ok}
    </p>
  );
}

export function BotaoEnviar({
  children,
  className = "btn-primario",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} title={title} aria-label={title}>
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
