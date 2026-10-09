"use client";

// Tela de erro: mostra a mensagem (ex.: migração SQL faltando) em vez de uma página quebrada.
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg space-y-4">
        <h1 className="text-xl font-bold">Algo deu errado</h1>
        <p className="rounded-xl bg-red-500/15 p-3 text-sm break-words text-red-700 dark:text-red-300">
          {error.message || "Erro inesperado."}
          {error.digest && <span className="mt-1 block font-mono text-xs opacity-70">código: {error.digest}</span>}
        </p>
        <button onClick={reset} className="btn-primario">
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
