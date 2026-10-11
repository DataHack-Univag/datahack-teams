import { adicionarLink, removerLink } from "@/modules/equipes/application/actions";
import { CATEGORIAS_LINK, rotuloCategoria, type Equipe } from "@/modules/equipes/domain/tipos";
import { Campo, Selecao } from "@/shared/ui/Campo";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

/** Links de entrega da equipe (Drive, slides, vídeo...). Remover tem "Desfazer". */
export function LinksEntrega({ equipe, podeEditar }: { equipe: Equipe; podeEditar: boolean }) {
  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Links de entrega</h2>
        <p className="text-sm text-suave">
          Pasta do Drive, apresentação, vídeo do pitch, dashboard… Links do Drive precisam estar com acesso “Qualquer pessoa
          com o link”.
        </p>
      </div>

      {equipe.links.length === 0 ? (
        <EstadoVazio icone="link" titulo="Nenhum link ainda">
          {podeEditar ? "Adicione abaixo os links que a banca vai abrir." : "A equipe ainda não cadastrou links."}
        </EstadoVazio>
      ) : (
        <ul className="space-y-2">
          {equipe.links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-xl border border-borda p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Selo tom="marca">{rotuloCategoria(l.categoria)}</Selo>
                  {l.titulo && <span className="text-sm font-medium break-words">{l.titulo}</span>}
                </div>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-xs text-marca underline-offset-4 hover:underline">
                  {l.url}
                </a>
              </div>
              {podeEditar && (
                <Formulario action={removerLink} acaoDesfazer={adicionarLink}>
                  <Ocultos valores={{ id: l.id }} />
                  <BotaoEnviar variante="perigo" tamanho="pequeno" title={`Remover o link ${l.titulo ?? rotuloCategoria(l.categoria)}`}>
                    <Icone nome="lixo" className="size-4" />
                    <span className="sr-only sm:not-sr-only">Remover</span>
                  </BotaoEnviar>
                </Formulario>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <Formulario action={adicionarLink} className="grid gap-3 border-t border-borda pt-4 sm:grid-cols-[200px_1fr]">
          <Ocultos valores={{ equipe_id: equipe.id }} />
          <Selecao rotulo="Tipo" name="categoria" required defaultValue="drive" opcoes={CATEGORIAS_LINK.map((c) => ({ valor: c.valor, rotulo: c.rotulo }))} />
          <Campo rotulo="Descrição" name="titulo" maxLength={80} placeholder="Ex.: Slides do pitch final" />
          <Campo rotulo="Link" name="url" required inputMode="url" placeholder="https://…" className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <BotaoEnviar icone="mais_novo">Adicionar link</BotaoEnviar>
          </div>
        </Formulario>
      )}
    </section>
  );
}
