"use client";

import { useState } from "react";
import type { Topico } from "@/app/ajuda/conteudo";
import { casaBusca } from "@/shared/lib/texto";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { Icone } from "@/shared/ui/Icone";

/** Perguntas frequentes com busca (sem acento e sem diferenciar maiúsculas). */
export function BuscaAjuda({ topicos }: { topicos: Topico[] }) {
  const [busca, setBusca] = useState("");
  const lista = topicos.filter((t) => !busca || casaBusca(`${t.pergunta} ${t.resposta}`, busca));

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar na ajuda</span>
        <Icone nome="busca" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar: troca, senha, nota, repositório…"
          className="campo pl-9"
          autoFocus
        />
      </label>
      {lista.length === 0 ? (
        <EstadoVazio icone="ajuda" titulo="Nada encontrado">
          Tente outra palavra ou fale com a organização do evento.
        </EstadoVazio>
      ) : (
        <ul className="space-y-2">
          {lista.map((t) => (
            <li key={t.pergunta}>
              <details className="card group p-4!" open={!!busca}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold select-none">
                  {t.pergunta}
                  <Icone nome="avancar" className="size-4 shrink-0 transition group-open:rotate-90" />
                </summary>
                <p className="mt-2 text-sm text-suave">{t.resposta}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
