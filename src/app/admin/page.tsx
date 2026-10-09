import Link from "next/link";
import { salvarConfiguracao } from "@/app/actions";
import { CriarEquipe } from "@/components/CriarEquipe";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { Pagina } from "@/components/Pagina";
import { carregarConfiguracao, carregarSemEquipe, exigir, SELECT_EQUIPE, sessaoAtual } from "@/lib/dados";
import { rotuloCategoria, type Equipe } from "@/lib/tipos";

// Aba "Equipes": visão de todas as equipes, integrantes e links de entrega.
export default async function AdminEquipes() {
  const { supabase } = await sessaoAtual();

  const [config, semEquipe, rEquipes, { count: totalAlunos }] = await Promise.all([
    carregarConfiguracao(supabase),
    carregarSemEquipe(supabase),
    supabase
      .from("equipes")
      .select(SELECT_EQUIPE)
      .order("nome")
      .order("criado_em", { referencedTable: "links" })
      .returns<Equipe[]>(),
    supabase.from("inscritos").select("*", { count: "exact", head: true }).eq("papel", "aluno"),
  ]);
  const equipes = exigir(rEquipes, "equipes") ?? [];
  const comEquipe = equipes.reduce((s, e) => s + e.membros.length, 0);
  const comRepo = equipes.filter((e) => e.repo_github).length;
  const reposOk = equipes.filter((e) => e.repo_publico).length;

  return (
    <Pagina>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            As <span className="grad-text">equipes</span>
          </h1>
          <p className="text-sm text-suave">Integrantes, repositórios e links de entrega de cada equipe.</p>
        </div>
        <a href="/admin/exportar" className="btn-secundario">
          Exportar CSV
        </a>
      </div>

      {/* ------------------------------------------------ números */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Numero rotulo="Equipes" valor={equipes.length} />
        <Numero rotulo="Alunos com equipe" valor={`${comEquipe}/${totalAlunos ?? 0}`} />
        <Numero rotulo="Sem equipe" valor={semEquipe.length} alerta={semEquipe.length > 0} />
        <Numero rotulo="Com repositório" valor={`${comRepo}/${equipes.length}`} alerta={comRepo < equipes.length} />
        <Numero rotulo="Repos públicos" valor={`${reposOk}/${equipes.length}`} />
      </section>

      {/* ------------------------------------------------ equipes */}
      <section className="space-y-3">
        {equipes.length === 0 && (
          <p className="card text-sm text-suave">
            Nenhuma equipe ainda. Crie abaixo ou use o{" "}
            <Link href="/admin/gerador" className="text-marca underline">
              Gerador de equipes
            </Link>
            .
          </p>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {equipes.map((e, i) => (
            <article
              key={e.id}
              className="card faixa-topo space-y-3 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--glow)]"
              style={{ animation: "dh-carta .7s cubic-bezier(.2,.8,.2,1) both", animationDelay: `${i * 55}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold break-words">{e.nome}</h2>
                  <p className="truncate text-xs text-suave">
                    {e.membros.length}/{config.max_membros} integrantes
                    {liderDe(e) && (
                      <>
                        {" · "}
                        <span className="text-amber-600 dark:text-amber-300">★</span> {liderDe(e)}
                      </>
                    )}
                  </p>
                </div>
                <Link href={`/admin/equipes/${e.id}`} className="btn-secundario min-h-9 shrink-0 px-3 text-xs">
                  Gerenciar
                </Link>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="selo bg-foreground text-background">GitHub</span>
                  <SeloRepo e={e} />
                  {!e.lider_email && e.membros.length > 0 && (
                    <span className="selo bg-amber-500/15 text-amber-800 dark:text-amber-300">líder pendente</span>
                  )}
                </div>
                {e.repo_github ? (
                  <a
                    href={e.repo_github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-marca hover:underline"
                  >
                    {e.repo_github}
                  </a>
                ) : (
                  <p className="text-xs text-suave">Repositório ainda não cadastrado.</p>
                )}
              </div>

              {e.links.length > 0 && (
                <ul className="space-y-1">
                  {e.links.map((l) => (
                    <li key={l.id} className="flex min-w-0 items-center gap-2 text-xs">
                      <span className="selo shrink-0 bg-marca-fundo text-marca">{rotuloCategoria(l.categoria)}</span>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 truncate text-marca hover:underline"
                        title={l.url}
                      >
                        {l.titulo || l.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <p className="border-t border-borda pt-2 text-xs text-suave">
                {e.membros
                  .map((m) => (m.inscritos?.nome ?? m.email) + (m.email === e.lider_email ? " ★" : ""))
                  .join(", ") || "sem integrantes"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------ sem equipe */}
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">Inscritos sem equipe ({semEquipe.length})</h2>
          <ul className="max-h-96 divide-y divide-borda overflow-y-auto">
            {semEquipe.map((i) => (
              <li key={i.email} className="py-2">
                <p className="text-sm font-medium">{i.nome}</p>
                <p className="truncate text-xs text-suave">
                  {[i.curso, i.semestre && `${i.semestre}º sem.`, i.email].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
            {semEquipe.length === 0 && <li className="py-2 text-sm text-suave">Todos têm equipe. 🎉</li>}
          </ul>
        </section>

        <div className="space-y-6">
          {/* ------------------------------------------------ criar equipe */}
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold">Criar equipe manualmente</h2>
            <p className="text-sm text-suave">Depois de criar, adicione os integrantes em “Gerenciar”.</p>
            <CriarEquipe paraAdmin />
          </section>

          {/* ------------------------------------------------ configuração */}
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold">Configuração</h2>
            <Formulario action={salvarConfiguracao} className="space-y-3">
              <label className="block">
                <span className="rotulo">Máximo de integrantes por equipe</span>
                <input
                  type="number"
                  name="max_membros"
                  min={1}
                  max={20}
                  defaultValue={config.max_membros}
                  className="campo"
                />
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="edicao_bloqueada"
                  defaultChecked={config.edicao_bloqueada}
                  className="mt-1 size-5 accent-[var(--marca)]"
                />
                <span className="text-sm">
                  <strong>Bloquear edição pelos alunos</strong>
                  <span className="block text-suave">
                    Use no fim do prazo de entrega: alunos só visualizam; organizadores continuam editando.
                  </span>
                </span>
              </label>
              <BotaoEnviar>Salvar configuração</BotaoEnviar>
            </Formulario>
          </section>
        </div>
      </div>
    </Pagina>
  );
}

function liderDe(e: Equipe) {
  const m = e.membros.find((x) => x.email === e.lider_email);
  return m ? (m.inscritos?.nome ?? m.email) : null;
}

function SeloRepo({ e }: { e: Equipe }) {
  if (!e.repo_github)
    return <span className="selo bg-amber-500/15 text-amber-800 dark:text-amber-300">pendente</span>;
  if (e.repo_publico === true)
    return (
      <span className="selo bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">✔ público</span>
    );
  if (e.repo_publico === false)
    return <span className="selo bg-red-500/15 text-red-700 dark:text-red-300">⚠ privado/inexistente</span>;
  return <span className="selo bg-amber-500/15 text-amber-800 dark:text-amber-300">não verificado</span>;
}

function Numero({ rotulo, valor, alerta = false }: { rotulo: string; valor: number | string; alerta?: boolean }) {
  return (
    <div className="card p-4!">
      <p
        className={`font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums sm:text-3xl ${
          alerta ? "text-amber-600 dark:text-amber-300" : ""
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 text-xs text-suave">{rotulo}</p>
    </div>
  );
}
