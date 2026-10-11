import { permissoesEquipe } from "@/modules/equipes/domain/permissoes";
import type { Configuracao, Equipe } from "@/modules/equipes/domain/tipos";
import { DadosEquipe } from "@/modules/equipes/ui/DadosEquipe";
import { Integrantes } from "@/modules/equipes/ui/Integrantes";
import { LinksEntrega } from "@/modules/equipes/ui/LinksEntrega";
import type { Inscrito } from "@/modules/pessoas/domain/tipos";
import { Aviso } from "@/shared/ui/Aviso";

/**
 * Painel de uma equipe: dados, integrantes e links. Usado pelo aluno, pelo "ver como"
 * (organizador com os mesmos botões do aluno) e pela organização (com os controles extras).
 */
export function PainelEquipe({
  equipe,
  config,
  meuEmail,
  organizador,
  disponiveis,
  rotulo,
}: {
  equipe: Equipe;
  config: Configuracao;
  meuEmail: string;
  organizador: boolean;
  disponiveis?: Inscrito[];
  rotulo?: string;
}) {
  const p = permissoesEquipe({ equipe, config, meuEmail, organizador });
  return (
    <div className="space-y-4 sm:space-y-6">
      {config.edicao_bloqueada && (
        <Aviso tom="alerta" titulo="Edição bloqueada pela organização">
          {organizador ? "Os alunos só visualizam; você, como organização, ainda pode editar." : "Você ainda pode ver tudo, mas não alterar."}
        </Aviso>
      )}
      <DadosEquipe equipe={equipe} p={p} rotulo={rotulo} />
      <Integrantes equipe={equipe} config={config} p={p} meuEmail={meuEmail} organizador={organizador} disponiveis={disponiveis} />
      <LinksEntrega equipe={equipe} podeEditar={p.podeEditar} />
    </div>
  );
}
