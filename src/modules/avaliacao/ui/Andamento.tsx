import type { Andamento as TipoAndamento } from "@/modules/avaliacao/domain/consolidacao";

/** Quantas equipes já têm ficha completa em cada rubrica (o que ainda falta avaliar). */
export function Andamento({ itens }: { itens: TipoAndamento[] }) {
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Andamento das fichas</h2>
        <p className="text-sm text-suave">Equipes com pelo menos uma ficha completa em cada rubrica.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((a) => {
          const pct = a.total ? Math.round((a.completas / a.total) * 100) : 0;
          const pronta = a.total > 0 && a.completas === a.total;
          return (
            <li key={a.rubrica} className="space-y-2 rounded-xl border border-borda p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{a.curto}</p>
                <p className="font-mono text-sm tabular-nums">
                  {a.completas}/{a.total}
                </p>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-borda"
                role="progressbar"
                aria-valuenow={a.completas}
                aria-valuemin={0}
                aria-valuemax={a.total}
                aria-label={`${a.curto}: ${a.completas} de ${a.total} equipes`}
              >
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pronta ? "var(--verde)" : "var(--grad)" }} />
              </div>
              <p className="text-xs text-suave">
                {a.bancaTexto} · {a.avaliadores} avaliador(es)
                {a.incompletas ? ` · ${a.incompletas} incompleta(s)` : ""}
                {pronta && " · ✔ pronta"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
