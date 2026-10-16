import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import { EquipesMentoria } from "@/modules/equipes/ui/EquipesMentoria";
import { locaisDaEdicao } from "@/modules/mapa/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { listarParticipantes } from "@/modules/pessoas/infra/repositorio";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Mentoria → Equipes: todas as equipes da edição, com quem está presente.
export default async function MentoriaEquipes() {
  const { cliente, edicao } = await sessaoAtual();
  const [equipes, pessoas, locais] = await Promise.all([listarEquipes(cliente, edicao.id), listarParticipantes(cliente, edicao.id), locaisDaEdicao(cliente, edicao.id)]);
  const alunos = pessoas.filter((p) => p.papel === "aluno");
  const presenca = Object.fromEntries(alunos.map((a) => [a.email, a.presenca]));
  const semEquipe = alunos.filter((a) => !a.equipe_id).length;

  return (
    <Pagina>
      <CabecalhoPagina
        titulo="Equipes"
        destaque="Equipes"
        descricao={`As ${equipes.length} equipes da ${edicao.nome}: integrantes, líder, quem está presente, repositório e entregas.`}
        acoes={
          <BotaoLink href="/mentoria/pessoas" icone="pessoas">
            Fazer a chamada
          </BotaoLink>
        }
      />
      {semEquipe > 0 && (
        <Aviso tom="info" titulo={`${semEquipe} participante(s) ainda sem equipe`}>
          Eles aparecem em Pessoas, com o curso e a presença.
        </Aviso>
      )}
      <EquipesMentoria equipes={equipes} presenca={presenca} locais={locais} />
    </Pagina>
  );
}
