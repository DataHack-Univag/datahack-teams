import Link from "next/link";
import { AutoAtualizar } from "@/components/AutoAtualizar";
import { ListaMateriais } from "@/components/ListaMateriais";
import { PainelEquipe } from "@/components/PainelEquipe";
import { AvisosTroca, SecaoTroca } from "@/components/Trocas";
import {
  carregarConfiguracao,
  carregarEquipeDoAluno,
  carregarEquipesResumo,
  carregarMateriais,
  carregarTrocasDoAluno,
  separarTrocas,
  sessaoAtual,
} from "@/lib/dados";
import type { Inscrito } from "@/lib/tipos";

type Cliente = Awaited<ReturnType<typeof sessaoAtual>>["supabase"];

/**
 * Conteúdo da tela inicial do aluno: a equipe dele e os materiais do evento.
 * Usado na tela real ("/") e no modo "ver como aluno" da organização
 * (mesma tela e mesmos botões; quem age é o organizador).
 */
export async function TelaAluno({
  supabase,
  aluno,
}: {
  supabase: Cliente;
  aluno: Inscrito;
}) {
  // Tudo em paralelo: uma única "rodada" até o banco.
  const [config, materiais, equipe, equipes, trocas] = await Promise.all([
    carregarConfiguracao(supabase),
    carregarMateriais(supabase),
    carregarEquipeDoAluno(supabase, aluno.email),
    carregarEquipesResumo(supabase),
    carregarTrocasDoAluno(supabase, aluno.email),
  ]);
  // trocas === null: migração 006 ainda não rodada → sem a seção de troca.
  const troca = equipe && trocas ? separarTrocas(trocas, aluno.email, equipe.id) : null;
  const souLider = !!equipe && equipe.lider_email === aluno.email;

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
      {/* Pedidos de troca chegam sem recarregar a página. */}
      <AutoAtualizar segundos={30} />
      {equipe && troca && (
        <AvisosTroca recebidos={troca.recebidos} equipes={equipes} meuEmail={aluno.email} souLider={souLider} />
      )}
      {materiais.some((m) => m.destaque) && secaoMateriais}
      {equipe ? (
        <>
          <PainelEquipe
            equipe={equipe}
            disponiveis={[]}
            config={config}
            meuEmail={aluno.email}
            organizador={false}
          />
          {troca && (
            <SecaoTroca
              equipeAtual={equipe.id}
              equipes={equipes}
              meuPedido={troca.meuPedido}
              meuUltimo={troca.meuUltimo}
              meuEmail={aluno.email}
              souLider={souLider}
              bloqueada={config.edicao_bloqueada}
            />
          )}
        </>
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
