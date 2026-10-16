import Link from "next/link";
import type { Pendencia, ResumoEvento } from "@/modules/painel/domain/pendencias";
import { Aviso } from "@/shared/ui/Aviso";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { Icone } from "@/shared/ui/Icone";

export function NumerosEvento({ r }: { r: ResumoEvento }) {
  const itens = [
    { rotulo: "Equipes", valor: String(r.equipes), href: "/admin/equipes" },
    { rotulo: "Participantes com equipe", valor: `${r.alunosComEquipe}/${r.totalAlunos}`, href: "/admin/pessoas?filtro=sem_equipe", alerta: r.alunosComEquipe < r.totalAlunos },
    { rotulo: "Repositórios públicos", valor: `${r.reposPublicos}/${r.equipes}`, href: "/admin/equipes?filtro=pendentes", alerta: r.reposPublicos < r.equipes },
    { rotulo: "Trocas aguardando", valor: String(r.trocasPendentes), href: "/admin/equipes/trocas?status=pendente", alerta: r.trocasPendentes > 0 },
    { rotulo: "Fichas completas", valor: `${r.fichasCompletas}/${r.fichasEsperadas}`, href: "/admin/avaliacao?aba=andamento" },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Números do evento">
      {itens.map((i) => (
        <Link key={i.rotulo} href={i.href} className="card p-4! transition hover:border-marca">
          <p className={`font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums sm:text-3xl ${i.alerta ? "text-amber-600 dark:text-amber-300" : ""}`}>{i.valor}</p>
          <p className="mt-1 text-xs text-suave">{i.rotulo}</p>
        </Link>
      ))}
    </section>
  );
}

/** Lista do que precisa de atenção, cada item com o atalho para resolver. */
export function ListaPendencias({ pendencias }: { pendencias: Pendencia[] }) {
  if (!pendencias.length)
    return (
      <EstadoVazio icone="ok" titulo="Nada pendente agora 🎉">
        Equipes completas, repositórios públicos e nenhuma troca aguardando.
      </EstadoVazio>
    );
  return (
    <ul className="space-y-2">
      {pendencias.map((p) => (
        <li key={p.id}>
          <Aviso
            tom={p.tom}
            titulo={p.titulo}
            acao={
              <Link href={p.href} className="btn-secundario min-h-9 px-3 text-xs">
                {p.acao}
                <Icone nome="avancar" className="size-3.5" />
              </Link>
            }
          >
            {p.detalhe}
          </Aviso>
        </li>
      ))}
    </ul>
  );
}
