import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { listarParticipantes } from "@/modules/pessoas/infra/repositorio";
import { AjudaPresenca, ChamadaPresenca } from "@/modules/pessoas/ui/ChamadaPresenca";
import { AutoAtualizar } from "@/shared/ui/AutoAtualizar";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Mentoria → Pessoas: os alunos da edição e a chamada.
export default async function MentoriaPessoas() {
  const { cliente, edicao } = await sessaoAtual();
  const alunos = (await listarParticipantes(cliente, edicao.id)).filter((p) => p.papel === "aluno");

  return (
    <Pagina>
      <AutoAtualizar segundos={30} />
      <CabecalhoPagina
        titulo="Alunos e presença"
        destaque="presença"
        descricao={`Os alunos da ${edicao.nome}. Marque quem está no evento: a organização vê na hora.`}
        acoes={<AjudaPresenca />}
      />
      <ChamadaPresenca alunos={alunos} />
    </Pagina>
  );
}
