"use client";

import { useSyncExternalStore } from "react";

// Tema claro/escuro do sistema todo: <html data-theme>, salvo no navegador ("dh-theme").

function lerTema(): "dark" | "light" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function assinar(cb: () => void) {
  addEventListener("dh-tema", cb);
  return () => removeEventListener("dh-tema", cb);
}

export function alternarTema() {
  const prox = lerTema() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = prox;
  try {
    localStorage.setItem("dh-theme", prox);
  } catch {}
  dispatchEvent(new Event("dh-tema"));
}

export function BotaoTema({ className = "" }: { className?: string }) {
  const tema = useSyncExternalStore(assinar, lerTema, () => "dark" as const);
  const escuro = tema === "dark";

  return (
    <button
      type="button"
      onClick={alternarTema}
      className={className}
      title={escuro ? "Usar tema claro" : "Usar tema escuro"}
      aria-label="Alternar tema claro/escuro"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        {escuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}
