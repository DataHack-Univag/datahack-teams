import { aceitarTroca, cancelarTroca, pedirTroca, recusarTroca } from "@/modules/trocas/application/actions";
import type { EquipeResumo } from "@/modules/equipes/domain/tipos";
import { nomeSolicitante, type Troca } from "@/modules/trocas/domain/tipos";
import { dataHora, plural } from "@/shared/lib/formatar";
import { primeiroNome } from "@/shared/lib/texto";
import { Aviso } from "@/shared/ui/Aviso";
import { Campo, Selecao } from "@/shared/ui/Campo";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

const nomeEquipe = (equipes: EquipeResumo[], id: string | null) => equipes.find((e) => e.id === id)?.nome ?? "outra equipe";

/**
 * Pedidos de gente de outra equipe querendo entrar na equipe do aluno. Qualquer integrante
 * pode aceitar (e troca de lugar com quem pediu) ou recusar.
 */
export function PedidosRecebidos({
  recebidos,
  equipes,
  meuEmail,
  souLider,
}: {
  recebidos: Troca[];
  equipes: EquipeResumo[];
  meuEmail: string;
  souLider: boolean;
}) {
  if (!recebidos.length) return null;
  return (
    <section className="space-y-3" aria-label="Pedidos de troca para a sua equipe">
      {recebidos.map((t) => {
        const quem = nomeSolicitante(t);
        const origem = nomeEquipe(equipes, t.equipe_origem);
        return (
          <div key={t.id} className="card destaque-grad faixa-topo space-y-3">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: "var(--grad)", animation: "dh-pulso 2s infinite" }}
              >
                <Icone nome="sino" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Pedido de troca · {dataHora(t.criado_em)}</p>
                <p className="[overflow-wrap:anywhere]">
                  <strong>{quem}</strong> ({origem}) quer entrar na sua equipe.
                </p>
                {t.mensagem && <p className="text-sm [overflow-wrap:anywhere] text-suave italic">“{t.mensagem}”</p>}
                <p className="text-sm text-suave">
                  Se você aceitar, vocês <strong className="text-foreground">trocam de lugar</strong>: você vai para a{" "}
                  <strong className="text-foreground">{origem}</strong> e {primeiroNome(quem)} entra no seu lugar.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Formulario
                key={`aceitar-${t.id}`}
                action={aceitarTroca}
                tituloConfirmar={`Trocar de lugar com ${primeiroNome(quem)}?`}
                rotuloConfirmar="Aceitar e trocar"
                confirmar={
                  <>
                    Você vai para a <strong>{origem}</strong> e {quem} entra na sua equipe.
                    {souLider && " Atenção: você é o líder, então sua equipe atual ficará sem líder."}
                  </>
                }
              >
                <Ocultos valores={{ id: t.id, como: meuEmail }} />
                <BotaoEnviar icone="trocas">Aceitar e trocar com {primeiroNome(quem)}</BotaoEnviar>
              </Formulario>
              <Formulario
                key={`recusar-${t.id}`}
                action={recusarTroca}
                rotuloConfirmar="Recusar pedido"
                perigo={false}
                confirmar={`O pedido de ${quem} é recusado e ninguém troca de equipe.`}
              >
                <Ocultos valores={{ id: t.id, como: meuEmail }} />
                <BotaoEnviar variante="secundario">Recusar</BotaoEnviar>
              </Formulario>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** "Trocar de equipe": pedir para ir para outra equipe e acompanhar o pedido. */
export function PedirTroca({
  equipeAtual,
  equipes,
  meuPedido,
  meuUltimo,
  meuEmail,
  souLider,
  bloqueada,
}: {
  equipeAtual: string;
  equipes: EquipeResumo[];
  meuPedido: Troca | null;
  meuUltimo: Troca | null;
  meuEmail: string;
  souLider: boolean;
  bloqueada: boolean;
}) {
  const outras = equipes.filter((e) => e.id !== equipeAtual);
  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Trocar de equipe</h2>
        <p className="text-sm text-suave">
          Peça para ir para outra equipe. Se alguém de lá aceitar, vocês trocam de lugar (o tamanho das equipes não muda).
        </p>
      </div>

      {meuUltimo && !meuPedido && (
        <Aviso tom={meuUltimo.status === "aceita" ? "sucesso" : "neutro"}>
          Seu pedido para a {nomeEquipe(equipes, meuUltimo.equipe_destino)}{" "}
          {meuUltimo.status === "aceita" ? "foi aceito." : meuUltimo.status === "recusada" ? "foi recusado." : "foi cancelado."}
        </Aviso>
      )}

      {meuPedido ? (
        <Aviso
          tom="alerta"
          titulo={`Aguardando resposta da ${nomeEquipe(equipes, meuPedido.equipe_destino)}`}
          acao={
            !bloqueada && (
              <Formulario
                key={`cancelar-${meuPedido.id}`}
                action={cancelarTroca}
                perigo={false}
                rotuloConfirmar="Cancelar pedido"
                confirmar={`O pedido para a ${nomeEquipe(equipes, meuPedido.equipe_destino)} é cancelado. Você pode pedir de novo depois.`}
              >
                <Ocultos valores={{ id: meuPedido.id, como: meuEmail }} />
                <BotaoEnviar variante="secundario" tamanho="pequeno">
                  Cancelar pedido
                </BotaoEnviar>
              </Formulario>
            )
          }
        >
          Pedido feito {dataHora(meuPedido.criado_em)}. Quando alguém de lá aceitar ou recusar, o resultado aparece aqui.
          {meuPedido.mensagem && <span className="mt-1 block italic">“{meuPedido.mensagem}”</span>}
        </Aviso>
      ) : bloqueada ? (
        <Aviso tom="neutro">As trocas estão bloqueadas pela organização.</Aviso>
      ) : outras.length === 0 ? (
        <EstadoVazio icone="trocas" titulo="Não há outras equipes para trocar" />
      ) : (
        <Formulario
          action={pedirTroca}
          className="grid gap-3 sm:grid-cols-2"
          tituloConfirmar="Enviar o pedido de troca?"
          rotuloConfirmar="Enviar pedido"
          confirmar={
            <>
              Se alguém da equipe escolhida aceitar, você troca de lugar com essa pessoa.
              {souLider && " Atenção: você é o líder, então sua equipe atual ficará sem líder."}
            </>
          }
        >
          <Ocultos valores={{ como: meuEmail }} />
          <Selecao
            rotulo="Quero ir para"
            name="equipe_destino"
            required
            defaultValue=""
            vazio="Escolha a equipe…"
            opcoes={outras.map((e) => ({ valor: e.id, rotulo: `${e.nome} (${plural(e.total, "integrante")})` }))}
          />
          <Campo rotulo="Mensagem" name="mensagem" maxLength={200} placeholder="Ex.: conheço o pessoal de lá" />
          {souLider && (
            <p className="text-xs text-amber-700 sm:col-span-2 dark:text-amber-300">
              Você é o líder: se a troca acontecer, sua equipe atual ficará sem líder.
            </p>
          )}
          <div className="sm:col-span-2">
            <BotaoEnviar icone="trocas">Pedir troca</BotaoEnviar>
          </div>
        </Formulario>
      )}
    </section>
  );
}
