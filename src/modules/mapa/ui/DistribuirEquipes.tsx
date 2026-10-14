"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as EventoPonteiro } from "react";
import { IconeEquipe } from "@/modules/equipes/ui/IconeEquipe";
import { alocarEquipe, desalocarEquipe } from "@/modules/mapa/application/actions";
import { locaisDasEquipes, ocupacao, type Alocacao, type EquipeNoMapa } from "@/modules/mapa/domain/alocacao";
import type { MapaDaEdicao } from "@/modules/mapa/infra/repositorio";
import { DesenhoSala } from "@/modules/mapa/ui/DesenhoSala";
import type { Acao } from "@/shared/acao/acao";
import { casaBusca } from "@/shared/lib/texto";
import { Botao } from "@/shared/ui/Botao";
import { Icone } from "@/shared/ui/Icone";
import { useToast } from "@/shared/ui/Toast";

const formData = (dados: Record<string, string | number>) => {
  const fd = new FormData();
  Object.entries(dados).forEach(([k, v]) => fd.set(k, String(v)));
  return fd;
};

/**
 * Distribuir as equipes nas bancadas:
 *  - computador: arraste a equipe da lista e solte num lugar;
 *  - celular (ou teclado): toque na equipe e depois no lugar (heurística 7);
 *  - lugar ocupado: as duas trocam; toda mudança tem "desfazer" (heurística 3);
 *  - a lista mostra onde cada equipe está e quem ainda está sem lugar (heurística 1).
 */
export function DistribuirEquipes({ mapa, equipes, alocacoes }: { mapa: MapaDaEdicao; equipes: EquipeNoMapa[]; alocacoes: Alocacao[] }) {
  const salas = mapa.pisos.flatMap((p) => p.salas.map((s) => ({ ...s, piso: p.nome })));
  const variosPisos = mapa.pisos.filter((p) => p.salas.length).length > 1;
  const [salaId, setSalaId] = useState(salas[0]?.id ?? "");
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [arraste, setArraste] = useState<{ equipe: EquipeNoMapa; x: number; y: number } | null>(null);
  const inicio = useRef<{ equipe: EquipeNoMapa; x: number; y: number } | null>(null);
  const areaMapa = useRef<HTMLElement>(null);
  const toast = useToast();

  const ocup = useMemo(() => ocupacao(mapa.elementos, alocacoes, equipes), [mapa.elementos, alocacoes, equipes]);
  const locais = useMemo(() => locaisDasEquipes(salas, mapa.elementos, alocacoes), [salas, mapa.elementos, alocacoes]);
  const lugarDe = (equipeId: string) => alocacoes.find((a) => a.equipe_id === equipeId);
  const sala = salas.find((s) => s.id === salaId);
  const elementosDaSala = mapa.elementos.filter((e) => e.sala_id === salaId);
  const equipeEscolhida = equipes.find((e) => e.id === escolhida) ?? null;
  const atualEscolhida = escolhida ? lugarDe(escolhida) : undefined;
  const comLugar = equipes.filter((e) => locais[e.id]).length;
  const lugaresTotais = mapa.elementos.reduce((t, e) => t + (e.lugares ?? 0), 0);
  const lista = equipes
    .filter((e) => !busca.trim() || casaBusca(`${e.nome} ${locais[e.id] ?? ""}`, busca))
    .sort((a, b) => Number(!!locais[a.id]) - Number(!!locais[b.id]) || a.nome.localeCompare(b.nome, "pt-BR"));

  async function executar(acao: Acao, dados: Record<string, string | number>, desfazer?: () => Promise<unknown>) {
    const r = await acao(null, formData(dados));
    if (r?.erro) toast(r.erro, { tom: "erro" });
    else if (r?.ok) toast(r.ok, { acao: desfazer ? { rotulo: "Desfazer", executar: () => void desfazer() } : undefined });
  }

  /** Volta a equipe para onde estava (ou sem lugar): também desfaz uma troca. */
  function voltarPara(equipe: EquipeNoMapa, antes: Alocacao | undefined) {
    return () =>
      antes
        ? alocarEquipe(null, formData({ equipe_id: equipe.id, elemento_id: antes.elemento_id, lugar: antes.lugar, nome: equipe.nome }))
        : desalocarEquipe(null, formData({ equipe_id: equipe.id, nome: equipe.nome }));
  }

  function colocar(equipe: EquipeNoMapa, elementoId: string, lugar: number) {
    const antes = lugarDe(equipe.id);
    const el = mapa.elementos.find((e) => e.id === elementoId);
    const onde = `${sala?.nome ?? ""} · ${el?.rotulo ?? "bancada"}${(el?.lugares ?? 1) > 1 ? ` (lugar ${lugar})` : ""}`;
    setEscolhida(null);
    void executar(alocarEquipe, { equipe_id: equipe.id, elemento_id: elementoId, lugar, nome: equipe.nome, onde }, voltarPara(equipe, antes));
  }

  function tocarLugar(elementoId: string, lugar: number) {
    if (equipeEscolhida) return colocar(equipeEscolhida, elementoId, lugar);
    // Sem equipe escolhida: tocar num lugar ocupado escolhe quem está nele (para mover).
    const quem = ocup[elementoId]?.[lugar - 1];
    if (quem) setEscolhida(quem.id);
    else toast("Escolha uma equipe na lista e depois toque no lugar.", { tom: "info" });
  }

  // Arrastar da lista (mouse e caneta; no toque, a lista continua rolando e vale o "tocar e tocar").
  function pressionar(equipe: EquipeNoMapa, ev: EventoPonteiro<HTMLButtonElement>) {
    if (ev.pointerType === "touch") return;
    inicio.current = { equipe, x: ev.clientX, y: ev.clientY };
  }
  useEffect(() => {
    function mover(ev: PointerEvent) {
      const i = inicio.current;
      if (!i) return;
      if (!arraste && Math.hypot(ev.clientX - i.x, ev.clientY - i.y) < 6) return;
      setArraste({ equipe: i.equipe, x: ev.clientX, y: ev.clientY });
    }
    function soltar(ev: PointerEvent) {
      const i = inicio.current;
      inicio.current = null;
      if (!i || !arraste) return setArraste(null);
      setArraste(null);
      const alvo = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-lugar]")?.getAttribute("data-lugar");
      if (!alvo) return;
      const [elementoId, lugar] = alvo.split(":");
      colocar(i.equipe, elementoId, Number(lugar));
    }
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
  });

  if (!salas.length)
    return <p className="card text-sm text-suave">Desenhe as salas e as bancadas em Mapa primeiro; depois as equipes são distribuídas aqui.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      {/* ------------------------------------------------ desenho (primeiro no celular) */}
      <section
        ref={areaMapa}
        className="card min-w-0 scroll-mt-20 space-y-3 p-3 sm:p-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:self-start"
        aria-label="Mapa das salas"
      >
        <div role="tablist" aria-label="Salas" className="flex gap-1 overflow-x-auto rounded-xl border border-borda-forte bg-superficie-solida p-1 [scrollbar-width:none]">
          {salas.map((s) => {
            const lugares = mapa.elementos.filter((e) => e.sala_id === s.id).reduce((t, e) => t + (e.lugares ?? 0), 0);
            const ocupados = Object.entries(ocup).filter(([id]) => mapa.elementos.find((e) => e.id === id)?.sala_id === s.id).flatMap(([, l]) => l).filter(Boolean).length;
            const atual = s.id === salaId;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={atual}
                onClick={() => setSalaId(s.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition ${
                  atual ? "text-white [background:var(--grad)]" : "text-suave hover:bg-marca-fundo hover:text-foreground"
                }`}
              >
                {variosPisos ? `${s.piso} › ${s.nome}` : s.nome}
                <span className={`rounded-full px-1.5 font-mono text-xs tabular-nums ${atual ? "bg-white/20" : "bg-marca-fundo"}`}>
                  {ocupados}/{lugares}
                </span>
              </button>
            );
          })}
        </div>

        {equipeEscolhida && (
          <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-marca-fundo px-3 py-2 text-sm">
            <IconeEquipe equipe={equipeEscolhida} tamanho="size-7 text-base" />
            <span className="min-w-0 flex-1">
              Toque num lugar para a <strong>{equipeEscolhida.nome}</strong>
              {atualEscolhida ? ` (hoje em ${locais[equipeEscolhida.id]})` : ""}.
            </span>
            {atualEscolhida && (
              <Botao
                variante="secundario"
                tamanho="pequeno"
                onClick={() => {
                  setEscolhida(null);
                  void executar(desalocarEquipe, { equipe_id: equipeEscolhida.id, nome: equipeEscolhida.nome }, voltarPara(equipeEscolhida, atualEscolhida));
                }}
              >
                Tirar do lugar
              </Botao>
            )}
            <Botao variante="fantasma" tamanho="pequeno" onClick={() => setEscolhida(null)}>
              Cancelar
            </Botao>
          </div>
        )}

        {sala && (
          <DesenhoSala
            sala={sala}
            elementos={elementosDaSala}
            ocupacao={ocup}
            aoTocarLugar={tocarLugar}
            lugarDestacado={atualEscolhida ? `${atualEscolhida.elemento_id}:${atualEscolhida.lugar}` : null}
            idSvg={`distribuir-${sala.id}`}
          />
        )}
        <p className="text-xs text-suave">
          Arraste uma equipe da lista até um lugar, ou toque na equipe e depois no lugar. Lugar ocupado: as duas equipes trocam.
        </p>
      </section>

      {/* ------------------------------------------------ equipes */}
      <aside className="card space-y-3 lg:col-start-1 lg:row-start-1 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto" aria-label="Equipes">
        <div>
          <h2 className="text-sm font-semibold">Equipes</h2>
          <p className="text-xs text-suave">
            {comLugar} de {equipes.length} com lugar · {lugaresTotais} lugar(es) no mapa
          </p>
        </div>
        <label className="relative block">
          <span className="sr-only">Buscar equipe</span>
          <Icone nome="busca" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave" />
          <input id="busca-distribuir" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar equipe…" className="campo pl-9" />
        </label>
        <ul className="space-y-1.5">
          {lista.map((e) => {
            const ativa = e.id === escolhida;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  aria-pressed={ativa}
                  onPointerDown={(ev) => pressionar(e, ev)}
                  onClick={() => {
                    setEscolhida(ativa ? null : e.id);
                    // No celular a lista fica embaixo: leva até o mapa para tocar no lugar.
                    if (!ativa && window.matchMedia("(max-width: 1023px)").matches) areaMapa.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                    ativa ? "border-magenta bg-marca-fundo ring-2 ring-magenta/30" : "border-borda-forte bg-superficie-solida hover:border-marca"
                  } ${arraste?.equipe.id === e.id ? "opacity-50" : ""}`}
                  style={{ cursor: "grab" }}
                >
                  <IconeEquipe equipe={e} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{e.nome}</span>
                    <span className={`block truncate text-xs ${locais[e.id] ? "text-suave" : "text-amber-700 dark:text-amber-300"}`}>{locais[e.id] ?? "sem lugar"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* fantasma do arraste */}
      {arraste && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-full border border-marca bg-superficie-solida px-3 py-1.5 text-sm font-semibold shadow-lg"
          style={{ left: arraste.x + 12, top: arraste.y + 12 }}
        >
          <IconeEquipe equipe={arraste.equipe} tamanho="size-6 text-sm" />
          {arraste.equipe.nome}
        </div>
      )}
    </div>
  );
}
