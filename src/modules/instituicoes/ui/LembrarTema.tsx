"use client";

import { useEffect } from "react";
import { COOKIE_COR, cssDoTema, temaDaCor } from "@/modules/instituicoes/domain/tema";

/**
 * Guarda a cor da edição num cookie e atualiza o tema do layout raiz. Assim tudo o que aparece
 * antes da tela carregar (carregamentos, erro, página não encontrada) já sai na cor da edição,
 * e a troca de edição muda a cor na hora (fundo animado e barra do navegador inclusive).
 */
export function LembrarTema({ cor }: { cor: string | null }) {
  useEffect(() => {
    const tema = temaDaCor(cor);
    document.cookie = tema ? `${COOKIE_COR}=${encodeURIComponent(cor!)}; path=/; max-age=31536000; samesite=lax` : `${COOKIE_COR}=; path=/; max-age=0; samesite=lax`;
    const base = document.getElementById("tema-edicao-base");
    const css = tema ? cssDoTema(tema) : "";
    if (base && base.textContent !== css) base.textContent = css;
    const escuro = document.documentElement.dataset.theme !== "light";
    const barra = tema ? (escuro ? tema.escuro : tema.claro)["--background"] : escuro ? "#000b38" : "#f4f7ff";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", barra);
    // A rede animada do fundo lê a cor de novo.
    dispatchEvent(new Event("dh-tema"));
  }, [cor]);
  return null;
}
