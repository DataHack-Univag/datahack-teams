import { criarEquipe, excluirEquipe, salvarConfiguracao } from "@/modules/equipes/application/actions";
import type { Configuracao, Equipe } from "@/modules/equipes/domain/tipos";
import { Aviso } from "@/shared/ui/Aviso";
import { Campo, CaixaMarcar } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";

/** Criar equipe à mão (o gerador cria várias de uma vez). */
export function CriarEquipe() {
  return (
    <Formulario action={criarEquipe} className="grid gap-3 sm:grid-cols-2">
      <Ocultos valores={{ redirecionar: "admin" }} />
      <Campo rotulo="Nome da equipe" name="nome" required maxLength={60} placeholder="Ex.: Os Evadidos" />
      <Campo rotulo="Repositório GitHub (público)" name="repo_github" required inputMode="url" placeholder="https://github.com/usuario/repositorio" />
      <div className="sm:col-span-2">
        <BotaoEnviar icone="mais_novo">Criar e adicionar integrantes</BotaoEnviar>
      </div>
    </Formulario>
  );
}

export function FormConfiguracao({ config }: { config: Configuracao }) {
  return (
    <Formulario action={salvarConfiguracao} className="space-y-4">
      <Campo
        rotulo="Máximo de integrantes por equipe"
        type="number"
        name="max_membros"
        min={1}
        max={20}
        required
        defaultValue={config.max_membros}
        className="max-w-xs"
      />
      <CaixaMarcar
        name="edicao_bloqueada"
        defaultChecked={config.edicao_bloqueada}
        rotulo="Bloquear a edição pelos alunos"
        dica="Use no fim do prazo de entrega: os alunos só visualizam; a organização continua editando."
      />
      <BotaoEnviar icone="ok">Salvar configuração</BotaoEnviar>
    </Formulario>
  );
}

export function ExcluirEquipe({ equipe }: { equipe: Equipe }) {
  return (
    <section className="card space-y-3 border-red-400/40">
      <h2 className="font-semibold text-red-600 dark:text-red-400">Zona de perigo</h2>
      <Aviso tom="erro">
        Excluir apaga a equipe e os links dela. Os integrantes ficam sem equipe. Não dá para desfazer; se a equipe já tiver
        fichas de avaliação, apague as fichas antes.
      </Aviso>
      <Formulario
        action={excluirEquipe}
        tituloConfirmar={`Excluir a ${equipe.nome}?`}
        confirmar={`Os ${equipe.membros.length} integrante(s) ficam sem equipe e os ${equipe.links.length} link(s) são apagados. Essa ação não pode ser desfeita.`}
        rotuloConfirmar="Excluir equipe"
      >
        <Ocultos valores={{ id: equipe.id }} />
        <BotaoEnviar variante="perigo" icone="lixo">
          Excluir equipe
        </BotaoEnviar>
      </Formulario>
    </section>
  );
}
