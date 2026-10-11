"use client";

import { useOffline } from "next/offline";
import { Icone } from "@/shared/ui/Icone";

/**
 * Faixa fixa quando a internet cai (comum no Wi-Fi do laboratório). O Next guarda as
 * ações e tenta de novo sozinho quando a conexão volta.
 */
export function AvisoOffline() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-40 bg-amber-400 text-amber-950">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm font-semibold">
        <Icone nome="alerta" className="size-4" />
        Sem conexão com a internet. O que você fizer agora será enviado assim que a conexão voltar.
      </p>
    </div>
  );
}
