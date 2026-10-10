"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Atualiza os dados da tela de tempos em tempos (ex.: chegou um pedido de troca),
 * sem recarregar a página. Não atualiza enquanto a pessoa digita ou está num modal.
 */
export function AutoAtualizar({ segundos = 30 }: { segundos?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const ativo = document.activeElement;
      if (ativo && ["INPUT", "TEXTAREA", "SELECT"].includes(ativo.tagName)) return;
      if (document.querySelector("dialog[open]")) return;
      router.refresh();
    }, segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);

  return null;
}
