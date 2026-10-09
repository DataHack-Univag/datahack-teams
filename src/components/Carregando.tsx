// Esqueleto exibido na hora em que se navega, enquanto os dados chegam do banco.
export function Carregando({ cards = 3 }: { cards?: number }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:py-8" role="status" aria-label="Carregando">
      <div className="h-9 w-56 animate-pulse rounded-xl bg-marca-fundo" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="card faixa-topo space-y-3">
            <div className="h-5 w-2/3 animate-pulse rounded-lg bg-marca-fundo" />
            <div className="h-4 w-full animate-pulse rounded-lg bg-marca-fundo" />
            <div className="h-4 w-4/5 animate-pulse rounded-lg bg-marca-fundo" />
          </div>
        ))}
      </div>
    </div>
  );
}
