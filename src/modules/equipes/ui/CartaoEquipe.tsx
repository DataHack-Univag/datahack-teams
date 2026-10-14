import Link from "next/link";
import { pendenciasEquipe } from "@/modules/equipes/domain/permissoes";
import { liderDa, nomeMembro, presencaDosMembros, rotuloCategoria, type Equipe } from "@/modules/equipes/domain/tipos";
import { StatusRepo } from "@/modules/equipes/ui/StatusRepo";
import type { Presenca } from "@/modules/pessoas/domain/tipos";
import { PresencaEquipe } from "@/modules/pessoas/ui/MarcarPresenca";
import { plural } from "@/shared/lib/formatar";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

/**
 * Cartão de uma equipe na visão da organização (clique leva ao detalhe). Com `presenca`,
 * mostra a presença recolhida: ao passar pela equipe no evento, abre e marca (heurísticas 7 e 8).
 */
export function CartaoEquipe({
  equipe,
  maxMembros,
  indice = 0,
  presenca,
}: {
  equipe: Equipe;
  maxMembros: number;
  indice?: number;
  presenca?: Record<string, Presenca | null>;
}) {
  const lider = liderDa(equipe);
  const pend = pendenciasEquipe(equipe);
  const pessoas = presenca ? presencaDosMembros(equipe, presenca) : [];
  const presentes = pessoas.filter((p) => p.presenca === "presente").length;
  return (
    <article
      className="card faixa-topo flex min-w-0 flex-col gap-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--glow)]"
      style={{ animation: "dh-carta .6s cubic-bezier(.2,.8,.2,1) both", animationDelay: `${indice * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold break-words">
            <Link href={`/admin/equipes/${equipe.id}`} className="hover:text-marca hover:underline">
              {equipe.nome}
            </Link>
          </h2>
          <p className="truncate text-xs text-suave">
            {equipe.membros.length} de {maxMembros} integrantes
            {lider && (
              <>
                {" · "}
                <span className="text-amber-600 dark:text-amber-300">★</span> {nomeMembro(lider)}
              </>
            )}
          </p>
        </div>
        <Link href={`/admin/equipes/${equipe.id}`} className="btn-secundario min-h-9 shrink-0 px-3 text-xs">
          Abrir
          <Icone nome="avancar" className="size-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusRepo equipe={equipe} />
        {pend
          .filter((x) => x === "sem líder")
          .map((x) => (
            <Selo key={x} tom="alerta">
              {x}
            </Selo>
          ))}
        {pend.length === 0 && <Selo tom="sucesso">✔ em dia</Selo>}
      </div>

      {equipe.repo_github && (
        <a href={equipe.repo_github} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-xs text-marca hover:underline">
          {equipe.repo_github.replace("https://github.com/", "")} ↗
        </a>
      )}

      {equipe.links.length > 0 && (
        <ul className="space-y-1">
          {equipe.links.map((l) => (
            <li key={l.id} className="flex min-w-0 items-center gap-2 text-xs">
              <Selo tom="marca">{rotuloCategoria(l.categoria)}</Selo>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-marca hover:underline" title={l.url}>
                {l.titulo || l.url}
              </a>
            </li>
          ))}
        </ul>
      )}

      {pessoas.length > 0 && (
        <details className="group rounded-xl border border-borda px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold [&::-webkit-details-marker]:hidden">
            <span>
              Presença ·{" "}
              <span className="font-mono tabular-nums">
                {presentes}/{pessoas.length}
              </span>{" "}
              presente(s)
            </span>
            <span aria-hidden className="text-suave transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-2">
            <PresencaEquipe equipe={equipe.nome} pessoas={pessoas} semContagem />
          </div>
        </details>
      )}

      <p className="mt-auto border-t border-borda pt-2 text-xs text-suave">
        {equipe.membros.length
          ? equipe.membros.map((m) => nomeMembro(m) + (m.email === equipe.lider_email ? " ★" : "")).join(", ")
          : "Sem integrantes"}
        {" · "}
        {plural(equipe.links.length, "link")}
      </p>
    </article>
  );
}
