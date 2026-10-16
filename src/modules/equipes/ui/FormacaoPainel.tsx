import Link from "next/link";
import { ESTADOS_FORMACAO, type ResumoFormacao } from "@/modules/equipes/domain/formacao";

/**
 * Formação das equipes no painel da organização (edição em que os alunos propõem): equipes por
 * etapa e alunos por situação. Cada número abre a lista correspondente (heurísticas 1 e 7).
 */
export function FormacaoPainel({ r }: { r: ResumoFormacao }) {
  const equipes = [
    { rotulo: "Aguardando aceite dos convidados", valor: r.equipes.aguardandoAceite, href: "/admin/equipes/propostas", alerta: false },
    { rotulo: "Todos aceitaram (falta aprovar)", valor: r.equipes.todosAceitaram, href: "/admin/equipes/propostas", alerta: r.equipes.todosAceitaram > 0 },
    { rotulo: "Equipes aprovadas", valor: r.equipes.aprovadas, href: "/admin/equipes", alerta: false },
  ];
  const pessoas = (["propos", "convidado", "aceitou", "em_equipe", "livre"] as const).map((e) => ({
    rotulo: ESTADOS_FORMACAO[e].rotulo,
    valor: r.pessoas[e],
    href: e === "em_equipe" ? "/admin/equipes" : `/admin/pessoas?filtro=${e}`,
    alerta: e === "convidado" ? r.pessoas[e] > 0 : false,
  }));
  const Numero = ({ i }: { i: { rotulo: string; valor: number; href: string; alerta: boolean } }) => (
    <Link href={i.href} className="card p-3! transition hover:border-marca">
      <p className={`font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums ${i.alerta ? "text-amber-600 dark:text-amber-300" : ""}`}>{i.valor}</p>
      <p className="mt-0.5 text-xs text-suave">{i.rotulo}</p>
    </Link>
  );
  return (
    <section className="space-y-3" aria-labelledby="titulo-formacao">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-formacao" className="text-lg font-semibold">
          Formação das equipes
        </h2>
        <p className="text-xs text-suave">
          {r.pessoas.total - r.pessoas.livre} de {r.pessoas.total} alunos já estão numa equipe ou proposta
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[3fr_5fr]">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Equipes</p>
          <div className="grid grid-cols-3 gap-2">
            {equipes.map((i) => (
              <Numero key={i.rotulo} i={i} />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Alunos</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {pessoas.map((i) => (
              <Numero key={i.rotulo} i={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
