"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as EventoPonteiro } from "react";
import { adicionarModelo, ajustarElementos, duplicarElementos, duplicarSala, removerElementos } from "@/modules/mapa/application/actions";
import { encaixar, medida, type Modelo } from "@/modules/mapa/domain/catalogo";
import {
  ALCAS,
  arrastarVista,
  caixaDoGrupo,
  caixaEntre,
  deslocamentoDoGrupo,
  medidasDaCaixa,
  redimensionar,
  tocados,
  zoomEm,
  type Alca,
  type Caixa,
  type Vista,
} from "@/modules/mapa/domain/edicao";
import { caixa, dentroDaSala, proximoRotulo, type Elemento, type Sala } from "@/modules/mapa/domain/tipos";
import { DesenhoSala, vistaInteira } from "@/modules/mapa/ui/DesenhoSala";
import { Catalogo, encostados, FormFileira, FormSala, PainelElemento, PainelLateral, PainelVarios } from "@/modules/mapa/ui/PainelEditor";
import type { Acao } from "@/shared/acao/acao";
import type { Resultado } from "@/shared/acao/resultado";
import { BotaoLink, Girando } from "@/shared/ui/Botao";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";
import { useToast } from "@/shared/ui/Toast";

type Ponto = { x: number; y: number };
type Interacao =
  | { tipo: "mover"; inicio: Ponto; originais: Map<string, Ponto>; grupo: Caixa; moveu: boolean }
  | { tipo: "alca"; id: string; alca: Alca; inicio: Ponto; original: Caixa; antes: Elemento; moveu: boolean }
  | { tipo: "selecao"; inicio: Ponto; somar: boolean }
  | { tipo: "vista"; inicio: Ponto; vista: Vista; cmPorPx: number }
  | { tipo: "pinca"; distancia: number; meio: Ponto; meioCm: Ponto; vista: Vista; cmPorPx: number };
/** Painéis que se abrem pela barra (as propriedades abrem sozinhas quando há algo escolhido). */
type PainelExtra = "fileira" | "sala" | null;

const formData = (dados: Record<string, string | number>) => {
  const fd = new FormData();
  Object.entries(dados).forEach(([k, v]) => fd.set(k, String(v)));
  return fd;
};
const posicao = (e: Elemento) => ({ id: e.id, x_cm: e.x_cm, y_cm: e.y_cm, largura_cm: e.largura_cm, profundidade_cm: e.profundidade_cm, rotacao: e.rotacao });
const CURSOR: Record<Alca, string> = { n: "ns-resize", s: "ns-resize", l: "ew-resize", o: "ew-resize", nl: "nesw-resize", so: "nesw-resize", no: "nwse-resize", sl: "nwse-resize" };
/** Itens criados na tela que o banco ainda não confirmou (não dá para mexer neles ainda). */
const temporario = (id: string) => id.startsWith("tmp-");
let contadorTemporario = 0;

/**
 * Editor da sala em tela cheia: o desenho ocupa tudo e os painéis abrem por cima, nas laterais
 * (o desenho nunca encolhe).
 *  - arrastar move (encaixa de 10 em 10 cm); as alças redimensionam para qualquer tamanho;
 *  - Shift/Ctrl + toque, "Selecionar vários" ou um retângulo no vazio escolhem vários;
 *  - zoom: roda do mouse, pinça com dois dedos ou os botões; mover a vista: botão do meio,
 *    Espaço + arrastar, a ferramenta "Mão" ou dois dedos (heurística 7);
 *  - tudo responde na hora e grava por trás, com "Salvando… / Tudo salvo" (heurística 1);
 *    se o banco recusar, o desenho volta ao que era e o motivo aparece (heurística 9);
 *  - teclado: setas, R gira, Delete tira, Ctrl+D duplica, Ctrl+A escolhe tudo, Esc desmarca.
 */
export function EditorSala({ sala, elementos: doServidor, piso }: { sala: Sala; elementos: Elemento[]; piso?: string | null }) {
  const [elementos, setElementos] = useState(doServidor);
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [varios, setVarios] = useState(false);
  const [mao, setMao] = useState(false);
  const [catalogo, setCatalogo] = useState(true);
  const [extra, setExtra] = useState<PainelExtra>(null);
  const [retangulo, setRetangulo] = useState<Caixa | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [cheia, setCheia] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const interacao = useRef<Interacao | null>(null);
  const toques = useRef(new Map<number, Ponto>());
  const espaco = useRef(false);
  const teclas = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aplicado = useRef(doServidor);
  const toast = useToast();

  const inteira = vistaInteira(sala);
  const vistaAtual = vista ?? inteira;

  // Os dados do servidor mandam quando chegam, mas não no meio de um gesto nem enquanto há
  // gravações a caminho (senão o que acabou de sumir voltaria por um instante).
  useEffect(() => {
    if (interacao.current || pendentes || doServidor === aplicado.current) return;
    aplicado.current = doServidor;
    setElementos(doServidor);
    setSelecao((s) => new Set([...s].filter((id) => doServidor.some((e) => e.id === id))));
  }, [doServidor, pendentes]);

  // No celular o catálogo começa fechado; acompanha a tela cheia do navegador.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só no navegador se sabe o tamanho da tela
    if (window.matchMedia("(max-width: 1023px)").matches) setCatalogo(false);
    const aoMudar = () => setCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  // Roda do mouse = zoom em volta do ponteiro (precisa de passive:false para não rolar a página).
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const rodar = (ev: WheelEvent) => {
      ev.preventDefault();
      const centro = pontoNaSala(ev);
      setVista((v) => zoomEm(v ?? vistaInteira(sala), Math.exp(ev.deltaY * 0.0015), centro, vistaInteira(sala)));
    };
    el.addEventListener("wheel", rodar, { passive: false });
    return () => el.removeEventListener("wheel", rodar);
  }, [sala]);

  const escolhidos = elementos.filter((e) => selecao.has(e.id) && !temporario(e.id));
  const unico = escolhidos.length === 1 ? escolhidos[0] : null;
  const lugares = elementos.reduce((t, e) => t + (e.lugares ?? 0), 0);
  // Fileira/sala quando pedidos pela barra; senão, as propriedades do que estiver escolhido.
  const painel = extra ?? (escolhidos.length ? "item" : null);

  /** Grava por trás: conta as gravações a caminho e, se o banco recusar, desfaz na tela. */
  async function gravar(acao: Acao, dados: Record<string, string | number>, opcoes: { desfazer?: Acao; voltar?: () => void; silencioso?: boolean } = {}): Promise<Resultado> {
    setPendentes((n) => n + 1);
    try {
      const r = await acao(null, formData(dados));
      if (r?.erro) {
        opcoes.voltar?.();
        toast(r.erro, { tom: "erro" });
      } else if (r?.ok && !opcoes.silencioso) {
        const d = opcoes.desfazer;
        toast(r.ok, { acao: d && r.desfazer ? { rotulo: "Desfazer", executar: () => void gravar(d, r.desfazer!, { silencioso: true }) } : undefined });
      }
      return r;
    } catch {
      opcoes.voltar?.();
      toast("Não deu para gravar agora. Confira a conexão e tente de novo.", { tom: "erro" });
      return { erro: "falha" };
    } finally {
      setPendentes((n) => n - 1);
    }
  }
  const salvarAjustes = (itens: ReturnType<typeof posicao>[], mensagem?: string, anteriores?: ReturnType<typeof posicao>[]) =>
    gravar(
      ajustarElementos,
      { itens: JSON.stringify(itens), ...(mensagem ? { mensagem } : {}), ...(anteriores ? { anteriores: JSON.stringify(anteriores) } : {}) },
      {
        desfazer: ajustarElementos,
        silencioso: !mensagem,
        voltar: anteriores ? () => setElementos((l) => l.map((e) => ({ ...e, ...(anteriores.find((a) => a.id === e.id) ?? {}) }))) : undefined,
      },
    );

  // ---------------------------------------------------------------- coordenadas
  function pontoNaSala(ev: { clientX: number; clientY: number }): Ponto {
    const el = area.current?.querySelector("svg");
    const matriz = el?.getScreenCTM();
    if (!el || !matriz) return { x: 0, y: 0 };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matriz.inverse());
    return { x: p.x, y: p.y };
  }
  const cmPorPx = () => 1 / (area.current?.querySelector("svg")?.getScreenCTM()?.a || 1);
  const capturar = (id: number) => (area.current?.querySelector("svg") as SVGSVGElement | null)?.setPointerCapture(id);

  // ---------------------------------------------------------------- gestos
  function iniciarMovimento(ids: Set<string>, ev: { clientX: number; clientY: number }) {
    const lista = elementos.filter((e) => ids.has(e.id) && !temporario(e.id));
    if (!lista.length) return;
    interacao.current = { tipo: "mover", inicio: pontoNaSala(ev), originais: new Map(lista.map((e) => [e.id, { x: e.x_cm, y: e.y_cm }])), grupo: caixaDoGrupo(lista), moveu: false };
  }

  const querMoverVista = (ev: EventoPonteiro<Element>) => mao || espaco.current || ev.button === 1;

  function pressionarItem(e: Elemento, ev: EventoPonteiro<SVGGElement>) {
    if (querMoverVista(ev) || toques.current.size > 1) return; // deixa o gesto para a vista
    ev.preventDefault();
    ev.stopPropagation();
    area.current?.focus();
    setExtra(null);
    if (temporario(e.id)) return;
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

  function pressionar(ev: EventoPonteiro<HTMLDivElement>) {
    if (ev.pointerType === "touch") toques.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    // Dois dedos: pinça (zoom + mover a vista). Desfaz o que o primeiro dedo começou.
    if (toques.current.size === 2) {
      const i = interacao.current;
      if (i?.tipo === "mover") setElementos((l) => l.map((e) => (i.originais.has(e.id) ? { ...e, x_cm: i.originais.get(e.id)!.x, y_cm: i.originais.get(e.id)!.y } : e)));
      const [a, b] = [...toques.current.values()];
      const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      interacao.current = { tipo: "pinca", distancia: Math.hypot(a.x - b.x, a.y - b.y), meio, meioCm: pontoNaSala({ clientX: meio.x, clientY: meio.y }), vista: vistaAtual, cmPorPx: cmPorPx() };
      setRetangulo(null);
      return;
    }
    if ((ev.target as Element).closest("[data-elemento],[data-alca]") && !querMoverVista(ev)) return;
    area.current?.focus();
    if (querMoverVista(ev)) {
      ev.preventDefault();
      interacao.current = { tipo: "vista", inicio: { x: ev.clientX, y: ev.clientY }, vista: vistaAtual, cmPorPx: cmPorPx() };
    } else {
      const somar = ev.shiftKey || ev.ctrlKey || ev.metaKey || varios;
      if (!somar) setSelecao(new Set());
      interacao.current = { tipo: "selecao", inicio: pontoNaSala(ev), somar };
    }
    capturar(ev.pointerId);
  }

  function mover(ev: EventoPonteiro<HTMLDivElement>) {
    if (toques.current.has(ev.pointerId)) toques.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const i = interacao.current;
    if (!i) return;
    if (i.tipo === "pinca") {
      if (toques.current.size < 2) return;
      const [a, b] = [...toques.current.values()];
      const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const fator = i.distancia / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const z = zoomEm(i.vista, fator, i.meioCm, inteira);
      const escala = i.cmPorPx * (z.largura / i.vista.largura);
      setVista(arrastarVista(z, (meio.x - i.meio.x) * escala, (meio.y - i.meio.y) * escala));
      return;
    }
    if (i.tipo === "vista") {
      setVista(arrastarVista(i.vista, (ev.clientX - i.inicio.x) * i.cmPorPx, (ev.clientY - i.inicio.y) * i.cmPorPx));
      return;
    }
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

  function soltar(ev: EventoPonteiro<HTMLDivElement>) {
    toques.current.delete(ev.pointerId);
    const i = interacao.current;
    if (i?.tipo === "pinca" && toques.current.size) return; // ainda há um dedo na tela
    interacao.current = null;
    if (!i || i.tipo === "vista" || i.tipo === "pinca") return;
    if (i.tipo === "selecao") {
      if (retangulo && retangulo.largura + retangulo.profundidade > 10) {
        const ids = tocados(elementos, retangulo).filter((id) => !temporario(id));
        setSelecao((s) => new Set(i.somar ? [...s, ...ids] : ids));
      }
      setRetangulo(null);
      return;
    }
    if (!i.moveu) return;
    if (i.tipo === "mover") {
      const antes = elementos.filter((e) => i.originais.has(e.id)).map((e) => posicao({ ...e, x_cm: i.originais.get(e.id)!.x, y_cm: i.originais.get(e.id)!.y }));
      void gravar(ajustarElementos, { itens: JSON.stringify(elementos.filter((e) => i.originais.has(e.id)).map(posicao)) }, {
        silencioso: true,
        voltar: () => setElementos((l) => l.map((e) => ({ ...e, ...(antes.find((a) => a.id === e.id) ?? {}) }))),
      });
    } else {
      const e = elementos.find((x) => x.id === i.id);
      if (e) void salvarAjustes([posicao(e)], `${e.rotulo || "Item"}: ${medida(e.largura_cm)} × ${medida(e.profundidade_cm)}.`, [posicao(i.antes)]);
    }
  }

  // ---------------------------------------------------------------- comandos (na hora, gravando por trás)
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

  function tirar() {
    if (!escolhidos.length) return;
    const ids = escolhidos.map((e) => e.id);
    const antes = elementos;
    setElementos((l) => l.filter((e) => !ids.includes(e.id)));
    setSelecao(new Set());
    void gravar(removerElementos, { ids: JSON.stringify(ids) }, { desfazer: removerElementos, voltar: () => setElementos(antes) });
  }

  async function duplicar() {
    if (!escolhidos.length) return;
    const rotulos = elementos.map((e) => e.rotulo);
    const copias = escolhidos.map((e) => {
      const prefixo = e.rotulo?.match(/^([A-Za-z]+)\d+$/)?.[1];
      const rotulo = prefixo ? proximoRotulo(prefixo, rotulos) : e.rotulo;
      rotulos.push(rotulo);
      return { ...e, id: `tmp-${++contadorTemporario}`, rotulo, x_cm: e.x_cm + 20, y_cm: e.y_cm + 20 };
    });
    setElementos((l) => [...l, ...copias]);
    setSelecao(new Set(copias.map((c) => c.id)));
    const r = await gravar(duplicarElementos, { sala_id: sala.id, ids: JSON.stringify(escolhidos.map((e) => e.id)) }, {
      desfazer: removerElementos,
      voltar: () => setElementos((l) => l.filter((e) => !copias.some((c) => c.id === e.id))),
    });
    if (r?.desfazer?.ids) setSelecao(new Set(JSON.parse(r.desfazer.ids) as string[]));
  }

  async function colocar(modelo: Modelo) {
    // No meio do que está à vista (com zoom, aparece onde você está olhando).
    const meio = { x: vistaAtual.x + vistaAtual.largura / 2, y: vistaAtual.y + vistaAtual.profundidade / 2 };
    const pos = dentroDaSala(sala, { largura_cm: modelo.largura_cm, profundidade_cm: modelo.profundidade_cm, rotacao: 0 }, encaixar(meio.x - modelo.largura_cm / 2), encaixar(meio.y - modelo.profundidade_cm / 2));
    const novo: Elemento = {
      id: `tmp-${++contadorTemporario}`,
      sala_id: sala.id,
      tipo: modelo.tipo,
      rotulo: modelo.tipo === "texto" ? "Legenda" : proximoRotulo(modelo.prefixo, elementos.map((e) => e.rotulo)),
      x_cm: pos.x,
      y_cm: pos.y,
      largura_cm: modelo.largura_cm,
      profundidade_cm: modelo.profundidade_cm,
      rotacao: 0,
      lugares: modelo.lugares ?? null,
    };
    setElementos((l) => [...l, novo]);
    setSelecao(new Set([novo.id]));
    const r = await gravar(adicionarModelo, { sala_id: sala.id, modelo: modelo.id, x: pos.x, y: pos.y }, {
      desfazer: removerElementos,
      voltar: () => setElementos((l) => l.filter((e) => e.id !== novo.id)),
    });
    if (r?.desfazer?.id) setSelecao(new Set([r.desfazer.id]));
  }

  function teclado(ev: KeyboardEvent<HTMLDivElement>) {
    const ctrl = ev.ctrlKey || ev.metaKey;
    if (ev.key === " ") {
      ev.preventDefault();
      espaco.current = true;
      return;
    }
    if (ctrl && (ev.key === "a" || ev.key === "A")) {
      ev.preventDefault();
      return setSelecao(new Set(elementos.filter((e) => !temporario(e.id)).map((e) => e.id)));
    }
    if (ev.key === "+" || ev.key === "=") return setVista(zoomEm(vistaAtual, 0.8, centroDaVista(vistaAtual), inteira));
    if (ev.key === "-") return setVista(zoomEm(vistaAtual, 1.25, centroDaVista(vistaAtual), inteira));
    if (ev.key === "0") return setVista(null);
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
  const tamAlca = Math.max(6, Math.round(vistaAtual.largura / 60));
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
  const porcento = Math.round((inteira.largura / vistaAtual.largura) * 100);

  return (
    <div ref={raiz} className={`flex flex-col bg-background ${cheia ? "h-dvh" : "h-[calc(100dvh-8.75rem)] sm:h-[calc(100dvh-7.5rem)]"}`}>
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
          <p className="flex items-center gap-1.5 truncate text-[11px] text-suave" aria-live="polite">
            {medida(sala.largura_cm)} × {medida(sala.profundidade_cm)} · {lugares} lugar(es) ·{" "}
            {pendentes ? (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <Girando className="size-3" /> Salvando…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <Icone nome="ok" className="size-3" /> Tudo salvo
              </span>
            )}
          </p>
        </div>
        <Ferramenta icone="mais_novo" ativo={catalogo} aoTocar={() => setCatalogo((v) => !v)} rotulo="Modelos" />
        <Ferramenta icone="ok" ativo={varios} aoTocar={() => setVarios((v) => !v)} rotulo="Selecionar vários" curto="Vários" />
        <Ferramenta icone="copiar" ativo={painel === "fileira"} aoTocar={() => setExtra((p) => (p === "fileira" ? null : "fileira"))} rotulo="Fileira" />
        <Ferramenta icone="editar" ativo={painel === "sala"} aoTocar={() => setExtra((p) => (p === "sala" ? null : "sala"))} rotulo="Sala" />
        <Ferramenta icone="mapa" aoTocar={() => void gravar(duplicarSala, { id: sala.id })} rotulo="Duplicar sala" curto="Copiar sala" />
        <Ferramenta icone="telao" ativo={cheia} aoTocar={() => void telaCheia()} rotulo={cheia ? "Sair da tela cheia" : "Tela cheia"} curto="Tela cheia" />
      </div>

      {/* O desenho ocupa tudo; os painéis abrem POR CIMA (o desenho nunca muda de tamanho). */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={area}
          tabIndex={0}
          role="application"
          aria-label={`Desenho da sala ${sala.nome}. Setas movem, R gira, Delete tira, Ctrl+D duplica, Ctrl+A escolhe tudo, + e − dão zoom, 0 ajusta.`}
          onKeyDown={teclado}
          onKeyUp={(ev) => {
            if (ev.key === " ") espaco.current = false;
          }}
          onPointerDown={pressionar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          className={`absolute inset-0 touch-none p-2 outline-none focus-visible:ring-1 focus-visible:ring-borda-forte focus-visible:ring-inset sm:p-4 ${mao ? "cursor-grab" : ""}`}
        >
          <DesenhoSala
            sala={sala}
            elementos={elementos}
            selecionados={selecao}
            grade
            fundo
            vista={vista}
            aoPressionar={pressionarItem}
            idSvg={`sala-${sala.id}`}
            className="h-full"
          >
            {camada}
          </DesenhoSala>
        </div>

        {/* ------------------------------------------------ zoom (canto de baixo, à direita do desenho) */}
        <div className={`absolute bottom-3 z-10 flex items-center gap-1 rounded-xl border border-borda-forte bg-superficie-solida p-1 shadow-lg transition-[right] ${painel ? "right-3 lg:right-[21rem]" : "right-3"}`}>
          <BotaoZoom rotulo="Afastar (−)" icone="−" aoTocar={() => setVista(zoomEm(vistaAtual, 1.25, centroDaVista(vistaAtual), inteira))} />
          <button type="button" onClick={() => setVista(null)} className="min-w-12 rounded-lg px-1.5 py-1 font-mono text-xs tabular-nums hover:bg-marca-fundo" title="Ajustar à tela (0)">
            {porcento}%
          </button>
          <BotaoZoom rotulo="Aproximar (+)" icone="+" aoTocar={() => setVista(zoomEm(vistaAtual, 0.8, centroDaVista(vistaAtual), inteira))} />
          <button
            type="button"
            aria-pressed={mao}
            onClick={() => setMao((v) => !v)}
            title="Mão: arrastar move a vista (também: Espaço + arrastar, botão do meio ou dois dedos)"
            className={`ml-1 rounded-lg px-2 py-1 text-xs font-semibold ${mao ? "text-white [background:var(--grad)]" : "text-suave hover:bg-marca-fundo"}`}
          >
            ✋ Mão
          </button>
        </div>

        {/* ------------------------------------------------ catálogo (por cima, à esquerda) */}
        {catalogo && (
          <aside className="absolute inset-y-0 left-0 z-20 w-64 max-w-[85vw] overflow-y-auto border-r border-borda bg-superficie-solida/95 p-3 shadow-xl backdrop-blur" aria-label="Modelos prontos">
            <PainelLateral titulo="Colocar na sala" aoFechar={() => setCatalogo(false)}>
              <Catalogo aoColocar={(x) => void colocar(x)} />
            </PainelLateral>
          </aside>
        )}

        {/* ------------------------------------------------ propriedades (por cima, à direita) */}
        {painel && (
          <aside className="absolute inset-y-0 right-0 z-20 w-80 max-w-[90vw] overflow-y-auto border-l border-borda bg-superficie-solida/95 p-3 shadow-xl backdrop-blur" aria-label="Propriedades">
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
        <span className="sm:hidden">Toque para escolher · arraste para mover · pinça para zoom · dois dedos movem a vista.</span>
        <span className="hidden sm:inline">
          {varios ? "" : "Shift ou Ctrl + clique escolhe vários; arraste no vazio para um retângulo. "}
          Roda do mouse dá zoom · Espaço + arrastar move a vista · <kbd>R</kbd> gira · <kbd>Delete</kbd> tira · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplica · <kbd>0</kbd> ajusta
        </span>
      </p>
    </div>
  );
}

const centroDaVista = (v: Vista) => ({ x: v.x + v.largura / 2, y: v.y + v.profundidade / 2 });

function BotaoZoom({ rotulo, icone, aoTocar }: { rotulo: string; icone: string; aoTocar: () => void }) {
  return (
    <button type="button" onClick={aoTocar} aria-label={rotulo} title={rotulo} className="flex size-8 items-center justify-center rounded-lg text-lg leading-none hover:bg-marca-fundo">
      {icone}
    </button>
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
      rx={tamanho / 4}
      fill="var(--superficie-solida)"
      stroke="var(--magenta)"
      strokeWidth={2}
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
