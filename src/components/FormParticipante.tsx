import { salvarParticipante } from "@/app/actions";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import type { Participante } from "@/lib/tipos";

/** Formulário de cadastro/edição de participante. Sem `p` = novo cadastro. */
export function FormParticipante({ p, papelPadrao = "aluno" }: { p?: Participante; papelPadrao?: string }) {
  return (
    <Formulario action={salvarParticipante} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {p && <input type="hidden" name="email_original" value={p.email} />}
      {!p && papelPadrao === "organizador" && <input type="hidden" name="upsert" value="1" />}
      <label className="sm:col-span-2">
        <span className="rotulo">Nome</span>
        <input name="nome" required defaultValue={p?.nome} className="campo" />
      </label>
      <label className="sm:col-span-2">
        <span className="rotulo">E-mail</span>
        <input name="email" type="email" required defaultValue={p?.email} className="campo" />
      </label>
      <label>
        <span className="rotulo">Curso</span>
        <input name="curso" defaultValue={p?.curso ?? ""} placeholder="ENS" className="campo uppercase" />
      </label>
      <label>
        <span className="rotulo">Semestre</span>
        <input name="semestre" type="number" min={1} max={12} defaultValue={p?.semestre ?? ""} className="campo" />
      </label>
      <label>
        <span className="rotulo">Nota média</span>
        <input
          name="nota"
          inputMode="decimal"
          defaultValue={p?.nota != null ? String(p.nota).replace(".", ",") : ""}
          placeholder="ex.: 8,5"
          className="campo"
        />
      </label>
      <label>
        <span className="rotulo">Papel</span>
        <select name="papel" defaultValue={p?.papel ?? papelPadrao} className="campo">
          <option value="aluno">Aluno</option>
          <option value="organizador">Organizador</option>
        </select>
      </label>
      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <p className="text-xs text-suave">
          Nota vazia ou 0 = sem nota (ex.: calouro). A nota só é visível para organizadores.
        </p>
      </div>
      <div className="sm:col-span-2 lg:col-span-6">
        <BotaoEnviar>{p ? "Salvar alterações" : "Cadastrar participante"}</BotaoEnviar>
      </div>
    </Formulario>
  );
}
