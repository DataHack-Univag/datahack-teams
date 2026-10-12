import { removerMaterial, restaurarMaterial, salvarMaterial } from "@/modules/materiais/application/actions";
import { CATEGORIAS_MATERIAL, rotuloMaterial, type Material } from "@/modules/materiais/domain/tipos";
import { AreaTexto, Campo, CaixaMarcar, Selecao } from "@/shared/ui/Campo";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

/** Materiais publicados pela organização (o que os alunos veem). */
export function ListaMateriais({ materiais, editavel = false }: { materiais: Material[]; editavel?: boolean }) {
  if (!materiais.length)
    return (
      <EstadoVazio icone="materiais" titulo="Nenhum material publicado ainda">
        {editavel ? "Publique acima o desafio, as fontes de dados e a documentação." : "Assim que a organização publicar, os materiais aparecem aqui."}
      </EstadoVazio>
    );
  return (
    // minmax(0,1fr) + min-w-0: links longos não empurram o cartão para fora da tela no celular.
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
      {materiais.map((m, i) => (
        <li
          key={m.id}
          className={`faixa-topo flex min-w-0 flex-col gap-2 rounded-2xl p-4 ${m.destaque ? "destaque-grad" : "border border-borda bg-superficie-solida/60"}`}
          style={{ animation: "dh-carta .6s cubic-bezier(.2,.8,.2,1) both", animationDelay: `${i * 50}ms` }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Selo tom="marca">{rotuloMaterial(m.categoria)}</Selo>
            {m.destaque && (
              <span className="selo text-white" style={{ background: "var(--grad)" }}>
                ★ destaque
              </span>
            )}
          </div>
          <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-semibold [overflow-wrap:anywhere] hover:text-marca hover:underline">
            {m.titulo} ↗
          </a>
          {m.descricao && <p className="text-sm [overflow-wrap:anywhere] text-suave">{m.descricao}</p>}
          <p className="min-w-0 truncate font-mono text-xs text-suave" title={m.url}>
            {m.url}
          </p>
          {editavel && (
            <div className="mt-auto space-y-2 border-t border-borda pt-2">
              <details>
                <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-marca select-none">
                  <Icone nome="editar" className="size-4" /> Editar
                </summary>
                <div className="mt-3">
                  <FormMaterial m={m} />
                </div>
              </details>
              <Formulario action={removerMaterial} acaoDesfazer={restaurarMaterial}>
                <Ocultos valores={{ id: m.id }} />
                <BotaoEnviar variante="perigo" tamanho="pequeno" icone="lixo">
                  Remover
                </BotaoEnviar>
              </Formulario>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Publicar ou editar um material. Sem `m` = novo. */
export function FormMaterial({ m }: { m?: Material }) {
  return (
    <Formulario action={salvarMaterial} className="grid gap-3 sm:grid-cols-2">
      {m && <Ocultos valores={{ id: m.id }} />}
      <Campo rotulo="Título" name="titulo" required maxLength={120} defaultValue={m?.titulo} placeholder="Ex.: Repositório oficial do DataHack" />
      <Selecao
        rotulo="Categoria"
        name="categoria"
        defaultValue={m?.categoria ?? "documentacao"}
        opcoes={CATEGORIAS_MATERIAL.map((c) => ({ valor: c.valor, rotulo: c.rotulo }))}
      />
      <Campo rotulo="Link" name="url" required inputMode="url" defaultValue={m?.url} placeholder="https://…" className="sm:col-span-2" />
      <AreaTexto
        rotulo="Descrição"
        name="descricao"
        maxLength={500}
        rows={2}
        defaultValue={m?.descricao ?? ""}
        placeholder="Ex.: desafios, fontes de dados e dicionários"
        className="sm:col-span-2"
      />
      <CaixaMarcar name="destaque" defaultChecked={m?.destaque} rotulo="Destacar" dica="Aparece primeiro, com borda colorida." className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <BotaoEnviar icone={m ? "ok" : "mais_novo"}>{m ? "Salvar alterações" : "Publicar material"}</BotaoEnviar>
      </div>
    </Formulario>
  );
}
