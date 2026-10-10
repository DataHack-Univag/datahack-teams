import Link from "next/link";
import { notFound } from "next/navigation";
import { FichaAvaliacao } from "@/components/FichaAvaliacao";
import { Pagina } from "@/components/Pagina";
import { avaliacaoEncerrada, carregarAvaliacoes, exigir, SELECT_EQUIPE, sessaoAtual } from "@/lib/dados";
import { RUBRICAS } from "@/lib/rubricas";
import { rotuloCategoria, type Equipe } from "@/lib/tipos";

// Ficha de avaliação de uma equipe: dados da entrega + uma aba por rubrica da banca.
export default async function AvaliarEquipe({ params, searchParams }: PageProps<"/avaliar/[id]">) {
  const { id } = await params;
  const { r } = await searchParams;
  const { supabase, inscrito, organizador, banca } = await sessaoAtual();
  // Avaliador: só as rubricas da banca dele. Organização: todas (as dela primeiro).
  const minhas = organizador
    ? [...RUBRICAS.filter((x) => x.banca === "organizacao"), ...RUBRICAS.filter((x) => x.banca !== "organizacao")]
    : RUBRICAS.filter((x) => x.banca === banca);

  const [rEquipe, rTodas, fichas, encerrada] = await Promise.all([
    supabase.from("equipes").select(SELECT_EQUIPE).eq("id", id).maybeSingle<Equipe>(),
    supabase.from("equipes").select("id, nome").order("nome").returns<{ id: string; nome: string }[]>(),
    carregarAvaliacoes(supabase, { equipeId: id, avaliador: inscrito.email }),
    avaliacaoEncerrada(supabase),
  ]);
  const equipe = exigir(rEquipe, "equipe");
  if (!equipe) notFound();
  const todas = exigir(rTodas, "equipes") ?? [];
  const pos = todas.findIndex((e) => e.id === id);
  const anterior = pos > 0 ? todas[pos - 1] : null;
  const proxima = pos >= 0 && pos < todas.length - 1 ? todas[pos + 1] : null;

  // Aba escolhida, ou a primeira ainda incompleta.
  const fichaDe = (rid: string) => fichas?.find((f) => f.rubrica === rid);
  const incompleta = minhas.find((x) => {
    const f = fichaDe(x.id);
    return !f || x.criterios.some((c) => typeof f.notas?.[c.id] !== "number");
  });
  const rubrica = minhas.find((x) => x.id === r) ?? incompleta ?? minhas[0];
  const ficha = fichaDe(rubrica.id);
  const lider = equipe.membros.find((m) => m.email === equipe.lider_email);

  return (
    <Pagina>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/avaliar" className="text-marca">
          ← Todas as equipes
        </Link>
        <div className="flex gap-2">
          {anterior && (
            <Link href={`/avaliar/${anterior.id}?r=${rubrica.id}`} className="btn-secundario min-h-9 px-3 text-xs">
              ← {anterior.nome}
            </Link>
          )}
          {proxima && (
            <Link href={`/avaliar/${proxima.id}?r=${rubrica.id}`} className="btn-secundario min-h-9 px-3 text-xs">
              {proxima.nome} →
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ o que a equipe entregou */}
      <section className="card faixa-topo space-y-3">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Equipe avaliada</p>
          <h1 className="text-3xl font-extrabold break-words sm:text-4xl">
            <span className="grad-text">{equipe.nome}</span>
          </h1>
          <p className="mt-1 text-xs text-suave">
            {equipe.membros.map((m) => m.inscritos?.nome ?? m.email).join(", ") || "sem integrantes"}
            {lider && ` · ★ Líder: ${lider.inscritos?.nome ?? lider.email}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {equipe.repo_github ? (
            <a
              href={equipe.repo_github}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secundario min-h-9 max-w-full px-3 text-xs"
            >
              <span className="truncate">GitHub ↗ {equipe.repo_github.replace("https://github.com/", "")}</span>
            </a>
          ) : (
            <span className="selo bg-amber-500/15 text-amber-800 dark:text-amber-300">sem repositório</span>
          )}
          {equipe.links.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secundario min-h-9 max-w-full px-3 text-xs"
              title={l.url}
            >
              <span className="truncate">
                {rotuloCategoria(l.categoria)} ↗{l.titulo ? ` ${l.titulo}` : ""}
              </span>
            </a>
          ))}
        </div>
      </section>

      {fichas === null ? (
        <p className="card text-sm text-suave">
          Rode <code>supabase/008_avaliacao.sql</code> no Supabase para ativar as fichas.
        </p>
      ) : (
        <>
          {/* ------------------------------------------------ abas das rubricas */}
          {minhas.length > 1 && (
            <nav className="flex flex-wrap gap-2" aria-label="Rubricas">
              {minhas.map((x) => {
                const f = fichaDe(x.id);
                const ok = f && x.criterios.every((c) => typeof f.notas?.[c.id] === "number");
                const ativa = x.id === rubrica.id;
                return (
                  <Link
                    key={x.id}
                    href={`/avaliar/${id}?r=${x.id}`}
                    aria-current={ativa ? "page" : undefined}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      ativa
                        ? "border-transparent text-white [background:var(--grad)]"
                        : "border-borda-forte bg-superficie-solida text-suave hover:text-foreground"
                    }`}
                  >
                    {x.curto}
                    {organizador && x.banca !== "organizacao" && (
                      <span className="ml-1 text-[10px] font-normal opacity-75">
                        ({x.banca === "professores" ? "professores" : "negócio"})
                      </span>
                    )}{" "}
                    {ok ? "✔" : ""}
                  </Link>
                );
              })}
            </nav>
          )}

          <div>
            <h2 className="text-xl font-bold">{rubrica.nome}</h2>
            <p className="text-sm text-suave">
              {rubrica.pesoFinal}% da nota final · Banca: {rubrica.bancaTexto} · Quando: {rubrica.momento}
            </p>
          </div>

          <FichaAvaliacao
            key={`${id}-${rubrica.id}`}
            rubrica={rubrica}
            equipeId={id}
            notasIniciais={ficha?.notas ?? {}}
            comentarioInicial={ficha?.comentario ?? ""}
            bloqueada={encerrada && !organizador}
          />
        </>
      )}
    </Pagina>
  );
}
