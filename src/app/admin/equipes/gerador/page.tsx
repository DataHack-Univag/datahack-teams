import { SubAbasEquipes } from "@/app/admin/equipes/SubAbasEquipes";
import { contarEquipes } from "@/modules/equipes/infra/repositorio";
import { Gerador, type AlunoComEquipe } from "@/modules/gerador/ui/Gerador";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { listarParticipantes } from "@/modules/pessoas/infra/repositorio";

// Equipes → Gerador: monta equipes equilibradas por semestre e nota e cadastra a combinação escolhida.
export default async function AdminGerador() {
  const { cliente } = await sessaoAtual();
  const [participantes, totalEquipes] = await Promise.all([listarParticipantes(cliente), contarEquipes(cliente)]);

  const alunosTodos = participantes.filter((p) => p.papel === "aluno");
  const alunos: AlunoComEquipe[] = alunosTodos
    .filter((p) => p.semestre)
    .map((p) => ({
      email: p.email,
      nome: p.nome,
      sem: p.semestre as number,
      nota: p.nota ? p.nota : null,
      semNota: !p.nota,
      curso: (p.curso ?? "").trim().toUpperCase(),
      temEquipe: !!p.equipe_id,
    }));

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <SubAbasEquipes ativa="gerador" equipes={totalEquipes} />
      </div>
      {/* O gerador usa a largura toda (modo telão). */}
      <Gerador alunos={alunos} totalEquipes={totalEquipes} semSemestre={alunosTodos.filter((p) => !p.semestre).map((p) => p.nome)} />
    </>
  );
}
