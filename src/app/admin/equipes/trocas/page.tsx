import { SubAbasEquipes } from "@/app/admin/equipes/SubAbasEquipes";
import { contarParaAprovar, listarResumo } from "@/modules/equipes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { STATUS_TROCA } from "@/modules/trocas/domain/tipos";
import { historicoTrocas } from "@/modules/trocas/infra/repositorio";
import { HistoricoTrocas } from "@/modules/trocas/ui/HistoricoTrocas";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { CabecalhoPagina, Pagina, SubAbas } from "@/shared/ui/Pagina";

// Equipes → Trocas: auditoria de todos os pedidos de troca de equipe.
export default async function AdminTrocas({ searchParams }: PageProps<"/admin/equipes/trocas">) {
  const { status } = await searchParams;
  const filtro = STATUS_TROCA.find((s) => s.valor === status)?.valor ?? null;
  const { cliente, edicao } = await sessaoAtual();
  const [historico, equipes, paraAprovar] = await Promise.all([historicoTrocas(cliente, edicao.id), listarResumo(cliente, edicao.id), contarParaAprovar(cliente, edicao.id)]);
  // Nome atual da equipe; se ela foi arquivada, usa a cópia guardada no pedido.
  const nomeEquipe = (id: string | null, copia?: string | null) =>
    equipes.find((e) => e.id === id)?.nome ?? (copia ? `${copia} (arquivada)` : "(equipe arquivada)");
  const conta = (v: string) => historico.filter((t) => t.status === v).length;
  const lista = filtro ? historico.filter((t) => t.status === filtro) : historico;

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Equipes", href: "/admin/equipes" }, { rotulo: "Trocas" }]}
        titulo="Histórico de trocas"
        destaque="trocas"
        descricao="Quem pediu, de qual equipe para qual, quem respondeu e quando (horário de Cuiabá)."
        acoes={
          <BotaoAjuda titulo="Trocas de equipe">
            <ol>
              <li>O participante pede para ir para outra equipe.</li>
              <li>Qualquer integrante da equipe de destino pode aceitar: os dois trocam de lugar.</li>
              <li>Quem pediu pode cancelar; a equipe pode recusar; a organização pode cancelar qualquer pedido.</li>
            </ol>
          </BotaoAjuda>
        }
      />
      <SubAbasEquipes ativa="trocas" trocas={conta("pendente")} equipes={equipes.length} paraAprovar={paraAprovar} />
      <SubAbas
        ativa={filtro ?? "todas"}
        abas={[
          { id: "todas", rotulo: "Todas", href: "/admin/equipes/trocas", contagem: historico.length },
          ...STATUS_TROCA.map((s) => ({ id: s.valor, rotulo: s.rotulo, href: `/admin/equipes/trocas?status=${s.valor}`, contagem: conta(s.valor) })),
        ]}
      />
      <HistoricoTrocas lista={lista} nomeEquipe={nomeEquipe} filtrado={!!filtro} />
    </Pagina>
  );
}
