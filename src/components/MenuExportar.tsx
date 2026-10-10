"use client";

import { useEffect, useRef } from "react";

const OPCOES = [
  {
    tipo: "analitico",
    titulo: "Tabela analítica",
    texto: "Uma linha por equipe com todas as fases, rubricas e critérios em números.",
  },
  {
    tipo: "brutos",
    titulo: "Dados brutos (backup)",
    texto: "Uma linha por critério de cada ficha. Dá para recalcular tudo a partir dela.",
  },
  { tipo: "", titulo: "Ranking", texto: "Posição, média de cada rubrica, penalidades e nota final." },
  { tipo: "fichas", titulo: "Notas por avaliador", texto: "Uma linha por ficha, com os níveis por extenso." },
];

/** Botão "Exportar" que abre um menu com as opções de CSV (fecha ao clicar fora ou com Esc). */
export function MenuExportar() {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const fechar = (e: Event) => {
      const el = menu.current;
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

  return (
    <details ref={menu} className="group relative open:max-sm:w-full open:max-sm:basis-full">
      <summary className="btn-secundario cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        ⬇ Exportar <span className="text-xs transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="destaque-grad z-30 mt-2 space-y-1 rounded-2xl p-2 shadow-lg max-sm:w-full sm:absolute sm:right-0 sm:w-80">
        <p className="px-2 pt-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
          Opções de exportação · CSV
        </p>
        {OPCOES.map((o) => (
          <a
            key={o.titulo}
            href={`/admin/avaliacao/exportar${o.tipo ? `?tipo=${o.tipo}` : ""}`}
            onClick={() => menu.current && (menu.current.open = false)}
            className="block rounded-xl p-2 hover:bg-superficie"
          >
            <span className="block text-sm font-semibold">{o.titulo}</span>
            <span className="block text-xs text-suave">{o.texto}</span>
          </a>
        ))}
      </div>
    </details>
  );
}
