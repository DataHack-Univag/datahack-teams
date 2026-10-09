import { Gerador, type AlunoComEquipe } from "@/components/Gerador";
import { carregarParticipantes, sessaoAtual } from "@/lib/dados";
import "./arena.css";

// Aba "Gerador de equipes": monta equipes equilibradas por semestre e nota a partir
// dos participantes cadastrados e cadastra a combinação escolhida no sistema.
export default async function AdminGerador() {
  const { supabase } = await sessaoAtual();
  const [participantes, { count }] = await Promise.all([
    carregarParticipantes(supabase),
    supabase.from("equipes").select("*", { count: "exact", head: true }),
  ]);

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
    <Gerador
      alunos={alunos}
      totalEquipes={count ?? 0}
      semSemestre={alunosTodos.filter((p) => !p.semestre).map((p) => p.nome)}
    />
  );
}
