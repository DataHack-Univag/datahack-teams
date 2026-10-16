"use client";

import { useState } from "react";
import { MODULOS, ROTULO_PUBLICO, type Topico } from "@/app/ajuda/conteudo";
import { casaBusca } from "@/shared/lib/texto";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { FiltrosChips } from "@/shared/ui/FiltrosChips";
import { Icone } from "@/shared/ui/Icone";

/**
 * Perguntas frequentes com busca (sem acento e sem diferenciar maiúsculas), agrupadas por
 * módulo, com filtro de módulo (heurísticas 6 e 10). Para a organização, cada pergunta
 * mostra para quem ela é (participantes, bancas, mentoria).
 */
export function BuscaAjuda({ topicos, mostrarPublicos = false }: { topicos: Topico[]; mostrarPublicos?: boolean }) {
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState("todos");
  const presentes = MODULOS.filter((m) => topicos.some((t) => t.modulo === m));
  const lista = topicos.filter((t) => (modulo === "todos" || t.modulo === modulo) && (!busca || casaBusca(`${t.pergunta} ${t.resposta} ${t.modulo}`, busca)));
  const grupos = presentes.map((m) => ({ modulo: m, topicos: lista.filter((t) => t.modulo === m) })).filter((g) => g.topicos.length);

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar na ajuda</span>
        <Icone nome="busca" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar: check-in, troca, senha, nota, inscrição…"
          className="campo pl-9"
          autoFocus
        />
      </label>
      {presentes.length > 1 && (
        <FiltrosChips
          opcoes={[{ id: "todos", rotulo: "Tudo", n: topicos.length }, ...presentes.map((m) => ({ id: m, rotulo: m, n: topicos.filter((t) => t.modulo === m).length }))]}
          ativo={modulo}
          aoEscolher={setModulo}
        />
      )}
      {grupos.length === 0 ? (
        <EstadoVazio icone="ajuda" titulo="Nada encontrado">
          Tente outra palavra ou fale com a organização do evento.
        </EstadoVazio>
      ) : (
        grupos.map((g) => (
          <section key={g.modulo} aria-labelledby={`modulo-${g.modulo}`} className="space-y-2">
            <h2 id={`modulo-${g.modulo}`} className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
              {g.modulo}
            </h2>
            <ul className="space-y-2">
              {g.topicos.map((t) => (
                <li key={t.pergunta}>
                  <details className="card group p-4!" open={!!busca}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold select-none">
                      {t.pergunta}
                      <Icone nome="avancar" className="size-4 shrink-0 transition group-open:rotate-90" />
                    </summary>
                    <p className="mt-2 text-sm text-suave">{t.resposta}</p>
                    {mostrarPublicos && (
                      <p className="mt-2 text-xs text-suave">
                        Para: <span className="font-medium text-foreground">{t.publicos.map((p) => ROTULO_PUBLICO[p]).join(" · ")}</span>
                      </p>
                    )}
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
