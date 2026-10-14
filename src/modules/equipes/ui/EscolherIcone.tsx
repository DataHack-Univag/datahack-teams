"use client";

import { definirIcone } from "@/modules/equipes/application/actions";
import { ICONES_EQUIPE } from "@/modules/equipes/domain/tipos";
import { Formulario, Ocultos } from "@/shared/ui/Formulario";

/** Escolha do ícone: um toque grava (o ícone aparece no mapa do evento e nos cards). */
export function EscolherIcone({ equipe }: { equipe: { id: string; icone: string | null } }) {
  return (
    <details className="group rounded-xl border border-borda p-3">
      <summary className="cursor-pointer text-sm font-semibold select-none">
        {equipe.icone ? `Trocar o ícone (${equipe.icone})` : "Escolher um ícone para a equipe"}
      </summary>
      <p className="mt-1 text-xs text-suave">É o símbolo da equipe no mapa do evento.</p>
      <Formulario action={definirIcone} className="mt-2">
        <Ocultos valores={{ id: equipe.id }} />
        <div role="radiogroup" aria-label="Ícone da equipe" className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
          {ICONES_EQUIPE.map((i) => (
            <button
              key={i}
              type="submit"
              name="icone"
              value={i}
              role="radio"
              aria-checked={equipe.icone === i}
              aria-label={`Ícone ${i}`}
              className={`flex aspect-square items-center justify-center rounded-lg border text-xl transition ${
                equipe.icone === i ? "border-marca bg-marca-fundo ring-2 ring-marca/40" : "border-borda hover:border-marca"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        {equipe.icone && (
          <button type="submit" name="icone" value="" className="mt-2 text-xs text-marca underline">
            Usar as iniciais do nome
          </button>
        )}
      </Formulario>
    </details>
  );
}
