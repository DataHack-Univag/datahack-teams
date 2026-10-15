"use client";

import { useState } from "react";
import { Icone } from "@/shared/ui/Icone";

/** Link da página pública de inscrição, com copiar e abrir (heurística 7: atalho para divulgar). */
export function CopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold">Página de inscrição:</span>
      <code className="min-w-0 flex-1 truncate rounded-lg bg-marca-fundo px-2 py-1 text-xs">{link}</code>
      <button
        type="button"
        className="btn-secundario min-h-9 px-3 text-xs"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            setCopiado(false);
          }
        }}
      >
        <Icone nome={copiado ? "ok" : "copiar"} className="size-4" /> {copiado ? "Copiado" : "Copiar"}
      </button>
      <a href={link} target="_blank" rel="noopener" className="btn-secundario min-h-9 px-3 text-xs">
        <Icone nome="link" className="size-4" /> Abrir
      </a>
    </div>
  );
}
