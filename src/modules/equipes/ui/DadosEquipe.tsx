import { atualizarEquipe, verificarRepo } from "@/modules/equipes/application/actions";
import type { permissoesEquipe } from "@/modules/equipes/domain/permissoes";
import { nomeMembro, type Equipe } from "@/modules/equipes/domain/tipos";
import { StatusRepo } from "@/modules/equipes/ui/StatusRepo";
import { Aviso } from "@/shared/ui/Aviso";
import { Campo } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

type Permissoes = ReturnType<typeof permissoesEquipe>;

/** Topo do painel da equipe: nome, líder, repositório e o que falta fazer. */
export function DadosEquipe({ equipe, p, rotulo = "Sua equipe" }: { equipe: Equipe; p: Permissoes; rotulo?: string }) {
  return (
    <section className="card faixa-topo space-y-4">
      <div>
        <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{rotulo}</p>
        <h1 className="text-3xl font-extrabold break-words sm:text-4xl">
          <span className="grad-text">{equipe.nome}</span>
        </h1>
        {p.lider && (
          <p className="mt-1 truncate text-sm text-suave">
            <span className="text-amber-600 dark:text-amber-300">★</span> Líder:{" "}
            <strong className="font-semibold text-foreground">{nomeMembro(p.lider)}</strong>
            {p.souLider && " (você)"}
          </p>
        )}
      </div>

      {/* Pendências em destaque (heurística 1): o que a equipe ainda precisa fazer. */}
      {!p.lider && (
        <Aviso tom="alerta" titulo="A equipe ainda não tem líder">
          {p.podeMexerLider ? "Escolham" : "A equipe precisa escolher"} o líder na{" "}
          <a href="#integrantes" className="font-semibold underline">
            lista de integrantes
          </a>
          . É o líder quem cadastra o nome e o repositório.
        </Aviso>
      )}

      {equipe.repo_github ? (
        <div className="space-y-2 rounded-xl border border-borda p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Icone nome="github" className="size-4" /> Repositório
            </span>
            <StatusRepo equipe={equipe} />
          </div>
          <a
            href={equipe.repo_github}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-mono text-sm break-all text-marca underline-offset-4 hover:underline"
          >
            {equipe.repo_github} ↗
          </a>
          {equipe.repo_publico === false && (
            <p className="text-xs text-suave">
              A banca precisa conseguir abrir o repositório. No GitHub: Settings → General → Danger Zone → Change visibility
              → Public. Depois clique em “Verificar de novo”.
            </p>
          )}
          {p.podeEditar && (
            <Formulario action={verificarRepo} mensagemNoLugar className="flex flex-wrap items-center gap-2">
              <Ocultos valores={{ id: equipe.id }} />
              <BotaoEnviar variante="secundario" tamanho="pequeno" icone="busca" enviando="Consultando o GitHub…">
                {equipe.repo_publico === null ? "Verificar se está público" : "Verificar de novo"}
              </BotaoEnviar>
            </Formulario>
          )}
        </div>
      ) : (
        <Aviso tom="alerta" titulo={p.podeEditarDados ? "Cadastre o repositório GitHub da equipe" : "A equipe ainda não cadastrou o repositório"}>
          É obrigatório: é nele que vocês entregam o código.{" "}
          {p.podeEditarDados ? (
            <>
              Crie um repositório <strong>público</strong> em{" "}
              <a href="https://github.com/new" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                github.com/new
              </a>{" "}
              e cole o link abaixo.
            </>
          ) : (
            p.motivoSemEdicaoDados
          )}
        </Aviso>
      )}

      {p.podeEditarDados ? (
        <details className="group" open={!equipe.repo_github}>
          <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-marca select-none">
            <Icone nome="editar" className="size-4" /> Editar nome e repositório
          </summary>
          <Formulario action={atualizarEquipe} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Ocultos valores={{ id: equipe.id, repo_atual: equipe.repo_github }} />
            <Campo rotulo="Nome da equipe" name="nome" defaultValue={equipe.nome} required maxLength={60} />
            <Campo
              rotulo="Repositório GitHub (público)"
              name="repo_github"
              defaultValue={equipe.repo_github ?? ""}
              required
              inputMode="url"
              placeholder="https://github.com/usuario/repositorio"
              dica="Cole o endereço da página do repositório."
            />
            <div className="sm:col-span-2">
              <BotaoEnviar icone="ok" enviando="Salvando…">
                Salvar
              </BotaoEnviar>
            </div>
          </Formulario>
        </details>
      ) : (
        p.podeEditar &&
        equipe.repo_github && (
          <p className="flex items-center gap-1.5 text-xs text-suave">
            <Icone nome="cadeado" className="size-3.5" /> {p.motivoSemEdicaoDados}
          </p>
        )
      )}
    </section>
  );
}
