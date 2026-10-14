import { SubAbasPessoas } from "@/app/admin/pessoas/SubAbasPessoas";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { listarParticipantes } from "@/modules/pessoas/infra/repositorio";
import { AjudaPresenca, ChamadaPresenca } from "@/modules/pessoas/ui/ChamadaPresenca";
import { AutoAtualizar } from "@/shared/ui/AutoAtualizar";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Pessoas → Presença: a chamada do evento (a mentoria usa a mesma tela).
export default async function AdminPresenca() {
  const { cliente, edicao } = await sessaoAtual();
  const pessoas = await listarParticipantes(cliente, edicao.id);
  const alunos = pessoas.filter((p) => p.papel === "aluno");

  return (
    <Pagina>
      {/* Organização e mentores marcam ao mesmo tempo: a lista se atualiza sozinha. */}
      <AutoAtualizar segundos={30} />
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Pessoas", href: "/admin/pessoas" }, { rotulo: "Presença" }]}
        titulo="Presença no evento"
        destaque="Presença"
        descricao={`Chamada dos alunos da ${edicao.nome}. Organização e mentores podem marcar.`}
        acoes={<AjudaPresenca />}
      />
      <SubAbasPessoas ativa="presenca" pessoas={pessoas.length} alunos={alunos.length} />
      <ChamadaPresenca alunos={alunos} />
    </Pagina>
  );
}
