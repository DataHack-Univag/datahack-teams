"use client";

import Link from "next/link";
import { Botao } from "@/shared/ui/Botao";
import { Icone } from "@/shared/ui/Icone";

// Tela de erro (heurística 9): diz o que houve em linguagem simples e o que fazer;
// o detalhe técnico fica recolhido para quem precisar repassar à organização.
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-700 dark:text-red-300">
            <Icone nome="erro" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Não conseguimos abrir esta tela</h1>
            <p className="text-sm text-suave">Pode ser a conexão ou uma falha momentânea. Seus dados salvos não foram perdidos.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao onClick={reset} icone="desfazer">
            Tentar de novo
          </Botao>
          <Link href="/" className="btn-secundario">
            Ir para o início
          </Link>
        </div>
        <details className="text-xs text-suave">
          <summary className="cursor-pointer select-none">Detalhe técnico (para a organização)</summary>
          <p className="mt-2 rounded-xl bg-marca-fundo p-3 font-mono break-words">
            {error.message || "Erro inesperado."}
            {error.digest && <span className="mt-1 block opacity-70">código: {error.digest}</span>}
          </p>
        </details>
      </div>
    </main>
  );
}
