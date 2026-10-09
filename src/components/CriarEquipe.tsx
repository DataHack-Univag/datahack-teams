import { criarEquipe } from "@/app/actions";
import { BotaoEnviar, Formulario } from "@/components/Formulario";

/** Formulário de criação de equipe (nome + repositório GitHub obrigatório). */
export function CriarEquipe({ paraAdmin = false }: { paraAdmin?: boolean }) {
  return (
    <Formulario action={criarEquipe} className="grid gap-3 sm:grid-cols-2">
      {paraAdmin && <input type="hidden" name="redirecionar" value="admin" />}
      <label>
        <span className="rotulo">Nome da equipe</span>
        <input name="nome" required maxLength={60} placeholder="Ex.: Os Evadidos" className="campo" />
      </label>
      <label>
        <span className="rotulo">Repositório GitHub (público)</span>
        <input
          name="repo_github"
          required
          inputMode="url"
          placeholder="https://github.com/usuario/repo"
          className="campo font-mono text-sm"
        />
      </label>
      <div className="sm:col-span-2">
        <BotaoEnviar>Criar equipe</BotaoEnviar>
      </div>
    </Formulario>
  );
}
