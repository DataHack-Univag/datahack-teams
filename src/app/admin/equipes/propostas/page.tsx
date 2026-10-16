import { SubAbasEquipes } from "@/app/admin/equipes/SubAbasEquipes";
import { contarEquipes, listarPropostas } from "@/modules/equipes/infra/repositorio";
import { ListaPropostas } from "@/modules/equipes/ui/Propostas";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { trocasPendentes } from "@/modules/trocas/infra/repositorio";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Equipes → Propostas: equipes propostas pelos alunos aguardando a organização.
export default async function AdminPropostas() {
  const { cliente, edicao } = await sessaoAtual();
  const [propostas, totalEquipes, trocas] = await Promise.all([
    listarPropostas(cliente, edicao.id),
    contarEquipes(cliente, edicao.id),
    trocasPendentes(cliente, edicao.id),
  ]);

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Equipes", href: "/admin/equipes" }, { rotulo: "Propostas" }]}
        titulo="Propostas de equipe"
        destaque="Propostas"
        descricao="Equipes formadas pelos próprios participantes. Com todos os convidados confirmados, a organização aprova ou recusa com um motivo."
        acoes={
          <BotaoAjuda titulo="Propostas de equipe">
            <ol>
              <li>Um participante propõe a equipe e convida os colegas (ele começa como líder).</li>
              <li>Cada colega confirma ou recusa o convite no sistema.</li>
              <li>Com todos confirmados e o mínimo de integrantes, a proposta fica “Aguardando aprovação”.</li>
              <li>A organização aprova (a equipe passa a valer) ou recusa com um motivo (os participantes ficam livres).</li>
            </ol>
          </BotaoAjuda>
        }
      />
      <SubAbasEquipes ativa="propostas" trocas={trocas.length} equipes={totalEquipes} propostas={propostas.length} />
      {edicao.modo_formacao !== "alunos_propoem" && (
        <Aviso
          tom="info"
          titulo="Nesta edição os participantes não propõem equipes"
          acao={
            <BotaoLink href="/admin/equipes#regras" tamanho="pequeno">
              Mudar as regras
            </BotaoLink>
          }
        >
          Para os participantes formarem as próprias equipes, escolha “Participantes propõem” nas regras das equipes.
        </Aviso>
      )}
      <ListaPropostas propostas={propostas} />
    </Pagina>
  );
}
