"use client";

import { useState } from "react";
import { reabrirChamado } from "@/modules/chamados/application/actions";
import { duracao, emMinutos, mediaAteResolver, TIPOS_CHAMADO, type ChamadoEncerrado } from "@/modules/chamados/domain/tipos";
import { IconeEquipe } from "@/modules/equipes/ui/IconeEquipe";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { FiltrosChips } from "@/shared/ui/FiltrosChips";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Selo } from "@/shared/ui/Selo";

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Cuiaba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Pedidos de ajuda já encerrados: quem pediu, o quê, quem resolveu e quanto tempo levou.
 * Filtro por situação e tipo e busca pela equipe; um pedido resolvido por engano pode ser
 * reaberto (heurística 3).
 */
export function HistoricoChamados({ chamados }: { chamados: ChamadoEncerrado[] }) {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const passa = (c: ChamadoEncerrado) =>
    (filtro === "todos" || c.situacao === filtro || c.tipo === filtro) && (!termo || (c.equipe?.nome ?? "").toLowerCase().includes(termo));
  const lista = chamados.filter(passa);
  const media = mediaAteResolver(chamados);

  if (!chamados.length)
    return (
      <EstadoVazio icone="ok" titulo="Nenhum pedido encerrado ainda">
        Quando um pedido de ajuda for resolvido (ou a equipe cancelar), ele fica guardado aqui.
      </EstadoVazio>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-suave">
        {chamados.filter((c) => c.situacao === "resolvido").length} resolvido(s) · {chamados.filter((c) => c.situacao === "cancelado").length} cancelado(s) pela
        equipe{media !== null ? ` · em média ${emMinutos(media)} até resolver` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <FiltrosChips
          opcoes={[
            { id: "todos", rotulo: "Todos", n: chamados.length },
            { id: "resolvido", rotulo: "Resolvidos", n: chamados.filter((c) => c.situacao === "resolvido").length },
            { id: "cancelado", rotulo: "Cancelados", n: chamados.filter((c) => c.situacao === "cancelado").length },
            { id: "problema", rotulo: "Problemas", n: chamados.filter((c) => c.tipo === "problema").length },
            { id: "duvida", rotulo: "Dúvidas", n: chamados.filter((c) => c.tipo === "duvida").length },
          ]}
          ativo={filtro}
          aoEscolher={setFiltro}
        />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar equipe" aria-label="Buscar equipe" className="campo min-h-9 w-full py-1 text-sm sm:ml-auto sm:w-56" />
      </div>

      {!lista.length && <p className="card text-sm text-suave">Nenhum pedido neste filtro.</p>}

      <ul className="space-y-2">
        {lista.map((c) => {
          const nome = c.equipe?.nome ?? "Equipe";
          const resolvido = c.situacao === "resolvido";
          return (
            <li key={c.id} className={`card space-y-2 border-l-4 p-3 ${c.tipo === "problema" ? "border-l-red-500/60" : "border-l-amber-500/60"}`}>
              <div className="flex flex-wrap items-start gap-3">
                <IconeEquipe equipe={{ nome, icone: c.equipe?.icone ?? null }} tamanho="size-9 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <strong>{nome}</strong>
                    <Selo tom={TIPOS_CHAMADO[c.tipo].tom}>{TIPOS_CHAMADO[c.tipo].rotulo}</Selo>
                    <Selo tom={resolvido ? "sucesso" : "neutro"}>{resolvido ? "Resolvido" : "Cancelado pela equipe"}</Selo>
                  </p>
                  <p className="text-xs text-suave">
                    Pediu {quando(c.aberto_em)} · {resolvido ? "resolvido" : "cancelado"} {quando(c.fechado_em)}
                    {duracao(c.aberto_em, c.fechado_em) ? ` (${duracao(c.aberto_em, c.fechado_em)})` : ""}
                    {c.atendente ? ` · atendido por ${c.atendente}` : ""}
                    {c.fechado_por && c.fechado_por !== c.atendente ? ` · fechado por ${c.fechado_por}` : ""}
                  </p>
                </div>
                {resolvido && (
                  <Formulario action={reabrirChamado} confirmar={`O pedido de ${nome} volta para a lista de abertos.`} tituloConfirmar="Reabrir este pedido?" rotuloConfirmar="Reabrir" perigo={false}>
                    <Ocultos valores={{ id: c.id }} />
                    <BotaoEnviar variante="secundario" tamanho="pequeno" icone="desfazer">
                      Reabrir
                    </BotaoEnviar>
                  </Formulario>
                )}
              </div>
              {c.mensagem && <p className="rounded-lg bg-marca-fundo px-3 py-2 text-sm">“{c.mensagem}”</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
