import Link from "next/link";
import {
  adicionarLink,
  adicionarMembro,
  atualizarEquipe,
  definirLider,
  removerLink,
  removerMembro,
  verificarRepo,
} from "@/app/actions";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import {
  CATEGORIAS,
  rotuloCategoria,
  type Configuracao,
  type Equipe,
  type Inscrito,
} from "@/lib/tipos";

/** Painel completo de uma equipe: dados, integrantes e links de entrega. */
export function PainelEquipe({
  equipe,
  disponiveis,
  config,
  meuEmail,
  organizador,
  simulacao = false,
}: {
  equipe: Equipe;
  disponiveis: Inscrito[];
  config: Configuracao;
  meuEmail: string;
  organizador: boolean;
  /** "Ver como aluno": mostra os mesmos controles que o aluno vê, todos desativados. */
  simulacao?: boolean;
}) {
  const podeEditar = organizador || !config.edicao_bloqueada;
  // Composição da equipe (adicionar/remover) é só da organização; aluno só vê.
  const podeGerirMembros = organizador;
  const lotada = equipe.membros.length >= config.max_membros;
  const lider = equipe.membros.find((m) => m.email === equipe.lider_email);

  return (
    <fieldset disabled={simulacao} className="contents">
      <div className="space-y-4 sm:space-y-6">
        {config.edicao_bloqueada && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            A edição das equipes está bloqueada pela organização
            {organizador ? " (você, como organizador, ainda pode editar)." : "."}
          </p>
        )}

        {/* ------------------------------------------------ dados da equipe */}
        <section className="card space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-suave">Equipe</p>
            <h1 className="text-2xl font-bold break-words sm:text-3xl">{equipe.nome}</h1>
          </div>

          {equipe.repo_github ? (
            <div className="space-y-2 rounded-xl border border-borda p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="selo bg-foreground text-background">GitHub · obrigatório</span>
                <StatusRepo equipe={equipe} />
              </div>
              <a
                href={equipe.repo_github}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-mono text-sm break-all text-marca underline-offset-4 hover:underline"
              >
                {equipe.repo_github}
              </a>
              {podeEditar && (
                <Formulario action={verificarRepo} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={equipe.id} />
                  <BotaoEnviar className="btn-secundario min-h-9 px-3 text-xs">
                    Verificar se está público
                  </BotaoEnviar>
                </Formulario>
              )}
            </div>
          ) : (
            <div className="space-y-1 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 dark:bg-amber-950">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Cadastre o repositório GitHub da equipe</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                É obrigatório: é nele que vocês entregam o código. Crie um repositório <strong>público</strong> em{" "}
                <a href="https://github.com/new" target="_blank" rel="noopener noreferrer" className="underline">
                  github.com/new
                </a>{" "}
                e cole o link abaixo.
              </p>
            </div>
          )}

          {podeEditar && (
            <details className="group" open={!equipe.repo_github}>
              <summary className="cursor-pointer text-sm font-medium text-marca select-none">
                Editar nome e repositório
              </summary>
              <Formulario action={atualizarEquipe} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={equipe.id} />
                <label>
                  <span className="rotulo">Nome da equipe</span>
                  <input name="nome" defaultValue={equipe.nome} required maxLength={60} className="campo" />
                </label>
                <label>
                  <span className="rotulo">Repositório GitHub (público)</span>
                  <input
                    name="repo_github"
                    defaultValue={equipe.repo_github ?? ""}
                    required
                    inputMode="url"
                    placeholder="https://github.com/usuario/repo"
                    className="campo font-mono text-sm"
                  />
                </label>
                <div className="sm:col-span-2">
                  <BotaoEnviar>Salvar</BotaoEnviar>
                </div>
              </Formulario>
            </details>
          )}
        </section>

        {/* ------------------------------------------------ integrantes */}
        <section className="card space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Integrantes</h2>
            <span className="text-sm text-suave">
              {equipe.membros.length}/{config.max_membros}
            </span>
          </div>
          <p className="text-sm text-suave">
            {lider ? (
              <>
                Líder: <strong className="text-foreground">{lider.inscritos?.nome ?? lider.email}</strong>
              </>
            ) : (
              "A equipe ainda não escolheu um líder."
            )}
            {podeEditar && " Qualquer integrante pode definir o líder."}
            {!podeGerirMembros && " Mudanças de integrantes são feitas pela organização."}
          </p>

          <ul className="divide-y divide-borda">
            {equipe.membros
              .slice()
              .sort((a, b) => (a.inscritos?.nome ?? "").localeCompare(b.inscritos?.nome ?? ""))
              .map((m) => {
                const souEu = m.email === meuEmail;
                const ehLider = m.email === equipe.lider_email;
                return (
                  <li key={m.email} className="flex items-center gap-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-fundo text-sm font-bold text-marca">
                      {(m.inscritos?.nome ?? m.email)[0].toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {m.inscritos?.nome ?? m.email}
                        {souEu && <span className="ml-1 text-xs text-suave">(você)</span>}
                        {ehLider && (
                          <span className="selo ml-2 bg-amber-100 align-middle text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ★ Líder
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-suave">
                        {[m.inscritos?.curso, m.inscritos?.semestre && `${m.inscritos.semestre}º sem.`]
                          .filter(Boolean)
                          .join(" · ")}
                        {organizador && ` · ${m.email}`}
                      </p>
                      {organizador && (
                        <Link
                          href={`/ver-como?email=${encodeURIComponent(m.email)}`}
                          className="text-xs text-marca underline-offset-4 hover:underline"
                        >
                          👁 ver como este aluno
                        </Link>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                      {podeEditar && (
                        <Formulario action={definirLider} className="flex flex-col items-end">
                          <input type="hidden" name="equipe_id" value={equipe.id} />
                          <input type="hidden" name="email" value={ehLider ? "" : m.email} />
                          <BotaoEnviar className="btn-secundario min-h-9 px-3 text-xs">
                            {ehLider ? "Tirar líder" : "Tornar líder"}
                          </BotaoEnviar>
                        </Formulario>
                      )}
                      {podeGerirMembros && (
                        <Formulario
                          action={removerMembro}
                          confirmar={`Remover ${m.inscritos?.nome ?? m.email} da equipe?`}
                          className="flex flex-col items-end"
                        >
                          <input type="hidden" name="email" value={m.email} />
                          <input type="hidden" name="equipe_id" value={equipe.id} />
                          <BotaoEnviar className="btn-perigo min-h-9 px-3 text-xs">Remover</BotaoEnviar>
                        </Formulario>
                      )}
                    </div>
                  </li>
                );
              })}
            {equipe.membros.length === 0 && (
              <li className="py-3 text-sm text-suave">Nenhum integrante ainda.</li>
            )}
          </ul>

          {podeGerirMembros && !lotada && (
            <Formulario action={adicionarMembro} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input type="hidden" name="equipe_id" value={equipe.id} />
              <label className="sm:flex-1">
                <span className="sr-only">Adicionar integrante</span>
                <select name="email" required defaultValue="" className="campo">
                  <option value="" disabled>
                    {disponiveis.length ? "Adicionar integrante..." : "Todos os inscritos já têm equipe"}
                  </option>
                  {disponiveis.map((i) => (
                    <option key={i.email} value={i.email}>
                      {i.nome}
                      {i.curso ? ` — ${i.curso}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <BotaoEnviar>Adicionar</BotaoEnviar>
            </Formulario>
          )}
          {podeGerirMembros && lotada && (
            <p className="text-sm text-suave">A equipe atingiu o limite de integrantes.</p>
          )}
        </section>

        {/* ------------------------------------------------ links de entrega */}
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Links de entrega</h2>
            <p className="text-sm text-suave">
              Pastas do Drive, apresentação, vídeo do pitch, dashboards... Links de Drive precisam estar
              com acesso aberto (&quot;Qualquer pessoa com o link&quot;).
            </p>
          </div>

          <ul className="space-y-2">
            {equipe.links.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-xl border border-borda p-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="selo bg-marca-fundo text-marca">{rotuloCategoria(l.categoria)}</span>
                    {l.titulo && <span className="text-sm font-medium break-words">{l.titulo}</span>}
                  </div>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-marca underline-offset-4 hover:underline"
                  >
                    {l.url}
                  </a>
                </div>
                {podeEditar && (
                  <Formulario action={removerLink} confirmar="Remover este link?">
                    <input type="hidden" name="id" value={l.id} />
                    <BotaoEnviar className="btn-perigo min-h-9 px-3 text-xs" title="Remover link">
                      ✕
                    </BotaoEnviar>
                  </Formulario>
                )}
              </li>
            ))}
            {equipe.links.length === 0 && <li className="text-sm text-suave">Nenhum link extra ainda.</li>}
          </ul>

          {podeEditar && (
            <Formulario action={adicionarLink} className="grid gap-2 sm:grid-cols-[180px_1fr]">
              <input type="hidden" name="equipe_id" value={equipe.id} />
              <label>
                <span className="rotulo">Categoria</span>
                <select name="categoria" required defaultValue="drive" className="campo">
                  {CATEGORIAS.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="rotulo">Descrição (opcional)</span>
                <input name="titulo" maxLength={80} placeholder="Ex.: Slides do pitch final" className="campo" />
              </label>
              <label className="sm:col-span-2">
                <span className="rotulo">URL</span>
                <input name="url" required inputMode="url" placeholder="https://..." className="campo font-mono text-sm" />
              </label>
              <div className="sm:col-span-2">
                <BotaoEnviar>Adicionar link</BotaoEnviar>
              </div>
            </Formulario>
          )}
        </section>
      </div>
    </fieldset>
  );
}

function StatusRepo({ equipe }: { equipe: Equipe }) {
  if (equipe.repo_publico === true)
    return <span className="selo bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">✔ Público</span>;
  if (equipe.repo_publico === false)
    return (
      <span className="selo bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
        ⚠ Não encontrado ou privado
      </span>
    );
  return <span className="selo bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Não verificado</span>;
}
