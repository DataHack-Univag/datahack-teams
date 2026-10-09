import { rotuloMaterial, type Material } from "@/lib/tipos";

/** Materiais publicados pela organização (o que os alunos veem). */
export function ListaMateriais({ materiais, acoes }: { materiais: Material[]; acoes?: (m: Material) => React.ReactNode }) {
  if (!materiais.length) return <p className="text-sm text-suave">Nenhum material publicado ainda.</p>;

  return (
    // minmax(0,1fr) + min-w-0: links longos não empurram o card para fora da tela no celular.
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
      {materiais.map((m, i) => (
        <li
          key={m.id}
          className={`faixa-topo flex min-w-0 flex-col gap-2 rounded-2xl p-4 ${
            m.destaque ? "destaque-grad" : "border border-borda bg-superficie-solida/60"
          }`}
          style={{ animation: `dh-carta .7s cubic-bezier(.2,.8,.2,1) both`, animationDelay: `${i * 60}ms` }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="selo bg-marca-fundo text-marca">{rotuloMaterial(m.categoria)}</span>
            {m.destaque && (
              <span className="selo text-white" style={{ background: "var(--grad)" }}>
                destaque
              </span>
            )}
          </div>
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold [overflow-wrap:anywhere] text-foreground hover:text-marca hover:underline"
          >
            {m.titulo} ↗
          </a>
          {m.descricao && <p className="text-sm [overflow-wrap:anywhere] text-suave">{m.descricao}</p>}
          <p className="min-w-0 truncate font-mono text-xs text-suave" title={m.url}>
            {m.url}
          </p>
          {acoes?.(m)}
        </li>
      ))}
    </ul>
  );
}
