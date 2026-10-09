import Link from "next/link";
import { notFound } from "next/navigation";
import { excluirEquipe } from "@/app/actions";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { Pagina } from "@/components/Pagina";
import { PainelEquipe } from "@/components/PainelEquipe";
import { carregarConfiguracao, carregarEquipe, carregarSemEquipe, sessaoAtual } from "@/lib/dados";

// Página de uma equipe vista pela organização (pode editar qualquer equipe).
export default async function EquipeAdmin({ params }: PageProps<"/admin/equipes/[id]">) {
  const { id } = await params;
  const { supabase, inscrito } = await sessaoAtual();

  const [equipe, disponiveis, config] = await Promise.all([
    carregarEquipe(supabase, id),
    carregarSemEquipe(supabase),
    carregarConfiguracao(supabase),
  ]);
  if (!equipe) notFound();

  return (
    <Pagina estreita>
      <Link href="/admin" className="text-sm text-marca">
        ← Voltar às equipes
      </Link>

      <PainelEquipe
        equipe={equipe}
        disponiveis={disponiveis}
        config={config}
        meuEmail={inscrito.email}
        organizador
      />

      <section className="card space-y-2 border-red-400/40">
        <h2 className="font-semibold text-red-600 dark:text-red-400">Zona de perigo</h2>
        <Formulario
          action={excluirEquipe}
          confirmar={`Excluir a equipe "${equipe.nome}"? Os integrantes ficam sem equipe e os links são apagados.`}
        >
          <input type="hidden" name="id" value={equipe.id} />
          <BotaoEnviar className="btn-perigo">Excluir equipe</BotaoEnviar>
        </Formulario>
      </section>
    </Pagina>
  );
}
