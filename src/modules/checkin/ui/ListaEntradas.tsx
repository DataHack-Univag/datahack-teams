"use client";

import { useState } from "react";
import type { Entrada } from "@/modules/checkin/infra/repositorio";
import { MarcarPresenca } from "@/modules/pessoas/ui/MarcarPresenca";
import { casaBusca } from "@/shared/lib/texto";
import { Avatar } from "@/shared/ui/Avatar";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { FiltrosChips } from "@/shared/ui/FiltrosChips";
import { Selo } from "@/shared/ui/Selo";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Cuiaba", hour: "2-digit", minute: "2-digit" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Cuiaba", day: "2-digit", month: "2-digit" });

/**
 * Lista do check-in: quem já entrou (com horário e quem marcou), quem está faltando e quem foi
 * marcado ausente. Quem falta pode ser marcado ali mesmo (heurística 7). Atualiza ao vivo.
 */
export function ListaEntradas({ entradas }: { entradas: Entrada[] }) {
  const presentes = entradas.filter((e) => e.presenca === "presente");
  const ausentes = entradas.filter((e) => e.presenca === "ausente");
  const faltando = entradas.filter((e) => !e.presenca);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");

  const lista = (filtro === "presentes" ? presentes : filtro === "faltando" ? faltando : filtro === "ausentes" ? ausentes : entradas)
    .filter((e) => !busca.trim() || casaBusca(`${e.nome} ${e.email} ${e.equipe ?? ""}`, busca))
    // Quem entrou (o último primeiro), depois quem falta e, no fim, os marcados ausentes.
    .sort((a, b) => {
      const ordem = (e: Entrada) => (e.presenca === "presente" ? 0 : e.presenca ? 2 : 1);
      if (ordem(a) !== ordem(b)) return ordem(a) - ordem(b);
      if (a.presenca === "presente" && a.presenca_em && b.presenca_em) return b.presenca_em.localeCompare(a.presenca_em);
      return a.nome.localeCompare(b.nome);
    });

  if (!entradas.length)
    return (
      <EstadoVazio icone="pessoas" titulo="Nenhum participante nesta edição">
        Os participantes aparecem aqui assim que forem cadastrados ou aprovados.
      </EstadoVazio>
    );

  const pct = Math.round((presentes.length / entradas.length) * 100);
  return (
    <section className="card space-y-4">
      <div className="space-y-2">
        <p className="text-sm" aria-live="polite">
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">{presentes.length}</span>
          <span className="text-suave"> de {entradas.length} participantes já entraram ({pct}%)</span>
          {faltando.length > 0 && <span className="text-suave"> · {faltando.length} faltando</span>}
          {ausentes.length > 0 && <span className="text-suave"> · {ausentes.length} marcado(s) ausente(s)</span>}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-marca-fundo" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Participantes que já entraram">
          <div className="h-full rounded-full [background:var(--grad)]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FiltrosChips
          opcoes={[
            { id: "todos", rotulo: "Todos", n: entradas.length },
            { id: "presentes", rotulo: "Entraram", n: presentes.length },
            { id: "faltando", rotulo: "Faltando", n: faltando.length },
            { id: "ausentes", rotulo: "Ausentes", n: ausentes.length },
          ].filter((f) => f.id !== "ausentes" || f.n > 0 || filtro === "ausentes")}
          ativo={filtro}
          aoEscolher={setFiltro}
        />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nome, e-mail ou equipe"
          aria-label="Buscar participante"
          className="campo min-h-9 w-full py-1 text-sm sm:ml-auto sm:w-64"
        />
      </div>

      {!lista.length ? (
        <p className="text-sm text-suave">Ninguém neste filtro.</p>
      ) : (
        <ul className="divide-y divide-borda">
          {lista.map((e) => (
            <li key={e.email} className="flex flex-wrap items-center gap-3 py-2">
              <Avatar nome={e.nome} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 font-medium">
                  <span className="truncate">{e.nome}</span>
                  {e.presenca === "presente" ? (
                    <Selo tom="sucesso">Entrou</Selo>
                  ) : e.presenca === "ausente" ? (
                    <Selo tom="alerta">Ausente</Selo>
                  ) : (
                    <Selo tom="neutro">Faltando</Selo>
                  )}
                </p>
                <p className="truncate text-xs text-suave">{[e.equipe ?? "sem equipe", e.email].join(" · ")}</p>
              </div>
              {e.presenca && e.presenca_em ? (
                <div className="shrink-0 text-right text-xs">
                  <p className="font-mono font-semibold tabular-nums">
                    {hora(e.presenca_em)} <span className="font-normal text-suave">{dia(e.presenca_em)}</span>
                  </p>
                  {e.marcado_por && <p className="text-suave">por {e.marcado_por}</p>}
                </div>
              ) : null}
              {e.presenca !== "presente" && <MarcarPresenca pessoa={{ email: e.email, nome: e.nome, presenca: e.presenca }} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
