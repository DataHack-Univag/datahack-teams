"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Termo de uso dos dados numa caixa com rolagem: o "Li e aceito" só libera depois que a
 * pessoa rolar o texto até o fim (heurística 5: evita aceitar sem ler). Texto curto, que
 * cabe inteiro na caixa, já libera. Dá para rolar pelo teclado (a caixa recebe foco).
 */
export function LeituraTermo({
  versao,
  texto,
  aceito,
  aoAceitar,
  mostrarErro,
}: {
  versao: number;
  texto: string;
  aceito: boolean;
  aoAceitar: (v: boolean) => void;
  mostrarErro: boolean;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [leu, setLeu] = useState(false);

  // Chegou ao fim (com folga de alguns pixels por causa do arredondamento do zoom).
  const conferir = () => {
    const c = caixa.current;
    if (c && c.scrollTop + c.clientHeight >= c.scrollHeight - 8) setLeu(true);
  };
  useEffect(conferir, [texto]);

  return (
    <fieldset className="space-y-2 rounded-xl border border-borda p-3">
      <legend className="px-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Uso dos seus dados</legend>
      <p className="text-sm font-semibold">Termo de uso dos dados (versão {versao})</p>
      <div
        ref={caixa}
        onScroll={conferir}
        tabIndex={0}
        role="region"
        aria-label="Texto do termo de uso dos dados"
        className="max-h-64 overflow-y-auto rounded-lg border border-borda bg-superficie p-3 text-sm whitespace-pre-line text-suave focus-visible:outline-2 focus-visible:outline-[var(--marca)]"
      >
        {texto}
      </div>
      {!leu && (
        <p className="text-xs text-suave" aria-live="polite">
          Role o termo até o fim para poder aceitar.
        </p>
      )}
      <label className={`flex items-start gap-3 text-sm ${leu ? "" : "opacity-60"}`}>
        <input
          type="checkbox"
          checked={aceito}
          disabled={!leu}
          onChange={(e) => aoAceitar(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]"
        />
        <span>Li e aceito o termo de uso dos dados.</span>
      </label>
      {mostrarErro && !aceito && (
        <span role="alert" className="block text-xs font-medium text-red-600 dark:text-red-400">
          {leu ? "Marque para continuar." : "Leia o termo até o fim e marque que aceita para continuar."}
        </span>
      )}
    </fieldset>
  );
}
