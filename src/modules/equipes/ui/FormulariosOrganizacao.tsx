import { salvarRegrasEquipes } from "@/modules/edicoes/application/actions";
import { MODOS_FORMACAO, type Edicao } from "@/modules/edicoes/domain/tipos";
import { arquivarEquipe, criarEquipe } from "@/modules/equipes/application/actions";
import type { Equipe } from "@/modules/equipes/domain/tipos";
import { Aviso } from "@/shared/ui/Aviso";
import { Campo, CaixaMarcar, Selecao } from "@/shared/ui/Campo";
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

/** Regras das equipes nesta edição: como são formadas, tamanho, trocas e trava de edição. */
export function FormRegrasEquipes({ edicao }: { edicao: Edicao }) {
  return (
    <Formulario action={salvarRegrasEquipes} className="space-y-4">
      <Ocultos valores={{ id: edicao.id }} />
      <Selecao
        rotulo="Como as equipes são formadas"
        name="modo_formacao"
        defaultValue={edicao.modo_formacao}
        opcoes={MODOS_FORMACAO.map((m) => ({ valor: m.valor, rotulo: `${m.rotulo} — ${m.descricao}` }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Mínimo de integrantes" type="number" name="min_membros" min={1} max={20} required defaultValue={edicao.min_membros} />
        <Campo rotulo="Máximo de integrantes" type="number" name="max_membros" min={1} max={20} required defaultValue={edicao.max_membros} />
      </div>
      <CaixaMarcar
        name="permite_trocas"
        defaultChecked={edicao.permite_trocas}
        rotulo="Alunos podem pedir troca de equipe"
        dica="Um integrante da equipe de destino aceita e os dois trocam de lugar."
      />
      <CaixaMarcar
        name="equipes_travadas"
        defaultChecked={edicao.equipes_travadas}
        rotulo="Bloquear a edição pelos alunos"
        dica="Use no fim do prazo de entrega: os alunos só visualizam; a organização continua editando."
      />
      <BotaoEnviar icone="ok">Salvar regras</BotaoEnviar>
    </Formulario>
  );
}

/** Arquivar (não apagar) a equipe. */
export function ArquivarEquipe({ equipe }: { equipe: Equipe }) {
  return (
    <section className="card space-y-3 border-red-400/40">
      <h2 className="font-semibold text-red-600 dark:text-red-400">Arquivar equipe</h2>
      <Aviso tom="alerta">
        A equipe sai das listas e os integrantes ficam sem equipe. Nada é apagado: integrantes, links, trocas e fichas continuam
        guardados no histórico.
      </Aviso>
      <Formulario
        action={arquivarEquipe}
        tituloConfirmar={`Arquivar a ${equipe.nome}?`}
        confirmar={`Os ${equipe.membros.length} integrante(s) ficam sem equipe. Pedidos de troca aguardando são cancelados.`}
        rotuloConfirmar="Arquivar equipe"
        perigo
      >
        <Ocultos valores={{ id: equipe.id }} />
        <BotaoEnviar variante="perigo" icone="lixo">
          Arquivar equipe
        </BotaoEnviar>
      </Formulario>
    </section>
  );
}
