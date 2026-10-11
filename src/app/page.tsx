import { redirect } from "next/navigation";
import { abaDoAluno, TelaAluno } from "@/app/_shell/TelaAluno";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { inicioDoPapel } from "@/modules/pessoas/domain/papeis";

// Tela inicial do aluno: Minha equipe · Trocas · Materiais (?aba=).
// Organização e bancas não têm equipe: vão direto para a área delas.
export default async function Inicio({ searchParams }: PageProps<"/">) {
  const { cliente, usuario, avatar, simulacao } = await sessaoAtual();
  if (usuario.papel !== "aluno") redirect(inicioDoPapel(usuario.papel));
  const { aba } = await searchParams;
  return <TelaAluno cliente={cliente} aluno={usuario} avatar={avatar} aba={abaDoAluno(aba)} simulacao={simulacao} />;
}
