"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Botao } from "@/shared/ui/Botao";
import { Icone } from "@/shared/ui/Icone";
import { Modal, useModal } from "@/shared/ui/Modal";

/**
 * Ajuda da própria tela (heurística 10): explica, em passos curtos, o que se faz aqui.
 * Fica no topo da página; a ajuda completa (com busca) está em /ajuda.
 */
export function BotaoAjuda({ titulo, children, linkAjuda = "/ajuda" }: { titulo: string; children: ReactNode; linkAjuda?: string }) {
  const m = useModal();
  return (
    <>
      <Botao variante="secundario" tamanho="pequeno" icone="ajuda" onClick={m.abrir} aria-label={`Ajuda: ${titulo}`}>
        Ajuda
      </Botao>
      <Modal
        refModal={m.ref}
        titulo={titulo}
        largura="md"
        rodape={
          <>
            <Link href={linkAjuda} className="btn-secundario">
              Ver toda a ajuda
            </Link>
            <Botao onClick={m.fechar}>Entendi</Botao>
          </>
        }
      >
        <div className="space-y-3 text-sm text-suave [&_b]:text-foreground [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </Modal>
    </>
  );
}

/**
 * Dica de boas-vindas que aparece só na primeira visita de cada papel e pode ser fechada
 * (heurística 10, sem atrapalhar quem já sabe usar).
 */
export function BoasVindas({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  const chave = `dh-boas-vindas-${id}`;
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(chave)) setVisivel(true);
    } catch {}
  }, [chave]);
  if (!visivel) return null;
  function fechar() {
    setVisivel(false);
    try {
      localStorage.setItem(chave, "1");
    } catch {}
  }
  return (
    <section className="destaque-grad faixa-topo flex flex-wrap items-start gap-3 rounded-2xl p-4" style={{ animation: "dh-sobe .4s both" }}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "var(--grad)" }}>
        <Icone nome="estrela" />
      </span>
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="text-base font-bold">{titulo}</p>
        <div className="text-suave [&_strong]:text-foreground">{children}</div>
      </div>
      <Botao variante="secundario" tamanho="pequeno" onClick={fechar}>
        Entendi, fechar
      </Botao>
    </section>
  );
}
