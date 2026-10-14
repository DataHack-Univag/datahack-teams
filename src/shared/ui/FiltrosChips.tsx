"use client";

/** Um filtro da lista: rótulo, quantos itens ele mostra e se está escolhido. */
export type OpcaoFiltro = { id: string; rotulo: string; n: number };

/**
 * Fileira de filtros em chips com a contagem de cada um (Pessoas, Presença).
 * O chip escolhido fica marcado com aria-pressed (heurística 1).
 */
export function FiltrosChips({ opcoes, ativo, aoEscolher }: { opcoes: OpcaoFiltro[]; ativo: string; aoEscolher: (id: string) => void }) {
  return (
    <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-1.5">
      {opcoes.map((f) => {
        const atual = f.id === ativo;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={atual}
            onClick={() => aoEscolher(f.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              atual ? "border-transparent text-white [background:var(--grad)]" : "border-borda-forte bg-superficie-solida text-suave hover:text-foreground"
            }`}
          >
            {f.rotulo}
            <span className={`rounded-full px-1.5 tabular-nums ${atual ? "bg-white/20" : "bg-marca-fundo"}`}>{f.n}</span>
          </button>
        );
      })}
    </div>
  );
}
