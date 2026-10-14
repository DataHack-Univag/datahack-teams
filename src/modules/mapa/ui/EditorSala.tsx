"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as EventoPonteiro } from "react";
import { adicionarModelo, ajustarElementos, duplicarElementos, duplicarSala, removerElementos } from "@/modules/mapa/application/actions";
import { medida, type Modelo } from "@/modules/mapa/domain/catalogo";
import { ALCAS, caixaDoGrupo, caixaEntre, deslocamentoDoGrupo, medidasDaCaixa, redimensionar, tocados, type Alca, type Caixa } from "@/modules/mapa/domain/edicao";
import { caixa, dentroDaSala, type Elemento, type Sala } from "@/modules/mapa/domain/tipos";
import { DesenhoSala } from "@/modules/mapa/ui/DesenhoSala";
import { Catalogo, encostados, FormFileira, FormSala, PainelElemento, PainelLateral, PainelVarios } from "@/modules/mapa/ui/PainelEditor";
import type { Acao } from "@/shared/acao/acao";
import { BotaoLink } from "@/shared/ui/Botao";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";
import { useToast } from "@/shared/ui/Toast";

type Ponto = { x: number; y: number };
type Interacao =
  | { tipo: "mover"; inicio: Ponto; originais: Map<string, Ponto>; grupo: Caixa; moveu: boolean }
  | { tipo: "alca"; id: string; alca: Alca; inicio: Ponto; original: Caixa; antes: Elemento; moveu: boolean }
  | { tipo: "selecao"; inicio: Ponto; somar: boolean };
/** Painéis que se abrem pela barra (as propriedades abrem sozinhas quando há algo escolhido). */
type PainelExtra = "fileira" | "sala" | null;

const formData = (dados: Record<string, string | number>) => {
  const fd = new FormData();
  Object.entries(dados).forEach(([k, v]) => fd.set(k, String(v)));
  return fd;
};
const posicao = (e: Elemento) => ({ id: e.id, x_cm: e.x_cm, y_cm: e.y_cm, largura_cm: e.largura_cm, profundidade_cm: e.profundidade_cm, rotacao: e.rotacao });
const CURSOR: Record<Alca, string> = { n: "ns-resize", s: "ns-resize", l: "ew-resize", o: "ew-resize", nl: "nesw-resize", so: "nesw-resize", no: "nwse-resize", sl: "nwse-resize" };

/**
 * Editor da sala em tela cheia: o desenho ocupa tudo e os painéis abrem nas laterais.
 *  - arrastar move (encaixa de 10 em 10 cm); as alças redimensionam para qualquer tamanho;
 *  - Shift/Ctrl + toque, "Selecionar vários" ou um retângulo no vazio escolhem vários: movem,
 *    giram, duplicam e saem juntos (heurística 7);
 *  - teclado: setas, R gira, Delete tira, Ctrl+D duplica, Ctrl+A escolhe tudo, Esc desmarca;
 *  - criar, duplicar e tirar têm "desfazer"; medidas em metros (heurísticas 2 e 3).
 */
export function EditorSala({ sala, elementos: doServidor, piso }: { sala: Sala; elementos: Elemento[]; piso?: string | null }) {
  const [elementos, setElementos] = useState(doServidor);
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [varios, setVarios] = useState(false);
  const [catalogo, setCatalogo] = useState(true);
  const [extra, setExtra] = useState<PainelExtra>(null);
  const [retangulo, setRetangulo] = useState<Caixa | null>(null);
  const [cheia, setCheia] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const interacao = useRef<Interacao | null>(null);
  const teclas = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  // Os dados do servidor mandam, exceto no meio de um gesto; quem saiu do mapa sai da seleção.
  useEffect(() => {
    if (interacao.current) return;
    setElementos(doServidor);
    setSelecao((s) => new Set([...s].filter((id) => doServidor.some((e) => e.id === id))));
  }, [doServidor]);

  // No celular o catálogo começa fechado (o desenho fica com a tela toda).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só no navegador se sabe o tamanho da tela
    if (window.matchMedia("(max-width: 1023px)").matches) setCatalogo(false);
    const aoMudar = () => setCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  const escolhidos = elementos.filter((e) => selecao.has(e.id));
  const unico = escolhidos.length === 1 ? escolhidos[0] : null;
  const lugares = elementos.reduce((t, e) => t + (e.lugares ?? 0), 0);
  // Fileira/sala quando pedidos pela barra; senão, as propriedades do que estiver escolhido.
  const painel = extra ?? (escolhidos.length ? "item" : null);

  async function executar(acao: Acao, dados: Record<string, string | number>, desfazer?: Acao) {
    const r = await acao(null, formData(dados));
    if (r?.erro) toast(r.erro, { tom: "erro" });
    else if (r?.ok)
      toast(r.ok, { acao: desfazer && r.desfazer ? { rotulo: "Desfazer", executar: () => void desfazer(null, formData(r.desfazer!)) } : undefined });
    return r;
  }
  const salvarAjustes = (itens: ReturnType<typeof posicao>[], mensagem?: string, anteriores?: ReturnType<typeof posicao>[]) =>
    executar(ajustarElementos, { itens: JSON.stringify(itens), ...(mensagem ? { mensagem } : {}), ...(anteriores ? { anteriores: JSON.stringify(anteriores) } : {}) }, ajustarElementos);

  /** Ponto do ponteiro em centímetros da sala. */
  function pontoNaSala(ev: { clientX: number; clientY: number }): Ponto {
    const el = area.current?.querySelector("svg");
    const matriz = el?.getScreenCTM();
    if (!el || !matriz) return { x: 0, y: 0 };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matriz.inverse());
    return { x: p.x, y: p.y };
  }
  const capturar = (id: number) => (area.current?.querySelector("svg") as SVGSVGElement | null)?.setPointerCapture(id);

  function iniciarMovimento(ids: Set<string>, ev: { clientX: number; clientY: number }) {
    const lista = elementos.filter((e) => ids.has(e.id));
    if (!lista.length) return;
    interacao.current = {
      tipo: "mover",
      inicio: pontoNaSala(ev),
      originais: new Map(lista.map((e) => [e.id, { x: e.x_cm, y: e.y_cm }])),
      grupo: caixaDoGrupo(lista),
      moveu: false,
    };
  }

  function pressionarItem(e: Elemento, ev: EventoPonteiro<SVGGElement>) {
    ev.preventDefault();
    ev.stopPropagation();
    area.current?.focus();
    setExtra(null);
    const somar = ev.shiftKey || ev.ctrlKey || ev.metaKey || varios;
    let nova = selecao;
    if (somar) {
      nova = new Set(selecao);
      if (nova.has(e.id)) nova.delete(e.id);
      else nova.add(e.id);
    } else if (!selecao.has(e.id)) nova = new Set([e.id]);
    setSelecao(nova);
    if (nova.has(e.id)) {
      iniciarMovimento(nova, ev);
      capturar(ev.pointerId);
    }
  }

  function pressionarAlca(alca: Alca, ev: EventoPonteiro<SVGRectElement>) {
    if (!unico) return;
    ev.preventDefault();
    ev.stopPropagation();
    interacao.current = { tipo: "alca", id: unico.id, alca, inicio: pontoNaSala(ev), original: caixa(unico), antes: unico, moveu: false };
    capturar(ev.pointerId);
  }

  function pressionarVazio(ev: EventoPonteiro<HTMLDivElement>) {
    if ((ev.target as Element).closest("[data-elemento],[data-alca]")) return;
    area.current?.focus();
    const somar = ev.shiftKey || ev.ctrlKey || ev.metaKey || varios;
    if (!somar) setSelecao(new Set());
    interacao.current = { tipo: "selecao", inicio: pontoNaSala(ev), somar };
    capturar(ev.pointerId);
  }

  function mover(ev: EventoPonteiro<HTMLDivElement>) {
    const i = interacao.current;
    if (!i) return;
    const p = pontoNaSala(ev);
    if (i.tipo === "mover") {
      const d = deslocamentoDoGrupo(i.grupo, p.x - i.inicio.x, p.y - i.inicio.y, sala);
      if (d.dx || d.dy) i.moveu = true;
      setElementos((lista) => lista.map((e) => (i.originais.has(e.id) ? { ...e, x_cm: i.originais.get(e.id)!.x + d.dx, y_cm: i.originais.get(e.id)!.y + d.dy } : e)));
    } else if (i.tipo === "alca") {
      const nova = redimensionar(i.original, i.alca, p.x - i.inicio.x, p.y - i.inicio.y, sala);
      i.moveu = true;
      setElementos((lista) => lista.map((e) => (e.id === i.id ? { ...e, ...medidasDaCaixa(e, nova) } : e)));
    } else setRetangulo(caixaEntre(i.inicio, p));
  }

  function soltar() {
    const i = interacao.current;
    interacao.current = null;
    if (!i) return;
    if (i.tipo === "selecao") {
      if (retangulo && retangulo.largura + retangulo.profundidade > 10) {
        const ids = tocados(elementos, retangulo);
        setSelecao((s) => new Set(i.somar ? [...s, ...ids] : ids));
      }
      setRetangulo(null);
      return;
    }
    if (!i.moveu) return;
    if (i.tipo === "mover") void salvarAjustes(elementos.filter((e) => i.originais.has(e.id)).map(posicao));
    else {
      const e = elementos.find((x) => x.id === i.id);
      if (e) void salvarAjustes([posicao(e)], `${e.rotulo || "Item"}: ${medida(e.largura_cm)} × ${medida(e.profundidade_cm)}.`, [posicao(i.antes)]);
    }
  }

  // ---------------------------------------------------------------- comandos da seleção
  function girar() {
    if (!escolhidos.length) return;
    const antes = escolhidos.map(posicao);
    const depois = escolhidos.map((e) => {
      const g = { ...e, rotacao: (e.rotacao + 90) % 360 };
      const p = dentroDaSala(sala, g, g.x_cm, g.y_cm);
      return posicao({ ...g, x_cm: p.x, y_cm: p.y });
    });
    setElementos((lista) => lista.map((e) => ({ ...e, ...(depois.find((d) => d.id === e.id) ?? {}) })));
    void salvarAjustes(depois, escolhidos.length > 1 ? `${escolhidos.length} itens girados.` : "Girado 90°.", antes);
  }
  async function duplicar() {
    if (!escolhidos.length) return;
    const r = await executar(duplicarElementos, { sala_id: sala.id, ids: JSON.stringify(escolhidos.map((e) => e.id)) }, removerElementos);
    if (r?.desfazer?.ids) setSelecao(new Set(JSON.parse(r.desfazer.ids) as string[]));
  }
  function tirar() {
    if (!escolhidos.length) return;
    const ids = escolhidos.map((e) => e.id);
    setSelecao(new Set());
    void executar(removerElementos, { ids: JSON.stringify(ids) }, removerElementos);
  }
  async function colocar(modelo: Modelo) {
    const r = await executar(adicionarModelo, { sala_id: sala.id, modelo: modelo.id }, removerElementos);
    if (r?.desfazer?.id) setSelecao(new Set([r.desfazer.id]));
  }

  function teclado(ev: KeyboardEvent<HTMLDivElement>) {
    const ctrl = ev.ctrlKey || ev.metaKey;
    if (ctrl && (ev.key === "a" || ev.key === "A")) {
      ev.preventDefault();
      return setSelecao(new Set(elementos.map((e) => e.id)));
    }
    if (ev.key === "Escape") return setSelecao(new Set());
    if (!escolhidos.length) return;
    const passo = ev.shiftKey ? 50 : 10;
    const delta = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[ev.key];
    if (delta) {
      ev.preventDefault();
      const d = deslocamentoDoGrupo(caixaDoGrupo(escolhidos), delta[0], delta[1], sala);
      const novos = escolhidos.map((e) => posicao({ ...e, x_cm: e.x_cm + d.dx, y_cm: e.y_cm + d.dy }));
      setElementos((lista) => lista.map((e) => ({ ...e, ...(novos.find((n) => n.id === e.id) ?? {}) })));
      if (teclas.current) clearTimeout(teclas.current);
      teclas.current = setTimeout(() => void salvarAjustes(novos), 500);
    } else if (!ctrl && (ev.key === "r" || ev.key === "R")) {
      ev.preventDefault();
      girar();
    } else if (ctrl && (ev.key === "d" || ev.key === "D")) {
      ev.preventDefault();
      void duplicar();
    } else if (ev.key === "Delete" || ev.key === "Backspace") {
      ev.preventDefault();
      tirar();
    }
  }

  async function telaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await raiz.current?.requestFullscreen();
    } catch {
      toast("O navegador não deixou abrir em tela cheia.", { tom: "info" });
    }
  }

  // Alças (um item) ou contorno do grupo (vários), por cima do desenho e na mesma escala.
  const tamAlca = Math.max(12, Math.round(Math.max(sala.largura_cm, sala.profundidade_cm) / 55));
  const camada = (
    <>
      {unico && <Alcas caixa={caixa(unico)} tamanho={tamAlca} aoPressionar={pressionarAlca} />}
      {escolhidos.length > 1 &&
        (() => {
          const g = caixaDoGrupo(escolhidos);
          return <rect x={g.x - 14} y={g.y - 14} width={g.largura + 28} height={g.profundidade + 28} fill="none" stroke="var(--magenta)" strokeWidth={2} strokeDasharray="10 8" pointerEvents="none" />;
        })()}
      {retangulo && (
        <rect
          x={retangulo.x}
          y={retangulo.y}
          width={retangulo.largura}
          height={retangulo.profundidade}
          fill="color-mix(in srgb, var(--magenta) 10%, transparent)"
          stroke="var(--magenta)"
          strokeWidth={2}
          strokeDasharray="8 6"
          pointerEvents="none"
        />
      )}
    </>
  );

  return (
    <div
      ref={raiz}
      className={`flex flex-col bg-background ${cheia ? "h-dvh" : "h-[calc(100dvh-8.75rem)] sm:h-[calc(100dvh-7.5rem)]"}`}
    >
      {/* ------------------------------------------------ barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-borda px-2 py-2 sm:px-3">
        <BotaoLink href="/admin/mapa" variante="fantasma" tamanho="pequeno" icone="voltar" aria-label="Voltar para o mapa">
          Mapa
        </BotaoLink>
        <div className="mr-auto min-w-0 px-1">
          <p className="truncate text-sm font-semibold">
            {piso ? `${piso} › ` : ""}
            {sala.nome}
          </p>
          <p className="truncate text-[11px] text-suave">
            {medida(sala.largura_cm)} × {medida(sala.profundidade_cm)} · {elementos.length} item(ns) · {lugares} lugar(es) para equipes
          </p>
        </div>
        <Ferramenta icone="mais_novo" ativo={catalogo} aoTocar={() => setCatalogo((v) => !v)} rotulo="Modelos" />
        <Ferramenta icone="ok" ativo={varios} aoTocar={() => setVarios((v) => !v)} rotulo="Selecionar vários" curto="Vários" />
        <Ferramenta icone="copiar" ativo={painel === "fileira"} aoTocar={() => setExtra((p) => (p === "fileira" ? null : "fileira"))} rotulo="Fileira" />
        <Ferramenta icone="editar" ativo={painel === "sala"} aoTocar={() => setExtra((p) => (p === "sala" ? null : "sala"))} rotulo="Sala" />
        <Ferramenta icone="mapa" aoTocar={() => void executar(duplicarSala, { id: sala.id })} rotulo="Duplicar sala" curto="Copiar sala" />
        <Ferramenta icone="telao" ativo={cheia} aoTocar={() => void telaCheia()} rotulo={cheia ? "Sair da tela cheia" : "Tela cheia"} curto="Tela cheia" />
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* ------------------------------------------------ catálogo (lateral esquerda) */}
        {catalogo && (
          <aside className="absolute inset-y-0 left-0 z-20 w-64 overflow-y-auto border-r border-borda bg-superficie-solida p-3 shadow-xl lg:static lg:shadow-none" aria-label="Modelos prontos">
            <PainelLateral titulo="Colocar na sala" aoFechar={() => setCatalogo(false)}>
              <Catalogo aoColocar={(x) => void colocar(x)} />
            </PainelLateral>
          </aside>
        )}

        {/* ------------------------------------------------ desenho */}
        <div
          ref={area}
          tabIndex={0}
          role="application"
          aria-label={`Desenho da sala ${sala.nome}. Setas movem, R gira, Delete tira, Ctrl+D duplica, Ctrl+A escolhe tudo.`}
          onKeyDown={teclado}
          onPointerDown={pressionarVazio}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          className="min-w-0 flex-1 touch-none p-2 outline-none focus-visible:ring-1 focus-visible:ring-borda-forte focus-visible:ring-inset sm:p-4"
        >
          <DesenhoSala
            sala={sala}
            elementos={elementos}
            selecionados={selecao}
            grade
            fundo
            aoPressionar={pressionarItem}
            idSvg={`sala-${sala.id}`}
            className="h-full"
          >
            {camada}
          </DesenhoSala>
        </div>

        {/* ------------------------------------------------ propriedades (lateral direita) */}
        {painel && (
          <aside className="absolute inset-y-0 right-0 z-20 w-80 max-w-[90vw] overflow-y-auto border-l border-borda bg-superficie-solida p-3 shadow-xl lg:static lg:shadow-none" aria-label="Propriedades">
            {painel === "fileira" ? (
              <PainelLateral titulo="Colocar uma fileira" aoFechar={() => setExtra(null)}>
                <FormFileira salaId={sala.id} />
              </PainelLateral>
            ) : painel === "sala" ? (
              <PainelLateral titulo="Medidas e fundo da sala" aoFechar={() => setExtra(null)}>
                <FormSala sala={sala} />
              </PainelLateral>
            ) : unico ? (
              <PainelLateral titulo="Item escolhido" aoFechar={() => setSelecao(new Set())}>
                <PainelElemento
                  key={`${unico.id}-${unico.x_cm}-${unico.y_cm}-${unico.rotacao}-${unico.largura_cm}-${unico.profundidade_cm}`}
                  e={unico}
                  encostando={encostados(unico, elementos)}
                  girar={girar}
                  duplicar={() => void duplicar()}
                  tirar={tirar}
                />
              </PainelLateral>
            ) : escolhidos.length > 1 ? (
              <PainelLateral titulo="Vários itens" aoFechar={() => setSelecao(new Set())}>
                <PainelVarios itens={escolhidos} girar={girar} duplicar={() => void duplicar()} tirar={tirar} aoLimpar={() => setSelecao(new Set())} />
              </PainelLateral>
            ) : null}
          </aside>
        )}
      </div>

      <p className="border-t border-borda px-3 py-1.5 text-[11px] text-suave">
        {varios ? "Modo vários: toque nos itens para juntar ou tirar da seleção. " : null}
        <span className="sm:hidden">Toque para escolher · arraste para mover · puxe as alças para mudar o tamanho.</span>
        <span className="hidden sm:inline">
          {varios ? "" : "Shift ou Ctrl + clique escolhe vários; arraste no vazio para escolher com um retângulo. "}
          Alças redimensionam · setas movem (Shift: 50 cm) · <kbd>R</kbd> gira · <kbd>Delete</kbd> tira · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplica · <kbd>Ctrl</kbd>+<kbd>A</kbd> escolhe tudo
        </span>
      </p>
    </div>
  );
}

/** As 8 alças de redimensionar em volta do item escolhido. */
function Alcas({ caixa: c, tamanho, aoPressionar }: { caixa: Caixa; tamanho: number; aoPressionar: (a: Alca, ev: EventoPonteiro<SVGRectElement>) => void }) {
  const pos: Record<Alca, Ponto> = {
    no: { x: c.x, y: c.y },
    n: { x: c.x + c.largura / 2, y: c.y },
    nl: { x: c.x + c.largura, y: c.y },
    l: { x: c.x + c.largura, y: c.y + c.profundidade / 2 },
    sl: { x: c.x + c.largura, y: c.y + c.profundidade },
    s: { x: c.x + c.largura / 2, y: c.y + c.profundidade },
    so: { x: c.x, y: c.y + c.profundidade },
    o: { x: c.x, y: c.y + c.profundidade / 2 },
  };
  return ALCAS.map((a) => (
    <rect
      key={a}
      data-alca={a}
      x={pos[a].x - tamanho / 2}
      y={pos[a].y - tamanho / 2}
      width={tamanho}
      height={tamanho}
      rx={3}
      fill="var(--superficie-solida)"
      stroke="var(--magenta)"
      strokeWidth={3}
      style={{ cursor: CURSOR[a] }}
      onPointerDown={(ev) => aoPressionar(a, ev)}
    />
  ));
}

/** Botão da barra de ferramentas (com estado ligado/desligado quando é um painel ou modo). */
function Ferramenta({ icone, rotulo, curto, ativo, aoTocar }: { icone: NomeIcone; rotulo: string; curto?: string; ativo?: boolean; aoTocar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-pressed={ativo}
      title={rotulo}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
        ativo ? "border-transparent text-white [background:var(--grad)]" : "border-borda-forte bg-superficie-solida text-suave hover:text-foreground"
      }`}
    >
      <Icone nome={icone} className="size-4" />
      <span className="hidden md:inline">{rotulo}</span>
      <span className="md:hidden">{curto ?? rotulo}</span>
    </button>
  );
}
