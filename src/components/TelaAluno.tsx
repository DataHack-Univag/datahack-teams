import Link from "next/link";
import { ListaMateriais } from "@/components/ListaMateriais";
import { PainelEquipe } from "@/components/PainelEquipe";
import { carregarConfiguracao, carregarEquipeDoAluno, carregarMateriais, sessaoAtual } from "@/lib/dados";
import type { Inscrito } from "@/lib/tipos";

type Cliente = Awaited<ReturnType<typeof sessaoAtual>>["supabase"];

/**
 * Conteúdo da tela inicial do aluno: a equipe dele e os materiais do evento.
 * Usado na tela real ("/") e no modo "ver como aluno" da organização
 * (simulacao = mesma tela, com tudo desativado).
 */
export async function TelaAluno({
  supabase,
  aluno,
  simulacao = false,
}: {
  supabase: Cliente;
  aluno: Inscrito;
  simulacao?: boolean;
}) {
  // Tudo em paralelo: uma única "rodada" até o banco.
  const [config, materiais, equipe] = await Promise.all([
    carregarConfiguracao(supabase),
    carregarMateriais(supabase),
    carregarEquipeDoAluno(supabase, aluno.email),
  ]);

  const secaoMateriais = (
    <section className="card space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Materiais do evento</h2>
        <p className="text-sm text-suave">Desafios, documentação e dados publicados pela organização.</p>
      </div>
      <ListaMateriais materiais={materiais} />
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 sm:space-y-6 sm:py-10">
      {materiais.some((m) => m.destaque) && secaoMateriais}
      {equipe ? (
        <PainelEquipe
          equipe={equipe}
          disponiveis={[]}
          config={config}
          meuEmail={aluno.email}
          organizador={false}
          simulacao={simulacao}
        />
      ) : (
        <section className="card space-y-3">
          <h1 className="text-2xl font-bold">Olá, {aluno.nome.split(" ")[0]}!</h1>
          <p className="text-suave">
            Você ainda não está em nenhuma equipe. As equipes são formadas pela organização; assim que a sua for
            montada, ela aparece aqui com os colegas.
          </p>
          <p className="text-sm text-suave">
            Enquanto isso, já pode ir criando uma conta no{" "}
            <Link href="https://github.com/signup" target="_blank" className="text-marca underline">
              GitHub
            </Link>
            : a equipe vai precisar de um repositório <strong>público</strong> para entregar o código.
          </p>
        </section>
      )}
      {!materiais.some((m) => m.destaque) && secaoMateriais}
    </main>
  );
}
