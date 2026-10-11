import { cancelarTroca } from "@/modules/trocas/application/actions";
import { nomeRespondeu, nomeSolicitante, STATUS_TROCA, type Troca } from "@/modules/trocas/domain/tipos";
import { dataCompleta } from "@/shared/lib/formatar";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Selo } from "@/shared/ui/Selo";

type NomeEquipe = (id: string | null, copia?: string | null) => string;

/** Auditoria dos pedidos de troca (organização). */
export function HistoricoTrocas({ lista, nomeEquipe, filtrado }: { lista: Troca[]; nomeEquipe: NomeEquipe; filtrado: boolean }) {
  if (!lista.length)
    return (
      <EstadoVazio icone="trocas" titulo={filtrado ? "Nenhum pedido nessa situação" : "Nenhum pedido de troca ainda"}>
        {filtrado ? "Escolha outra situação acima." : "Quando um aluno pedir para trocar de equipe, o pedido aparece aqui."}
      </EstadoVazio>
    );
  return (
    <ul className="grid gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
      {lista.map((t) => (
        <ItemTroca key={t.id} t={t} nomeEquipe={nomeEquipe} />
      ))}
    </ul>
  );
}

function ItemTroca({ t, nomeEquipe }: { t: Troca; nomeEquipe: NomeEquipe }) {
  const s = STATUS_TROCA.find((x) => x.valor === t.status)!;
  const quem = nomeSolicitante(t);
  const respondeu = nomeRespondeu(t);
  const origem = nomeEquipe(t.equipe_origem, t.origem_nome);
  const destino = nomeEquipe(t.equipe_destino, t.destino_nome);

  return (
    <li className="card faixa-topo min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Selo tom={s.tom}>{s.rotulo}</Selo>
        <span className="font-mono text-xs text-suave">pedido em {dataCompleta(t.criado_em)}</span>
      </div>
      <p className="[overflow-wrap:anywhere]">
        <strong>{quem}</strong> pediu para sair da <strong>{origem}</strong> e ir para a <strong>{destino}</strong>.
      </p>
      {t.mensagem && <p className="text-sm [overflow-wrap:anywhere] text-suave italic">“{t.mensagem}”</p>}
      <div className="rounded-xl border border-borda bg-marca-fundo/50 p-3 text-sm [overflow-wrap:anywhere]">
        {t.status === "aceita" && (
          <>
            <p>
              ✔ Aceita por <strong>{respondeu ?? "?"}</strong> em {dataCompleta(t.respondido_em)}.
            </p>
            <p className="mt-1 text-xs text-suave">
              Trocaram de lugar: {quem} → {destino} · {respondeu ?? "?"} → {origem}
            </p>
          </>
        )}
        {t.status === "recusada" && (
          <p>
            Recusada por <strong>{respondeu ?? "?"}</strong> em {dataCompleta(t.respondido_em)}.
          </p>
        )}
        {t.status === "cancelada" && (
          <p>
            Cancelada em {dataCompleta(t.respondido_em)}
            {respondeu && (
              <>
                {" "}
                por <strong>{respondeu}</strong>
              </>
            )}
            .
          </p>
        )}
        {t.status === "pendente" && <p>Aguardando alguém da {destino} aceitar ou recusar.</p>}
      </div>
      {t.status === "pendente" && (
        <Formulario action={cancelarTroca} perigo={false} rotuloConfirmar="Cancelar pedido" confirmar={`O pedido de ${quem} é cancelado e ninguém troca de equipe.`}>
          <Ocultos valores={{ id: t.id }} />
          <BotaoEnviar variante="secundario" tamanho="pequeno">
            Cancelar pedido
          </BotaoEnviar>
        </Formulario>
      )}
    </li>
  );
}
