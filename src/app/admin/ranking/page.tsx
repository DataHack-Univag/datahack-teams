import { carregarRanking } from "@/modules/avaliacao/application/consultas";
import { FASES } from "@/modules/avaliacao/domain/rubricas";
import { AjudaCalculo } from "@/modules/avaliacao/ui/AjudaCalculo";
import { Podio, type LinhaRanking as LinhaPodio } from "@/modules/avaliacao/ui/Podio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { plural } from "@/shared/lib/formatar";
import { primeiroNome } from "@/shared/lib/texto";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Aba "Ranking": classificação final com pódio, pronta para o telão.
export default async function AdminRanking() {
  const { cliente } = await sessaoAtual();
  const { equipes, encerrada, linhas } = await carregarRanking(cliente);

  // Só entra no pódio quem já tem alguma nota.
  const podio: LinhaPodio[] = linhas
    .filter((l) => l.fichas.length > 0)
    .map(({ equipe, resultado: r }) => ({
      id: equipe.id,
      nome: equipe.nome,
      final: r.final,
      completa: r.completa,
      penalidades: r.penalidades,
      integrantes: equipe.integrantes.map(primeiroNome),
      fases: FASES.map((f) => ({ id: f.id, nota: r.fases[f.id].nota })),
    }));
  const semNota = equipes.length - podio.length;

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Ranking" }]}
        titulo="Ranking final"
        destaque="Ranking"
        descricao={
          <>
            Nota final = média dos avaliadores em cada rubrica, com os pesos do regulamento, + penalidades.
            {semNota > 0 && ` ${plural(semNota, "equipe ainda sem nota não aparece", "equipes ainda sem nota não aparecem")}.`}
          </>
        }
        acoes={
          <>
            <AjudaCalculo />
            <BotaoLink href="/admin/avaliacao" icone="avaliacao">
              Detalhe das notas
            </BotaoLink>
          </>
        }
      />
      <Podio linhas={podio} encerrada={encerrada} />
    </Pagina>
  );
}
