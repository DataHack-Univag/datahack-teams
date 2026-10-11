import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { iniciarSimulacao } from "@/modules/pessoas/application/simulacao";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { PAPEIS } from "@/modules/pessoas/domain/papeis";
import { buscarInscrito } from "@/modules/pessoas/infra/repositorio";
import { Icone } from "@/shared/ui/Icone";

// Confirmação do "ver como" (a simulação só começa com o clique, nunca ao abrir um link).
export default async function VerComo({ searchParams }: PageProps<"/ver-como">) {
  const { cliente, real, edicao } = await sessaoAtual();
  if (real.papel !== "organizador") redirect("/");

  const { email } = await searchParams;
  if (typeof email !== "string" || !email) redirect("/admin/pessoas");
  const alvo = await buscarInscrito(cliente, email.toLowerCase(), edicao.id);
  if (!alvo) notFound();
  if (alvo.papel === "organizador") redirect("/admin/pessoas?filtro=organizador");
  const papel = PAPEIS.find((p) => p.valor === alvo.papel);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md space-y-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-amber-400 text-amber-950">
          <Icone nome="olho" />
        </span>
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Ver o sistema como {alvo.nome}?</h1>
          <p className="text-sm text-suave">
            {papel?.rotulo}: {papel?.descricao}
          </p>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-suave">
          <li>Você vê exatamente as telas e os botões que essa pessoa vê.</li>
          {alvo.papel === "aluno" ? (
            <li>O que você alterar fica registrado como organização.</li>
          ) : (
            <li>As fichas aparecem só para consulta: nada é salvo em nome da banca.</li>
          )}
          <li>Para voltar, use “Sair da simulação” na faixa amarela.</li>
        </ul>
        <form action={iniciarSimulacao} className="flex flex-wrap gap-2">
          <input type="hidden" name="email" value={alvo.email} />
          <button className="btn-primario">
            <Icone nome="olho" className="size-4" /> Começar
          </button>
          <Link href="/admin/pessoas" className="btn-secundario">
            Cancelar
          </Link>
        </form>
      </div>
    </main>
  );
}
