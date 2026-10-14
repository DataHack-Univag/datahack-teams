"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent as EventoPonteiro } from "react";
import {
  adicionarModelo,
  criarFileira,
  duplicarElemento,
  girarElemento,
  moverElemento,
  removerElemento,
  salvarElemento,
  salvarFundo,
  salvarSala,
} from "@/modules/mapa/application/actions";
import { medida, MODELOS, TIPOS, type Modelo } from "@/modules/mapa/domain/catalogo";
import { caixa, dentroDaSala, type Elemento, type Sala } from "@/modules/mapa/domain/tipos";
import { DesenhoSala } from "@/modules/mapa/ui/DesenhoSala";
import type { Acao } from "@/shared/acao/acao";
import { Botao } from "@/shared/ui/Botao";
import { Campo, Selecao } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { useToast } from "@/shared/ui/Toast";

const m = (cm: number) => String(cm / 100).replace(".", ",");
const formData = (dados: Record<string, string | number>) => {
  const fd = new FormData();
  Object.entries(dados).forEach(([k, v]) => fd.set(k, String(v)));
  return fd;
};

/**
 * Editor da sala: catálogo de modelos prontos, o desenho (arrastar com mouse ou dedo,
 * setas no teclado) e o painel do elemento escolhido. Tudo grava na hora; tirar e criar
 * têm "desfazer" (heurísticas 3 e 7). As medidas aparecem em metros (heurística 2).
 */
export function EditorSala({ sala, elementos: doServidor }: { sala: Sala; elementos: Elemento[] }) {
  const [elementos, setElementos] = useState(doServidor);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const svg = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ id: string; dx: number; dy: number; moveu: boolean } | null>(null);
  const teclas = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  // Os dados do servidor mandam, exceto no meio de um arraste.
  useEffect(() => {
    if (!arraste.current) setElementos(doServidor);
  }, [doServidor]);

  const atual = elementos.find((e) => e.id === selecionado) ?? null;

  async function executar(acao: Acao, dados: Record<string, string | number>, desfazer?: Acao) {
    const r = await acao(null, formData(dados));
    if (r?.erro) toast(r.erro, { tom: "erro" });
    else if (r?.ok)
      toast(r.ok, {
        acao: desfazer && r.desfazer ? { rotulo: "Desfazer", executar: () => void desfazer(null, formData(r.desfazer!)) } : undefined,
      });
    return r;
  }

  /** Ponto do ponteiro em centímetros da sala. */
  function pontoNaSala(ev: { clientX: number; clientY: number }) {
    const el = svg.current?.querySelector("svg");
    const matriz = el?.getScreenCTM();
    if (!el || !matriz) return { x: 0, y: 0 };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matriz.inverse());
    return { x: p.x, y: p.y };
  }

  function pressionar(e: Elemento, ev: EventoPonteiro<SVGGElement>) {
    ev.preventDefault();
    ev.stopPropagation();
    setSelecionado(e.id);
    const p = pontoNaSala(ev);
    arraste.current = { id: e.id, dx: p.x - e.x_cm, dy: p.y - e.y_cm, moveu: false };
    (svg.current?.querySelector("svg") as SVGSVGElement | null)?.setPointerCapture(ev.pointerId);
  }

  function mover(ev: EventoPonteiro<HTMLDivElement>) {
    const a = arraste.current;
    if (!a) return;
    const p = pontoNaSala(ev);
    setElementos((lista) =>
      lista.map((e) => {
        if (e.id !== a.id) return e;
        const pos = dentroDaSala(sala, e, p.x - a.dx, p.y - a.dy);
        if (pos.x !== e.x_cm || pos.y !== e.y_cm) a.moveu = true;
        return { ...e, x_cm: pos.x, y_cm: pos.y };
      }),
    );
  }

  function soltar() {
    const a = arraste.current;
    arraste.current = null;
    if (!a?.moveu) return;
    const e = elementos.find((x) => x.id === a.id);
    if (e) iniciar(() => void executar(moverElemento, { id: e.id, x: e.x_cm, y: e.y_cm }));
  }

  /** Setas movem 10 cm (Shift: 50 cm), R gira, Delete tira do mapa. */
  function teclado(ev: KeyboardEvent<HTMLDivElement>) {
    if (!atual) return;
    const passo = ev.shiftKey ? 50 : 10;
    const delta = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[ev.key];
    if (delta) {
      ev.preventDefault();
      const pos = dentroDaSala(sala, atual, atual.x_cm + delta[0], atual.y_cm + delta[1]);
      setElementos((lista) => lista.map((e) => (e.id === atual.id ? { ...e, x_cm: pos.x, y_cm: pos.y } : e)));
      if (teclas.current) clearTimeout(teclas.current);
      teclas.current = setTimeout(() => void executar(moverElemento, { id: atual.id, x: pos.x, y: pos.y }), 500);
    } else if (ev.key === "r" || ev.key === "R") {
      ev.preventDefault();
      void executar(girarElemento, { id: atual.id, rotacao: (atual.rotacao + 90) % 360 });
    } else if (ev.key === "Delete" || ev.key === "Backspace") {
      ev.preventDefault();
      setSelecionado(null);
      void executar(removerElemento, { id: atual.id }, removerElemento);
    } else if (ev.key === "Escape") setSelecionado(null);
  }

  async function colocar(modelo: Modelo) {
    const r = await executar(adicionarModelo, { sala_id: sala.id, modelo: modelo.id }, removerElemento);
    if (r?.desfazer?.id) setSelecionado(r.desfazer.id);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_19rem]">
      {/* ------------------------------------------------ desenho */}
      {/* No celular o desenho vem primeiro; no computador fica no meio e acompanha a rolagem. */}
      <section className="card min-w-0 space-y-2 p-3 sm:p-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:self-start" aria-label={`Desenho da sala ${sala.nome}`}>
        <div
          ref={svg}
          tabIndex={0}
          onKeyDown={teclado}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onPointerDown={(ev) => {
            if (!(ev.target as Element).closest("[data-elemento]")) setSelecionado(null);
          }}
          className="touch-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-marca"
        >
          <DesenhoSala sala={sala} elementos={elementos} selecionado={selecionado} grade fundo aoPressionar={pressionar} idSvg={`sala-${sala.id}`} />
        </div>
        <p className="text-xs text-suave">
          Arraste para mover (encaixa de 10 em 10 cm). Com um item escolhido: setas movem, <kbd>Shift</kbd> + setas andam 50 cm, <kbd>R</kbd> gira e{" "}
          <kbd>Delete</kbd> tira do mapa.
        </p>
      </section>

      {/* ------------------------------------------------ catálogo */}
      <aside className="card space-y-3 lg:col-start-1 lg:row-start-1 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto" aria-label="Modelos prontos">
        <h2 className="text-sm font-semibold">Colocar na sala</h2>
        <p className="text-xs text-suave">Toque num modelo: ele aparece no meio da sala, pronto para arrastar.</p>
        {(["Equipes", "Móveis", "Sala"] as const).map((grupo) => (
          <div key={grupo} className="space-y-1.5">
            <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{grupo}</p>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {MODELOS.filter((x) => x.grupo === grupo).map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => void colocar(x)}
                  className="rounded-lg border border-borda-forte bg-superficie-solida px-2.5 py-1.5 text-left transition hover:border-marca"
                >
                  <span className="block text-sm font-medium">{x.nome}</span>
                  <span className="block text-[11px] text-suave">{x.descricao}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* ------------------------------------------------ painel */}
      <aside className="space-y-4 lg:col-start-3 lg:row-start-1 lg:self-start">
        {atual ? (
          <PainelElemento encostando={encostados(atual, elementos)} key={`${atual.id}-${atual.x_cm}-${atual.y_cm}-${atual.rotacao}-${atual.largura_cm}-${atual.profundidade_cm}`} e={atual} salaId={sala.id} aoTirar={() => setSelecionado(null)} executar={executar} />
        ) : (
          <div className="card space-y-1 text-sm text-suave">
            <p className="font-semibold text-foreground">Nada escolhido</p>
            <p>Toque num item do desenho para mudar medidas, girar, duplicar ou tirar.</p>
          </div>
        )}
        <FormFileira salaId={sala.id} />
        <FormSala sala={sala} />
      </aside>
    </div>
  );
}

/** Rótulos dos elementos que estão por cima do escolhido (zonas e textos não contam). */
function encostados(e: Elemento, todos: Elemento[]): string[] {
  const ignora = (x: Elemento) => TIPOS[x.tipo].estilo === "zona" || TIPOS[x.tipo].estilo === "texto";
  if (ignora(e)) return [];
  const a = caixa(e);
  return todos
    .filter((o) => o.id !== e.id && !ignora(o))
    .filter((o) => {
      const b = caixa(o);
      return a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.profundidade && b.y < a.y + a.profundidade;
    })
    .map((o) => o.rotulo || TIPOS[o.tipo].rotulo);
}

function PainelElemento({
  e,
  salaId,
  aoTirar,
  executar,
  encostando,
}: {
  encostando: string[];
  e: Elemento;
  salaId: string;
  aoTirar: () => void;
  executar: (acao: Acao, dados: Record<string, string | number>, desfazer?: Acao) => Promise<unknown>;
}) {
  const tipo = TIPOS[e.tipo];
  return (
    <section className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{tipo.rotulo}</p>
          <h2 className="text-lg font-semibold">{e.rotulo || tipo.rotulo}</h2>
        </div>
        <span className="text-xs text-suave">
          {medida(e.largura_cm)} × {medida(e.profundidade_cm)}
        </span>
      </div>
      {encostando.length > 0 && (
        <p role="status" className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Está por cima de {encostando.join(", ")}. Arraste um pouco para separar.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Botao variante="secundario" tamanho="pequeno" icone="girar" onClick={() => void executar(girarElemento, { id: e.id, rotacao: (e.rotacao + 90) % 360 })}>
          Girar 90°
        </Botao>
        <Botao variante="secundario" tamanho="pequeno" icone="copiar" onClick={() => void executar(duplicarElemento, { id: e.id, sala_id: salaId }, removerElemento)}>
          Duplicar
        </Botao>
        <Botao
          variante="perigo"
          tamanho="pequeno"
          icone="lixo"
          onClick={() => {
            aoTirar();
            void executar(removerElemento, { id: e.id }, removerElemento);
          }}
        >
          Tirar
        </Botao>
      </div>
      <Formulario action={salvarElemento} className="grid grid-cols-2 gap-2">
        <Ocultos valores={{ id: e.id, tipo: e.tipo, rotacao: String(e.rotacao) }} />
        <Campo rotulo="Rótulo" name="rotulo" maxLength={60} defaultValue={e.rotulo ?? ""} placeholder="B1, Café…" className="col-span-2" />
        <Campo rotulo="Largura (m)" name="largura" inputMode="decimal" required defaultValue={m(e.largura_cm)} />
        <Campo rotulo="Profundidade (m)" name="profundidade" inputMode="decimal" required defaultValue={m(e.profundidade_cm)} />
        <Campo rotulo="Da parede esquerda (m)" name="x" inputMode="decimal" required defaultValue={m(e.x_cm)} />
        <Campo rotulo="Da parede do fundo (m)" name="y" inputMode="decimal" required defaultValue={m(e.y_cm)} />
        {tipo.temLugares && (
          <Campo rotulo="Equipes que cabem" name="lugares" type="number" min={1} max={20} required defaultValue={e.lugares ?? 1} className="col-span-2" />
        )}
        <div className="col-span-2">
          <BotaoEnviar tamanho="pequeno" icone="ok">
            Salvar
          </BotaoEnviar>
        </div>
      </Formulario>
    </section>
  );
}

function FormFileira({ salaId }: { salaId: string }) {
  return (
    <details className="card group">
      <summary className="cursor-pointer text-sm font-semibold select-none">Colocar uma fileira</summary>
      <Formulario action={criarFileira} className="mt-3 grid grid-cols-2 gap-2">
        <Ocultos valores={{ sala_id: salaId }} />
        <Selecao
          rotulo="Modelo"
          name="modelo"
          defaultValue="bancada-lab-2"
          className="col-span-2"
          opcoes={MODELOS.filter((x) => x.grupo !== "Sala").map((x) => ({ valor: x.id, rotulo: `${x.nome} (${x.descricao})` }))}
        />
        <Campo rotulo="Quantas" name="quantidade" type="number" min={1} max={30} defaultValue={3} required />
        <Selecao
          rotulo="Direção"
          name="direcao"
          defaultValue="vertical"
          opcoes={[
            { valor: "vertical", rotulo: "Uma embaixo da outra" },
            { valor: "horizontal", rotulo: "Lado a lado" },
          ]}
        />
        <Campo rotulo="Espaço entre elas (m)" name="espaco" inputMode="decimal" defaultValue="1" required className="col-span-2" />
        <Campo rotulo="Começa a (m) da esquerda" name="x" inputMode="decimal" defaultValue="0,5" required />
        <Campo rotulo="e a (m) do fundo" name="y" inputMode="decimal" defaultValue="0,5" required />
        <div className="col-span-2">
          <BotaoEnviar tamanho="pequeno" icone="mais_novo">
            Colocar fileira
          </BotaoEnviar>
        </div>
      </Formulario>
    </details>
  );
}

function FormSala({ sala }: { sala: Sala }) {
  return (
    <details className="card group">
      <summary className="cursor-pointer text-sm font-semibold select-none">Medidas e fundo da sala</summary>
      <div className="mt-3 space-y-4">
        <Formulario action={salvarSala} className="grid grid-cols-2 gap-2">
          <Ocultos valores={{ id: sala.id }} />
          <Campo rotulo="Nome" name="nome" required maxLength={60} defaultValue={sala.nome} className="col-span-2" />
          <Campo rotulo="Largura (m)" name="largura" inputMode="decimal" required defaultValue={m(sala.largura_cm)} />
          <Campo rotulo="Profundidade (m)" name="profundidade" inputMode="decimal" required defaultValue={m(sala.profundidade_cm)} />
          <div className="col-span-2">
            <BotaoEnviar variante="secundario" tamanho="pequeno" icone="ok">
              Salvar sala
            </BotaoEnviar>
          </div>
        </Formulario>
        <FundoSala sala={sala} />
      </div>
    </details>
  );
}

/** Foto ou rascunho de fundo: reduzido no navegador (até 1600 px, WEBP) antes de enviar. */
function FundoSala({ sala }: { sala: Sala }) {
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return toast("Escolha uma imagem (PNG, JPG ou WEBP). PDF: tire um print da planta.", { tom: "erro" });
    setEnviando(true);
    try {
      const img = await createImageBitmap(arquivo);
      const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const r = await salvarFundo(null, formData({ id: sala.id, fundo: canvas.toDataURL("image/webp", 0.7) }));
      toast(r?.erro ?? r?.ok ?? "Pronto.", { tom: r?.erro ? "erro" : "sucesso" });
    } catch {
      toast("Não foi possível ler essa imagem. Tente outra (PNG ou JPG).", { tom: "erro" });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-borda pt-3">
      <p className="text-sm font-semibold">Imagem de fundo</p>
      <p className="text-xs text-suave">Uma foto da planta ou um rascunho: aparece clarinha atrás do desenho, para você posicionar as bancadas por cima.</p>
      <label className="btn-secundario min-h-9 cursor-pointer px-3 text-xs">
        <Icone nome="imagem" className="size-4" /> {enviando ? "Enviando…" : sala.fundo ? "Trocar imagem" : "Escolher imagem"}
        <input type="file" accept="image/*" className="sr-only" disabled={enviando} onChange={(ev) => void escolher(ev.target.files?.[0])} />
      </label>
      {sala.fundo && (
        <Formulario action={salvarFundo}>
          <Ocultos valores={{ id: sala.id, fundo: "" }} />
          <BotaoEnviar variante="fantasma" tamanho="pequeno">
            Tirar a imagem
          </BotaoEnviar>
        </Formulario>
      )}
    </div>
  );
}
