import { fecharMeuChamado, pedirAjuda } from "@/modules/chamados/application/actions";
import { espera, TIPOS_CHAMADO, type Chamado } from "@/modules/chamados/domain/tipos";
import { AreaTexto } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

/**
 * "Precisa de ajuda?" na tela da equipe. Sem pedido aberto: dois botões (dúvida/problema)
 * e um recado opcional. Com pedido aberto: o andamento, quem está indo e quanto tempo faz
 * (heurística 1), mais cancelar ou "já resolvemos" (heurística 3).
 */
export function AjudaDaEquipe({ chamado, como, local }: { chamado: Chamado | null; como: string; local?: string | null }) {
  if (chamado) {
    const tipo = TIPOS_CHAMADO[chamado.tipo];
    const indo = chamado.situacao === "em_atendimento";
    return (
      <section className={`card space-y-3 border-2 ${indo ? "border-emerald-500/60" : chamado.tipo === "problema" ? "border-red-500/60" : "border-amber-500/60"}`} aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Pedido de ajuda · {tipo.rotulo}</p>
            <h2 className="text-lg font-semibold">
              {indo ? `${chamado.atendente ?? "Alguém da mentoria"} está indo até vocês` : "Aguardando a mentoria"}
            </h2>
            <p className="text-sm text-suave">
              Pedido {espera(chamado.aberto_em)}
              {indo && chamado.atendido_em ? ` · atendimento ${espera(chamado.atendido_em)}` : ""}
              {local ? ` · vão encontrar vocês em ${local}` : ""}
            </p>
            {chamado.mensagem && <p className="mt-2 rounded-lg bg-marca-fundo px-3 py-2 text-sm">“{chamado.mensagem}”</p>}
          </div>
          <span className={`flex size-10 items-center justify-center rounded-full ${indo ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
            <Icone nome={indo ? "ok" : "relogio"} />
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Formulario action={fecharMeuChamado}>
            <Ocultos valores={{ id: chamado.id, resolvido: "1", como }} />
            <BotaoEnviar variante="secundario" tamanho="pequeno" icone="ok">
              Já resolvemos
            </BotaoEnviar>
          </Formulario>
          <Formulario action={fecharMeuChamado} confirmar="O pedido sai da lista da mentoria." tituloConfirmar="Cancelar o pedido de ajuda?" rotuloConfirmar="Cancelar pedido">
            <Ocultos valores={{ id: chamado.id, resolvido: "0", como }} />
            <BotaoEnviar variante="fantasma" tamanho="pequeno">
              Cancelar pedido
            </BotaoEnviar>
          </Formulario>
        </div>
      </section>
    );
  }

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Precisa de ajuda?</h2>
        <p className="text-sm text-suave">A mentoria vê o pedido na hora, com a sua bancada piscando no mapa, e vem até vocês.</p>
      </div>
      <Formulario action={pedirAjuda} className="space-y-3">
        <Ocultos valores={{ como }} />
        <AreaTexto rotulo="Recado para a mentoria" name="mensagem" rows={2} maxLength={300} placeholder="Ex.: não conseguimos juntar as duas bases pelo código do curso." />
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="tipo" value="duvida" className="btn-secundario border-amber-500/60">
            <Icone nome="ajuda" className="size-4" /> {TIPOS_CHAMADO.duvida.frase}
          </button>
          <button type="submit" name="tipo" value="problema" className="btn-secundario border-red-500/60">
            <Icone nome="alerta" className="size-4" /> {TIPOS_CHAMADO.problema.frase}
          </button>
        </div>
      </Formulario>
    </section>
  );
}
