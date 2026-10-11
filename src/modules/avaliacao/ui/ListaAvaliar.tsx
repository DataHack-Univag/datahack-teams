import Link from "next/link";
import { criteriosFeitos, nomeRubrica, situacaoFicha } from "@/modules/avaliacao/domain/bancas";
import { notaFicha } from "@/modules/avaliacao/domain/nota";
import type { Rubrica } from "@/modules/avaliacao/domain/rubricas";
import type { Ficha } from "@/modules/avaliacao/domain/tipos";
import type { Equipe } from "@/modules/equipes/domain/tipos";
import { nota, plural } from "@/shared/lib/formatar";
import { Icone } from "@/shared/ui/Icone";

const TOM = {
  completa: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  incompleta: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  nao_iniciada: "bg-marca-fundo text-suave",
} as const;

/** Equipes para a banca avaliar, com a situação de cada ficha do avaliador logado. */
export function ListaAvaliar({ equipes, minhas, fichas }: { equipes: Equipe[]; minhas: Rubrica[]; fichas: Ficha[] }) {
  const ficha = (equipeId: string, rubrica: string) => fichas.find((f) => f.equipe_id === equipeId && f.rubrica === rubrica);
  // Equipes com fichas por fazer aparecem primeiro (heurística 1: o que falta, em destaque).
  const pendentes = (e: Equipe) => minhas.filter((r) => situacaoFicha(r, ficha(e.id, r.id)?.notas) !== "completa").length;
  const ordenadas = [...equipes].sort((a, b) => Number(pendentes(a) === 0) - Number(pendentes(b) === 0) || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <ul className="grid gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))]">
      {ordenadas.map((e, i) => {
        const falta = pendentes(e);
        return (
          <li
            key={e.id}
            className="card faixa-topo min-w-0 space-y-3"
            style={{ animation: "dh-carta .6s cubic-bezier(.2,.8,.2,1) both", animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{e.nome}</h2>
                <p className="truncate text-xs text-suave">
                  {plural(e.membros.length, "integrante")} · {plural(e.links.length, "link")} de entrega
                  {e.repo_github ? "" : " · sem repositório"}
                </p>
              </div>
              <Link href={`/avaliar/${e.id}`} className={`${falta ? "btn-primario" : "btn-secundario"} min-h-9 shrink-0 px-4 text-xs`}>
                {falta ? "Avaliar" : "Rever"}
                <Icone nome="avancar" className="size-3.5" />
              </Link>
            </div>
            <ul className="flex flex-wrap gap-1.5" aria-label="Suas fichas desta equipe">
              {minhas.map((r) => {
                const f = ficha(e.id, r.id);
                const s = situacaoFicha(r, f?.notas);
                const feitos = criteriosFeitos(r, f?.notas);
                return (
                  <li key={r.id}>
                    <Link href={`/avaliar/${e.id}?r=${r.id}`} className={`selo ${TOM[s]}`} title={nomeRubrica(r.id)}>
                      {r.curto}:{" "}
                      {s === "completa" ? `✔ ${nota(notaFicha(r, f!.notas))}` : s === "incompleta" ? `${feitos} de ${r.criterios.length}` : "não iniciada"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
