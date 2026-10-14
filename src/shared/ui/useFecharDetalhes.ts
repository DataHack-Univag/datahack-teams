"use client";

import { useEffect, useRef } from "react";

/**
 * Painel <details> que fecha ao clicar fora ou com Esc (menu "Mais", seletor de edição).
 * Devolve a ref do <details> e uma função para fechar depois de escolher uma opção.
 */
export function useFecharDetalhes() {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const fechar = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("click", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("click", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, []);

  return { ref, fechar: () => ref.current && (ref.current.open = false) };
}
