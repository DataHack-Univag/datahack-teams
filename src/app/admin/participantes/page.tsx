import { FormParticipante } from "@/components/FormParticipante";
import { ListaParticipantes } from "@/components/ListaParticipantes";
import { Pagina } from "@/components/Pagina";
import { carregarParticipantes, sessaoAtual } from "@/lib/dados";

// Aba "Participantes": lista fechada de quem pode logar, com curso, semestre e nota média.
export default async function AdminParticipantes() {
  const { supabase, inscrito } = await sessaoAtual();
  const participantes = await carregarParticipantes(supabase);
  const alunos = participantes.filter((p) => p.papel === "aluno");

  return (
    <Pagina>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Participantes</h1>
        <p className="text-sm text-suave">
          Só quem está nesta lista consegue criar senha e entrar. {alunos.length} alunos ·{" "}
          {alunos.filter((p) => !p.equipe_id).length} sem equipe · {alunos.filter((p) => p.nota == null).length} sem
          nota.
        </p>
      </div>

      <details className="card group">
        <summary className="cursor-pointer font-semibold text-marca select-none">+ Cadastrar participante</summary>
        <div className="mt-4">
          <FormParticipante />
        </div>
      </details>

      <ListaParticipantes participantes={participantes} meuEmail={inscrito.email} />
    </Pagina>
  );
}
