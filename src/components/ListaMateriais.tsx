import { rotuloMaterial, type Material } from "@/lib/tipos";

/** Materiais publicados pela organização (o que os alunos veem). */
export function ListaMateriais({ materiais, acoes }: { materiais: Material[]; acoes?: (m: Material) => React.ReactNode }) {
  if (!materiais.length) return <p className="text-sm text-suave">Nenhum material publicado ainda.</p>;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {materiais.map((m) => (
        <li
          key={m.id}
          className={`flex flex-col gap-2 rounded-xl border p-3 ${m.destaque ? "border-marca bg-marca-fundo/50" : "border-borda"}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="selo bg-marca-fundo text-marca">{rotuloMaterial(m.categoria)}</span>
            {m.destaque && <span className="selo bg-foreground text-background">destaque</span>}
          </div>
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold break-words text-foreground hover:text-marca hover:underline"
          >
            {m.titulo} ↗
          </a>
          {m.descricao && <p className="text-sm text-suave">{m.descricao}</p>}
          <p className="truncate font-mono text-xs text-suave" title={m.url}>
            {m.url}
          </p>
          {acoes?.(m)}
        </li>
      ))}
    </ul>
  );
}
