"use client";

import { useActionState, useEffect, useRef, startTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { Acao } from "@/shared/acao/acao";
import { Botao, Girando, type Tamanho, type Variante } from "@/shared/ui/Botao";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";
import { Modal, useModal } from "@/shared/ui/Modal";
import { useToast } from "@/shared/ui/Toast";

/**
 * Formulário ligado a uma Server Action (o padrão de todas as telas, heurística 4):
 *  - trava os campos enquanto envia e mostra "enviando" no botão (heurística 1);
 *  - sucesso vira aviso rápido; com `desfazer`, o aviso traz o botão Desfazer (heurística 3);
 *  - erro fica logo abaixo do formulário, em texto claro (heurística 9);
 *  - `confirmar` pede confirmação num modal antes de ações que mudam muita coisa (heurística 5).
 */
export function Formulario({
  action,
  children,
  className,
  confirmar,
  tituloConfirmar,
  rotuloConfirmar = "Confirmar",
  perigo,
  acaoDesfazer,
  mensagemNoLugar = false,
  aoSucesso,
}: {
  action: Acao;
  children: ReactNode;
  className?: string;
  /** Texto do modal de confirmação (sem ele, envia direto). */
  confirmar?: ReactNode;
  tituloConfirmar?: string;
  rotuloConfirmar?: string;
  /** Ação destrutiva: botão vermelho no modal. Padrão: deduz pelo rótulo. */
  perigo?: boolean;
  /** Ação que desfaz esta (recebe os campos de `resultado.desfazer`). */
  acaoDesfazer?: Acao;
  /** Mostra o sucesso como texto abaixo do formulário em vez de aviso flutuante. */
  mensagemNoLugar?: boolean;
  aoSucesso?: () => void;
}) {
  const [estado, formAction, pendente] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const modal = useModal();
  const confirmado = useRef(false);
  const toast = useToast();
  const destrutiva = perigo ?? /^(remover|excluir|apagar|tirar|retirar|encerrar)/i.test(rotuloConfirmar);

  // Avisa o sucesso uma vez por resposta.
  const ultimo = useRef(estado);
  useEffect(() => {
    if (estado === ultimo.current) return;
    ultimo.current = estado;
    if (!estado?.ok) return;
    aoSucesso?.();
    if (mensagemNoLugar) return;
    const dados = estado.desfazer;
    toast(estado.ok, {
      acao:
        acaoDesfazer && dados
          ? {
              rotulo: "Desfazer",
              executar: async () => {
                const fd = new FormData();
                Object.entries(dados).forEach(([k, v]) => fd.set(k, v));
                const r = await acaoDesfazer(null, fd);
                toast(r?.erro ?? "Desfeito.", { tom: r?.erro ? "erro" : "sucesso" });
              },
            }
          : undefined,
    });
  }, [estado, toast, acaoDesfazer, mensagemNoLugar, aoSucesso]);

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={className}
        onSubmit={(e) => {
          if (confirmar && !confirmado.current) {
            e.preventDefault();
            modal.abrir();
            return;
          }
          confirmado.current = false;
        }}
      >
        <fieldset disabled={pendente} className="contents">
          {children}
        </fieldset>
        {estado?.erro && (
          <p role="alert" className="flex basis-full items-start gap-1.5 text-sm font-medium text-red-600 dark:text-red-300">
            <Icone nome="erro" className="mt-0.5 size-4" />
            {estado.erro}
          </p>
        )}
        {mensagemNoLugar && estado?.ok && (
          <p role="status" className="flex basis-full items-start gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <Icone nome="ok" className="mt-0.5 size-4" />
            {estado.ok}
          </p>
        )}
      </form>

      {confirmar && (
        <Modal
          refModal={modal.ref}
          titulo={tituloConfirmar ?? (destrutiva ? "Tem certeza?" : "Confirmar")}
          largura="sm"
          rodape={
            <>
              <Botao variante="secundario" onClick={modal.fechar} autoFocus>
                Cancelar
              </Botao>
              <Botao
                variante={destrutiva ? "perigoSolido" : "primario"}
                onClick={() => {
                  confirmado.current = true;
                  modal.fechar();
                  startTransition(() => formRef.current?.requestSubmit());
                }}
              >
                {rotuloConfirmar}
              </Botao>
            </>
          }
        >
          <div className="text-sm [overflow-wrap:anywhere] text-suave">{confirmar}</div>
        </Modal>
      )}
    </>
  );
}

/** Botão de envio: mostra que está enviando e não deixa clicar duas vezes. */
export function BotaoEnviar({
  children,
  variante = "primario",
  tamanho,
  icone,
  className,
  title,
  enviando,
  desativado = false,
}: {
  children: ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: NomeIcone;
  className?: string;
  title?: string;
  /** Texto enquanto envia (padrão: o mesmo). */
  enviando?: string;
  /** Nada a enviar ainda (ex.: sem mudanças). */
  desativado?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante={variante} tamanho={tamanho} icone={pending ? undefined : icone} className={className} disabled={pending || desativado} title={title} aria-label={title}>
      {pending && <Girando />}
      {pending && enviando ? enviando : children}
    </Botao>
  );
}

/** Campos ocultos a partir de um objeto. */
export function Ocultos({ valores }: { valores: Record<string, string | null | undefined> }) {
  return (
    <>
      {Object.entries(valores).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v ?? ""} />
      ))}
    </>
  );
}
