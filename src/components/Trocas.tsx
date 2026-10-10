import { aceitarTroca, cancelarTroca, pedirTroca, recusarTroca } from "@/app/actions";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import type { EquipeResumo, Troca } from "@/lib/tipos";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Cuiaba",
  });

/**
 * Aviso no topo da tela: alguém de outra equipe quer entrar na equipe do aluno.
 * Qualquer integrante pode aceitar (e troca de lugar com quem pediu) ou recusar.
 */
export function AvisosTroca({
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
  const nomeEquipe = (id: string) => equipes.find((e) => e.id === id)?.nome ?? "outra equipe";

  return (
    <section className="space-y-3" aria-label="Pedidos de troca para a sua equipe">
      {recebidos.map((t) => {
        const quem = t.quem?.nome ?? t.solicitante;
        const origem = nomeEquipe(t.equipe_origem);
        return (
          <div key={t.id} className="card destaque-grad faixa-topo space-y-3">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg text-white"
                style={{ background: "var(--grad)", animation: "dh-pulso 2s infinite" }}
              >
                🔔
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
                  Pedido de troca · {quando(t.criado_em)}
                </p>
                <p className="[overflow-wrap:anywhere]">
                  <strong>{quem}</strong> ({origem}) quer entrar na sua equipe.
                </p>
                {t.mensagem && (
                  <p className="text-sm [overflow-wrap:anywhere] text-suave italic">“{t.mensagem}”</p>
                )}
                <p className="text-sm text-suave">
                  Se você aceitar, vocês <strong className="text-foreground">trocam de lugar</strong>: você vai para a{" "}
                  <strong className="text-foreground">{origem}</strong> e {quem} entra no seu lugar.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Formulario
                key={`aceitar-${t.id}`}
                action={aceitarTroca}
                rotuloConfirmar="Aceitar e trocar"
                confirmar={
                  `Trocar de lugar com ${quem}? Você vai para a ${origem} e ${quem} entra na sua equipe.` +
                  (souLider ? " Atenção: você é o líder, então sua equipe atual ficará sem líder." : "")
                }
              >
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="como" value={meuEmail} />
                <BotaoEnviar>Aceitar e trocar com {quem.split(" ")[0]}</BotaoEnviar>
              </Formulario>
              <Formulario
                key={`recusar-${t.id}`}
                action={recusarTroca}
                rotuloConfirmar="Recusar"
                confirmar={`Recusar o pedido de ${quem}? Ninguém troca de equipe.`}
              >
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="como" value={meuEmail} />
                <BotaoEnviar className="btn-secundario">Recusar</BotaoEnviar>
              </Formulario>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** Seção "Trocar de equipe": pedir para ir para outra equipe e acompanhar o pedido. */
export function SecaoTroca({
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
  const nomeEquipe = (id: string) => equipes.find((e) => e.id === id)?.nome ?? "outra equipe";

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Trocar de equipe</h2>
        <p className="text-sm text-suave">
          Peça para ir para outra equipe. Se alguém de lá aceitar, vocês trocam de lugar (o tamanho das equipes não
          muda).
        </p>
      </div>

      {/* Resultado do último pedido (últimas 24 h) */}
      {meuUltimo && !meuPedido && (
        <p
          className={`rounded-xl border p-3 text-sm ${
            meuUltimo.status === "aceita"
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-borda bg-marca-fundo text-suave"
          }`}
        >
          {meuUltimo.status === "aceita" && <>✔ Seu pedido para a {nomeEquipe(meuUltimo.equipe_destino)} foi aceito.</>}
          {meuUltimo.status === "recusada" && <>Seu pedido para a {nomeEquipe(meuUltimo.equipe_destino)} foi recusado.</>}
          {meuUltimo.status === "cancelada" && <>Seu pedido para a {nomeEquipe(meuUltimo.equipe_destino)} foi cancelado.</>}
        </p>
      )}

      {meuPedido ? (
        <div className="space-y-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3">
          <p className="text-sm">
            ⏳ Você pediu para ir para a <strong>{nomeEquipe(meuPedido.equipe_destino)}</strong> em{" "}
            {quando(meuPedido.criado_em)}. Aguardando alguém de lá aceitar.
          </p>
          {meuPedido.mensagem && <p className="text-sm text-suave italic">“{meuPedido.mensagem}”</p>}
          {!bloqueada && (
            <Formulario
              key={`cancelar-${meuPedido.id}`}
              action={cancelarTroca}
              rotuloConfirmar="Cancelar pedido"
              confirmar={`Cancelar o pedido para a ${nomeEquipe(meuPedido.equipe_destino)}?`}
            >
              <input type="hidden" name="id" value={meuPedido.id} />
              <input type="hidden" name="como" value={meuEmail} />
              <BotaoEnviar className="btn-secundario min-h-9 px-3 text-xs">Cancelar pedido</BotaoEnviar>
            </Formulario>
          )}
        </div>
      ) : bloqueada ? (
        <p className="text-sm text-suave">As trocas estão bloqueadas pela organização.</p>
      ) : outras.length === 0 ? (
        <p className="text-sm text-suave">Não há outras equipes para trocar.</p>
      ) : (
        <Formulario
          action={pedirTroca}
          className="grid gap-3 sm:grid-cols-2"
          rotuloConfirmar="Pedir troca"
          confirmar={
            "Enviar o pedido de troca? Se alguém da equipe escolhida aceitar, você troca de lugar com essa pessoa." +
            (souLider ? " Atenção: você é o líder, então sua equipe atual ficará sem líder." : "")
          }
        >
          <input type="hidden" name="como" value={meuEmail} />
          <label>
            <span className="rotulo">Quero ir para</span>
            <select name="equipe_destino" required defaultValue="" className="campo">
              <option value="" disabled>
                Escolha a equipe…
              </option>
              {outras.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} ({e.total} {e.total === 1 ? "integrante" : "integrantes"})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="rotulo">Mensagem (opcional)</span>
            <input name="mensagem" maxLength={200} placeholder="Ex.: conheço o pessoal de lá" className="campo" />
          </label>
          {souLider && (
            <p className="text-xs text-amber-700 sm:col-span-2 dark:text-amber-300">
              Você é o líder: se a troca acontecer, sua equipe atual ficará sem líder.
            </p>
          )}
          <div className="sm:col-span-2">
            <BotaoEnviar>Pedir troca</BotaoEnviar>
          </div>
        </Formulario>
      )}
    </section>
  );
}
