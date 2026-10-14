import Link from "next/link";
import { liderDa, nomeMembro, presencaDosMembros, rotuloCategoria, type Equipe } from "@/modules/equipes/domain/tipos";
import { StatusRepo } from "@/modules/equipes/ui/StatusRepo";
import type { Presenca } from "@/modules/pessoas/domain/tipos";
import { PresencaEquipe } from "@/modules/pessoas/ui/MarcarPresenca";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { Icone } from "@/shared/ui/Icone";

/**
 * Equipes vistas pela mentoria: líder, repositório e links de entrega só para leitura,
 * e a presença de cada integrante para marcar ali mesmo ao passar pela equipe (heurística 7).
 */
export function EquipesMentoria({ equipes, presenca }: { equipes: Equipe[]; presenca: Record<string, Presenca | null> }) {
  if (!equipes.length)
    return (
      <EstadoVazio icone="equipe" titulo="Nenhuma equipe aprovada ainda">
        As equipes aparecem aqui assim que forem formadas e aprovadas pela organização.
      </EstadoVazio>
    );

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {equipes.map((e) => {
        const lider = liderDa(e);
        return (
          <li key={e.id} id={`equipe-${e.id}`} className="card faixa-topo min-w-0 scroll-mt-24 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg font-bold break-words">{e.nome}</h2>
                <p className="text-xs text-suave">
                  {e.membros.length} integrante(s)
                  {lider && (
                    <>
                      {" · "}
                      <span className="text-amber-600 dark:text-amber-300">★</span> {nomeMembro(lider)}
                    </>
                  )}
                </p>
              </div>
              <StatusRepo equipe={e} />
            </div>

            {/* Passando pela equipe, a mentoria já faz a chamada dela. */}
            <PresencaEquipe equipe={e.nome} pessoas={presencaDosMembros(e, presenca)} />

            <div className="flex flex-wrap gap-2 border-t border-borda pt-3 text-sm">
              {e.repo_github ? (
                <Link href={e.repo_github} target="_blank" rel="noopener" className="btn-secundario min-h-9 px-3 text-xs">
                  <Icone nome="github" className="size-4" /> Repositório
                </Link>
              ) : (
                <span className="text-xs text-suave">Sem repositório cadastrado.</span>
              )}
              {e.links.map((l) => (
                <Link key={l.id} href={l.url} target="_blank" rel="noopener" className="btn-secundario min-h-9 px-3 text-xs">
                  <Icone nome="link" className="size-4" /> {l.titulo || rotuloCategoria(l.categoria)}
                </Link>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
