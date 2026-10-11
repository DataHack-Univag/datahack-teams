import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { abaDoAluno, TelaAluno } from "@/app/_shell/TelaAluno";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { buscarInscrito } from "@/modules/pessoas/infra/repositorio";
import { Icone } from "@/shared/ui/Icone";

// "Ver como aluno": o organizador vê exatamente a tela de um aluno, com os mesmos botões.
// Tudo roda com a sessão do organizador: o que ele fizer aqui fica registrado como organização.
export default async function VerComo({ searchParams }: PageProps<"/ver-como">) {
  const { cliente, organizador } = await sessaoAtual();
  if (!organizador) redirect("/");

  const { email, aba } = await searchParams;
  if (typeof email !== "string" || !email) redirect("/admin/pessoas?filtro=aluno");
  const aluno = await buscarInscrito(cliente, email.toLowerCase());
  if (!aluno) notFound();

  const faixa = (
    <div role="status" className="sticky top-0 z-30 bg-amber-400 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <Icone nome="olho" className="size-4" />
        <span className="font-semibold">Vendo como {aluno.nome}</span>
        <span className="hidden sm:inline">· mesmos botões que o aluno tem · você age como organização</span>
        <Link href="/admin/pessoas?filtro=aluno" className="ml-auto rounded-lg bg-amber-950 px-3 py-1 font-semibold text-amber-50">
          Sair da simulação
        </Link>
      </div>
    </div>
  );

  return <TelaAluno cliente={cliente} aluno={aluno} avatar={null} aba={abaDoAluno(aba)} simulacao={faixa} />;
}
