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
}: {
  equipe: Equipe;
  disponiveis: Inscrito[];
  config: Configuracao;
  meuEmail: string;
  /**
   * true = controles de organização. No "ver como aluno" vem false: o organizador vê
   * e usa exatamente os mesmos controles daquele aluno (agindo com permissão de organização).
   */
  organizador: boolean;
}) {
  const podeEditar = organizador || !config.edicao_bloqueada;
  // Composição da equipe (adicionar/remover) é só da organização; aluno só vê.
  const podeGerirMembros = organizador;
  const lotada = equipe.membros.length >= config.max_membros;
  const lider = equipe.membros.find((m) => m.email === equipe.lider_email);
  const souLider = !!lider && lider.email === meuEmail;
  // Trava do líder: sem líder, qualquer integrante define; com líder, só o líder
  // (ou a organização) passa a liderança adiante. O banco garante a mesma regra.
  const podeMexerLider = podeEditar && (organizador || !lider || souLider);
  // Nome e repositório: só o líder (ou a organização). O banco garante a mesma regra.
  const podeEditarDados = podeEditar && (organizador || souLider);
  const nomeDe = (m: { email: string; inscritos: { nome: string } | null }) => m.inscritos?.nome ?? m.email;

  return (
    <div className="space-y-4 sm:space-y-6">
      {config.edicao_bloqueada && (
        <p className="rounded-xl bg-amber-500/15 p-3 text-sm text-amber-800 dark:text-amber-200">
          A edição das equipes está bloqueada pela organização
          {organizador ? " (você, como organizador, ainda pode editar)." : "."}
        </p>
      )}

      {/* ------------------------------------------------ dados da equipe */}
      <section className="card faixa-topo space-y-4">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Sua equipe</p>
          <h1 className="text-3xl font-extrabold break-words sm:text-4xl">
            <span className="grad-text">{equipe.nome}</span>
          </h1>
          {lider && (
            <p className="mt-1 truncate text-xs text-suave" title={`Líder: ${nomeDe(lider)}`}>
              <span className="text-amber-600 dark:text-amber-300">★</span> Líder:{" "}
              <strong className="font-semibold text-foreground">{nomeDe(lider)}</strong>
              {souLider && " (você)"}
            </p>
          )}
        </div>

        {!lider && (
          <div className="space-y-1 rounded-xl border-2 border-amber-400/70 bg-amber-500/15 p-3">
            <p className="font-semibold text-amber-900 dark:text-amber-200">A equipe ainda não tem líder</p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {podeMexerLider ? "Escolham" : "A equipe precisa escolher"} o líder na{" "}
              <a href="#integrantes" className="underline">
                lista de integrantes
              </a>
              . É ele quem cadastra o nome e o repositório; depois de definido, só o líder passa a liderança adiante.
            </p>
          </div>
        )}

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
          <div className="space-y-1 rounded-xl border-2 border-amber-400/70 bg-amber-500/15 p-3">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {podeEditarDados ? "Cadastre o repositório GitHub da equipe" : "A equipe ainda não cadastrou o repositório GitHub"}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              É obrigatório: é nele que vocês entregam o código.{" "}
              {podeEditarDados ? (
                <>
                  Crie um repositório <strong>público</strong> em{" "}
                  <a href="https://github.com/new" target="_blank" rel="noopener noreferrer" className="underline">
                    github.com/new
                  </a>{" "}
                  e cole o link abaixo.
                </>
              ) : lider ? (
                <>
                  Quem cadastra é o líder, <strong>{nomeDe(lider)}</strong>.
                </>
              ) : (
                "Quem cadastra é o líder, que ainda não foi escolhido."
              )}
            </p>
          </div>
        )}

        {podeEditarDados && (
          <details className="group" open={!equipe.repo_github}>
            <summary className="cursor-pointer text-sm font-medium text-marca select-none">
              Editar nome e repositório
            </summary>
            <Formulario action={atualizarEquipe} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={equipe.id} />
              <input type="hidden" name="repo_atual" value={equipe.repo_github ?? ""} />
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
        {podeEditar && !podeEditarDados && equipe.repo_github && (
          <p className="text-xs text-suave">
            {lider
              ? `Só o líder (${nomeDe(lider)}) pode alterar o nome e o repositório.`
              : "Escolham o líder da equipe: só ele pode alterar o nome e o repositório."}
          </p>
        )}
      </section>

      {/* ------------------------------------------------ integrantes */}
      <section id="integrantes" className="card scroll-mt-24 space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Integrantes</h2>
          <span className="text-sm text-suave">
            {equipe.membros.length}/{config.max_membros}
          </span>
        </div>
        {/* key: quando o líder muda, a faixa reaparece animada. */}
        <div
          key={equipe.lider_email ?? "sem-lider"}
          className={`rounded-xl border p-3 text-sm ${
            lider ? "border-amber-400/50 bg-amber-500/10" : "border-borda bg-marca-fundo"
          }`}
          style={{ animation: "dh-sobe .5s both" }}
        >
          {lider ? (
            <p>
              <span className="text-amber-700 dark:text-amber-300">★</span> Líder: <strong>{nomeDe(lider)}</strong>
              {souLider && " (você)"}
            </p>
          ) : (
            <p className="font-semibold">A equipe ainda não escolheu um líder.</p>
          )}
          <p className="mt-1 text-xs text-suave">
            {!lider
              ? "Qualquer integrante pode definir. Depois de definido, só o líder pode passar a liderança para outra pessoa."
              : souLider
                ? "Só você (ou a organização) pode passar a liderança para outra pessoa."
                : organizador
                  ? "Como organização, você pode trocar ou tirar o líder."
                  : "Só o líder pode passar a liderança para outra pessoa."}
            {!podeGerirMembros && " Mudanças de integrantes são feitas pela organização."}
          </p>
        </div>

        <ul className="divide-y divide-borda">
          {equipe.membros
            .slice()
            .sort((a, b) => (a.inscritos?.nome ?? "").localeCompare(b.inscritos?.nome ?? ""))
            .map((m) => {
              const souEu = m.email === meuEmail;
              const ehLider = m.email === equipe.lider_email;
              return (
                <li key={m.email} className="flex items-center gap-3 py-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: "var(--grad)" }}
                  >
                    {(m.inscritos?.nome ?? m.email)[0].toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {m.inscritos?.nome ?? m.email}
                      {souEu && <span className="ml-1 text-xs text-suave">(você)</span>}
                      {ehLider && (
                        <span className="selo ml-2 bg-amber-500/15 align-middle text-amber-800 dark:text-amber-300">
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
                    {/* key com o líder atual: ao trocar o líder, os formulários são recriados
                        e mensagens antigas ("Líder definido.") não ficam penduradas. */}
                    {!ehLider && podeMexerLider && (
                      <Formulario
                        key={`lider-${m.email}-${equipe.lider_email ?? ""}`}
                        action={definirLider}
                        className="flex flex-col items-end"
                        rotuloConfirmar={souLider ? "Passar liderança" : "Tornar líder"}
                        confirmar={
                          souLider
                            ? `Passar a liderança para ${nomeDe(m)}? Você deixa de ser líder e só ${nomeDe(m)} poderá trocar de novo.`
                            : lider
                              ? `Trocar o líder para ${nomeDe(m)}?`
                              : `Tornar ${nomeDe(m)} líder da equipe? Depois disso, só o líder poderá passar a liderança para outra pessoa.`
                        }
                      >
                        <input type="hidden" name="equipe_id" value={equipe.id} />
                        <input type="hidden" name="email" value={m.email} />
                        <BotaoEnviar className="btn-secundario min-h-9 px-3 text-xs">
                          {souLider ? "Passar liderança" : "Tornar líder"}
                        </BotaoEnviar>
                      </Formulario>
                    )}
                    {ehLider && organizador && podeEditar && (
                      <Formulario
                        key={`tirar-${m.email}`}
                        action={definirLider}
                        className="flex flex-col items-end"
                        confirmar={`Tirar ${nomeDe(m)} da liderança? A equipe fica sem líder.`}
                        rotuloConfirmar="Tirar líder"
                      >
                        <input type="hidden" name="equipe_id" value={equipe.id} />
                        <input type="hidden" name="email" value="" />
                        <BotaoEnviar className="btn-secundario min-h-9 px-3 text-xs">Tirar líder</BotaoEnviar>
                      </Formulario>
                    )}
                    {podeGerirMembros && (
                      <Formulario
                        action={removerMembro}
                        confirmar={`Remover ${m.inscritos?.nome ?? m.email} da equipe?`}
                        rotuloConfirmar="Remover"
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
                <Formulario action={removerLink} confirmar="Remover este link?" rotuloConfirmar="Remover">
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
  );
}

function StatusRepo({ equipe }: { equipe: Equipe }) {
  if (equipe.repo_publico === true)
    return <span className="selo bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">✔ Público</span>;
  if (equipe.repo_publico === false)
    return (
      <span className="selo bg-red-500/15 text-red-700 dark:text-red-300">
        ⚠ Não encontrado ou privado
      </span>
    );
  return <span className="selo bg-amber-500/15 text-amber-800 dark:text-amber-300">Não verificado</span>;
}
