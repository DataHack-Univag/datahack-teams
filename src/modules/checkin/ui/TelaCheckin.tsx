import { LeitorCheckin } from "@/modules/checkin/ui/LeitorCheckin";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Aviso } from "@/shared/ui/Aviso";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

/** Tela de check-in (mentoria e organização): leitor de QR e o resultado de cada leitura. */
export function TelaCheckin({ trilha, edicao, atual }: { trilha: { rotulo: string; href?: string }[]; edicao: string; atual: boolean }) {
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
      <LeitorCheckin />
    </Pagina>
  );
}
