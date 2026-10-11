import Link from "next/link";
import { carregarPainel } from "@/modules/painel/application/consultas";
import { ListaPendencias, NumerosEvento } from "@/modules/painel/ui/Painel";
import { Andamento } from "@/modules/avaliacao/ui/Andamento";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { primeiroNome } from "@/shared/lib/texto";
import { BoasVindas, BotaoAjuda } from "@/shared/ui/Ajuda";
import { AutoAtualizar } from "@/shared/ui/AutoAtualizar";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Painel da organização: o estado do evento e o que precisa de atenção agora.
export default async function PainelOrganizacao() {
  const { cliente, usuario, edicao } = await sessaoAtual();
  const { resumo, pendencias, andamento, encerrada } = await carregarPainel(cliente, edicao);

  return (
    <Pagina>
      <AutoAtualizar segundos={45} />
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização" }, { rotulo: "Painel" }]}
        titulo={`Olá, ${primeiroNome(usuario.nome)}`}
        destaque={primeiroNome(usuario.nome)}
        descricao={`O estado do evento agora. Avaliação ${encerrada ? "encerrada" : "aberta"}. Atualiza sozinho a cada 45 segundos.`}
        acoes={
          <>
            <BotaoAjuda titulo="Painel da organização">
              <p>Aqui fica o resumo do evento e a lista do que precisa de atenção.</p>
              <ul>
                <li>Clique num número para ir direto à tela correspondente.</li>
                <li>Cada pendência tem um botão que leva ao lugar onde ela se resolve.</li>
                <li>
                  Use <strong>Ctrl+K</strong> para buscar qualquer equipe ou pessoa e <strong>?</strong> para ver os atalhos.
                </li>
              </ul>
            </BotaoAjuda>
            <BotaoLink href="/avaliar" variante="primario" icone="editar">
              Lançar notas
            </BotaoLink>
          </>
        }
      />

      <BoasVindas id="organizacao" titulo="Bem-vindo(a) à área da organização">
        As abas seguem a ordem do evento: <strong>Equipes</strong> (formação, trocas e gerador), <strong>Avaliação</strong>,{" "}
        <strong>Ranking</strong> e, em “Mais”, <strong>Pessoas</strong> e <strong>Materiais</strong>. Aperte <strong>Ctrl+K</strong> em
        qualquer tela para buscar.
      </BoasVindas>

      <NumerosEvento r={resumo} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Precisa de atenção ({pendencias.length})</h2>
          <Link href="/admin/equipes" className="text-sm text-marca hover:underline">
            Ver todas as equipes
          </Link>
        </div>
        <ListaPendencias pendencias={pendencias} />
      </section>

      {resumo.fichasEsperadas > 0 && <Andamento itens={andamento} />}
    </Pagina>
  );
}
