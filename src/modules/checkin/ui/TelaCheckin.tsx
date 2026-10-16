import type { Entrada } from "@/modules/checkin/infra/repositorio";
import { SoSeEditavel } from "@/shared/ui/SomenteLeitura";
import { LeitorCheckin } from "@/modules/checkin/ui/LeitorCheckin";
import { ListaEntradas } from "@/modules/checkin/ui/ListaEntradas";
import { AoVivo } from "@/shared/ui/AoVivo";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Aviso } from "@/shared/ui/Aviso";
import { CabecalhoPagina, Pagina, SubAbas } from "@/shared/ui/Pagina";

/**
 * Tela de check-in (mentoria e organização): a aba Leitor (câmera e o resultado de cada leitura)
 * e a aba Lista (quem entrou, quando, quem marcou, e quem falta).
 */
export function TelaCheckin({
  trilha,
  edicao,
  edicaoId,
  atual,
  base,
  aba,
  entradas,
}: {
  trilha: { rotulo: string; href?: string }[];
  edicao: string;
  edicaoId: string;
  atual: boolean;
  base: string;
  aba: "leitor" | "lista";
  entradas: Entrada[];
}) {
  const presentes = entradas.filter((e) => e.presenca === "presente").length;
  return (
    <Pagina>
      <CabecalhoPagina
        trilha={trilha}
        titulo="Check-in"
        destaque="Check-in"
        descricao={`Entrada da ${edicao}: leia o QR de cada participante para marcar a presença.`}
        acoes={
          <BotaoAjuda titulo="Check-in">
            <ul>
              <li>O participante abre o sistema no celular: o QR de entrada fica no topo da tela da equipe.</li>
              <li>Verde: presença marcada. Azul: a pessoa já tinha entrado. Vermelho: código de outra edição ou inválido.</li>
              <li>Câmera não leu? Digite o código de 8 letras que aparece embaixo do QR.</li>
              <li>A presença também pode ser marcada à mão em Pessoas e nas equipes.</li>
            </ul>
          </BotaoAjuda>
        }
      />
      {!atual && (
        <Aviso tom="alerta" titulo="Esta não é a edição atual">
          Os QR dos participantes são da edição atual. Troque de edição no topo se for fazer o check-in de outro evento.
        </Aviso>
      )}
      <SubAbas
        ativa={aba}
        abas={[
          { id: "leitor", rotulo: "Leitor", href: base },
          { id: "lista", rotulo: `Lista · ${presentes}/${entradas.length}`, href: `${base}?aba=lista` },
        ]}
      />
      {aba === "lista" ? (
        <>
          {/* Cada leitura na porta aparece aqui na hora. */}
          <AoVivo tabela="participacoes" filtro={`edicao_id=eq.${edicaoId}`} />
          <ListaEntradas entradas={entradas} />
        </>
      ) : (
        <SoSeEditavel aviso="Esta edição está encerrada: o check-in está fechado. A lista de quem entrou continua na aba “Lista”.">
          <LeitorCheckin />
        </SoSeEditavel>
      )}
    </Pagina>
  );
}
