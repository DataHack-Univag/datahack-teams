import { definirEncerramento } from "@/modules/avaliacao/application/actions";
import { carregarRanking, paraAvaliacao } from "@/modules/avaliacao/application/consultas";
import { andamentoPorRubrica, resumirParaQuadro } from "@/modules/avaliacao/domain/consolidacao";
import { DESCLASSIFICACAO, DESEMPATE, FORMULA } from "@/modules/avaliacao/domain/rubricas";
import { AjudaCalculo } from "@/modules/avaliacao/ui/AjudaCalculo";
import { Andamento } from "@/modules/avaliacao/ui/Andamento";
import { DetalheFichas } from "@/modules/avaliacao/ui/DetalheFichas";
import { QuadroGeral } from "@/modules/avaliacao/ui/QuadroGeral";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { plural } from "@/shared/lib/formatar";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Menu } from "@/shared/ui/Menu";
import { CabecalhoPagina, Pagina, SubAbas } from "@/shared/ui/Pagina";

const ABAS = ["quadro", "andamento", "fichas"] as const;
type Aba = (typeof ABAS)[number];

// Aba "Avaliação": consolidação das fichas das bancas, andamento, penalidades e encerramento.
export default async function AdminAvaliacao({ searchParams }: PageProps<"/admin/avaliacao">) {
  const { aba: abaUrl } = await searchParams;
  const aba: Aba = ABAS.find((a) => a === abaUrl) ?? "quadro";
  const { cliente } = await sessaoAtual();
  const { equipes, fichas, encerrada, linhas } = await carregarRanking(cliente);
  const avaliadores = new Set(fichas.map((f) => f.avaliador)).size;

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Avaliação" }]}
        titulo="Notas e avaliação"
        destaque="avaliação"
        descricao={`${plural(fichas.length, "ficha", "fichas")} de ${plural(avaliadores, "avaliador", "avaliadores")}. ${FORMULA}.`}
        acoes={
          <>
            <AjudaCalculo />
            <Menu
              rotulo="Exportar"
              icone="baixar"
              titulo="Planilhas (CSV para Excel)"
              itens={[
                { rotulo: "Ranking", descricao: "Uma linha por equipe com a média de cada rubrica.", href: "/admin/avaliacao/exportar", icone: "baixar", baixar: true },
                { rotulo: "Analítico", descricao: "Todas as fases, rubricas e critérios em números.", href: "/admin/avaliacao/exportar?tipo=analitico", icone: "baixar", baixar: true },
                { rotulo: "Dados brutos", descricao: "Uma linha por critério de cada ficha (backup).", href: "/admin/avaliacao/exportar?tipo=brutos", icone: "baixar", baixar: true },
                { rotulo: "Por avaliador", descricao: "Uma linha por ficha, níveis por extenso.", href: "/admin/avaliacao/exportar?tipo=fichas", icone: "baixar", baixar: true },
              ]}
            />
            <BotaoLink href="/avaliar" variante="primario" icone="avaliacao">
              Lançar notas
            </BotaoLink>
          </>
        }
      />

      <Aviso
        tom={encerrada ? "alerta" : "info"}
        titulo={encerrada ? "Avaliação encerrada" : "Avaliação aberta"}
        acao={
          <Formulario
            action={definirEncerramento}
            tituloConfirmar={encerrada ? "Reabrir a avaliação?" : "Encerrar a avaliação?"}
            rotuloConfirmar={encerrada ? "Reabrir" : "Encerrar"}
            confirmar={encerrada ? "As bancas voltam a poder alterar as fichas." : "As bancas não poderão mais alterar as fichas. Você pode reabrir depois."}
          >
            <Ocultos valores={{ encerrar: encerrada ? "0" : "1" }} />
            <BotaoEnviar variante={encerrada ? "secundario" : "primario"} tamanho="pequeno" icone={encerrada ? "desfazer" : "cadeado"}>
              {encerrada ? "Reabrir avaliação" : "Encerrar avaliação"}
            </BotaoEnviar>
          </Formulario>
        }
      >
        {encerrada ? "As bancas só consultam as fichas; a organização ainda edita." : "As bancas podem lançar e alterar as fichas."}
      </Aviso>

      <SubAbas
        ativa={aba}
        abas={[
          { id: "quadro", rotulo: "Quadro geral", href: "/admin/avaliacao" },
          { id: "andamento", rotulo: "Andamento das bancas", href: "/admin/avaliacao?aba=andamento" },
          { id: "fichas", rotulo: "Fichas e penalidades", href: "/admin/avaliacao?aba=fichas", contagem: fichas.length },
        ]}
      />

      {equipes.length === 0 ? (
        <EstadoVazio
          icone="equipe"
          titulo="Nenhuma equipe cadastrada"
          acao={<BotaoLink href="/admin/equipes" variante="primario">Ir para Equipes</BotaoLink>}
        >
          As notas aparecem aqui depois que as equipes forem montadas e as bancas lançarem as fichas.
        </EstadoVazio>
      ) : aba === "andamento" ? (
        <Andamento itens={andamentoPorRubrica(equipes.map(paraAvaliacao), fichas)} />
      ) : aba === "fichas" ? (
        <DetalheFichas linhas={linhas} />
      ) : (
        <QuadroGeral equipes={resumirParaQuadro(linhas)} />
      )}

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Regras</h2>
        <p className="text-suave">
          Cada rubrica vale 0–100 (soma de peso do critério × fator do nível). Com mais de um avaliador na mesma rubrica,
          usa-se a média por critério. Nota final mínima 0.
        </p>
        <p className="text-suave">
          <strong className="text-foreground">Desempate:</strong> {DESEMPATE.join(" → ")}
        </p>
        <p className="text-suave">
          <strong className="text-foreground">Desclassificação:</strong> {DESCLASSIFICACAO}
        </p>
      </section>
    </Pagina>
  );
}
