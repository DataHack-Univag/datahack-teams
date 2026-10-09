import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { TelaAluno } from "@/components/TelaAluno";
import { sessaoAtual } from "@/lib/dados";
import type { Inscrito } from "@/lib/tipos";

// "Ver como aluno": o organizador vê exatamente a tela de um aluno, sem poder alterar nada.
// Os dados vêm com a sessão do organizador (que já pode ler tudo); nada é gravado.
export default async function VerComo({ searchParams }: PageProps<"/ver-como">) {
  const { supabase, organizador } = await sessaoAtual();
  if (!organizador) redirect("/");

  const { email } = await searchParams;
  if (typeof email !== "string" || !email) redirect("/admin/participantes");

  const { data: aluno } = await supabase
    .from("inscritos")
    .select("email, nome, curso, semestre, papel")
    .eq("email", email.toLowerCase())
    .maybeSingle<Inscrito>();
  if (!aluno) notFound();

  return (
    <>
      <div className="sticky top-0 z-20 bg-amber-400 text-amber-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
          <span className="font-semibold">👁 Vendo como {aluno.nome}</span>
          <span className="hidden sm:inline">· modo simulação, nada pode ser alterado</span>
          <Link href="/admin/participantes" className="ml-auto rounded-lg bg-amber-950 px-3 py-1 font-semibold text-amber-50">
            Sair da simulação
          </Link>
        </div>
      </div>
      <Cabecalho inscrito={aluno} avatar={null} organizador={false} simulacao />
      <TelaAluno supabase={supabase} aluno={aluno} simulacao />
    </>
  );
}
