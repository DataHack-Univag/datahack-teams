"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Resultado } from "@/lib/tipos";

type Acao = (estado: Resultado, fd: FormData) => Promise<Resultado>;

/**
 * Formulário ligado a uma Server Action: desabilita os campos enquanto envia
 * e mostra a mensagem de sucesso/erro devolvida pela action.
 */
export function Formulario({
  action,
  children,
  className,
  confirmar,
}: {
  action: Acao;
  children: React.ReactNode;
  className?: string;
  /** Se informado, pede confirmação antes de enviar. */
  confirmar?: string;
}) {
  const [estado, formAction, pendente] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      <fieldset disabled={pendente} className="contents">
        {children}
      </fieldset>
      <Mensagem estado={estado} />
    </form>
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
