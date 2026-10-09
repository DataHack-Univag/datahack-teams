import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { TelaAluno } from "@/components/TelaAluno";
import { sessaoAtual } from "@/lib/dados";

// Painel do aluno: mostra a equipe dele (montada pela organização) e os materiais do evento.
export default async function Inicio() {
  const { supabase, inscrito, avatar, organizador } = await sessaoAtual();

  // Organizadores não participam de equipes: vão para a área da organização
  // (e podem ver a tela de um aluno em "Ver como aluno").
  if (organizador) redirect("/admin");

  return (
    <>
      <Cabecalho inscrito={inscrito} avatar={avatar} organizador={false} />
      <TelaAluno supabase={supabase} aluno={inscrito} />
    </>
  );
}
