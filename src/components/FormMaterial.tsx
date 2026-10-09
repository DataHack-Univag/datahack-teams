import { salvarMaterial } from "@/app/actions";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { CATEGORIAS_MATERIAL, type Material } from "@/lib/tipos";

/** Publicar ou editar um material. Sem `m` = novo. */
export function FormMaterial({ m }: { m?: Material }) {
  return (
    <Formulario action={salvarMaterial} className="grid gap-3 sm:grid-cols-2">
      {m && <input type="hidden" name="id" value={m.id} />}
      <label>
        <span className="rotulo">Título</span>
        <input
          name="titulo"
          required
          maxLength={120}
          defaultValue={m?.titulo}
          placeholder="Ex.: Repositório oficial do DataHack"
          className="campo"
        />
      </label>
      <label>
        <span className="rotulo">Categoria</span>
        <select name="categoria" defaultValue={m?.categoria ?? "documentacao"} className="campo">
          {CATEGORIAS_MATERIAL.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="rotulo">URL</span>
        <input
          name="url"
          required
          inputMode="url"
          defaultValue={m?.url}
          placeholder="https://github.com/..."
          className="campo font-mono text-sm"
        />
      </label>
      <label className="sm:col-span-2">
        <span className="rotulo">Descrição (opcional)</span>
        <textarea
          name="descricao"
          maxLength={500}
          rows={2}
          defaultValue={m?.descricao ?? ""}
          placeholder="Ex.: descrição dos desafios, fontes de dados e dicionários"
          className="campo"
        />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="destaque" defaultChecked={m?.destaque} className="size-5 accent-[var(--marca)]" />
        Destacar (aparece primeiro, com borda)
      </label>
      <div className="sm:col-span-2">
        <BotaoEnviar>{m ? "Salvar" : "Publicar material"}</BotaoEnviar>
      </div>
    </Formulario>
  );
}
