"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Aviso temporário ("toast") no canto da tela; some sozinho em alguns segundos. */
export function Toast({ texto, aoFechar, segundos = 4 }: { texto: string; aoFechar: () => void; segundos?: number }) {
  useEffect(() => {
    const t = setTimeout(aoFechar, segundos * 1000);
    return () => clearTimeout(t);
  }, [aoFechar, segundos]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-md sm:inset-x-auto sm:right-4 sm:bottom-auto sm:top-20"
      style={{ animation: "dh-sobe .3s both" }}
    >
      <div className="destaque-grad flex items-center gap-3 rounded-2xl p-3 shadow-lg sm:p-4">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white"
        >
          ✔
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere]">{texto}</p>
        <button type="button" onClick={aoFechar} className="text-suave hover:text-foreground" aria-label="Fechar aviso">
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * Mostra o toast vindo de outra tela via ?salvo=... (ex.: depois de salvar a ficha e
 * voltar para a lista de grupos) e limpa o parâmetro da URL.
 */
export function ToastDaUrl() {
  const params = useSearchParams();
  const router = useRouter();
  const caminho = usePathname();
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    const salvo = params.get("salvo");
    if (!salvo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTexto(`Ficha salva: ${salvo}`);
    const resto = new URLSearchParams(params);
    resto.delete("salvo");
    router.replace(resto.size ? `${caminho}?${resto}` : caminho, { scroll: false });
  }, [params, router, caminho]);

  return texto ? <Toast texto={texto} aoFechar={() => setTexto(null)} /> : null;
}
