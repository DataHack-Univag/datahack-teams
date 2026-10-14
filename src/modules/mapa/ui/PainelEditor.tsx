"use client";

import { useState, type ReactNode } from "react";
import { criarFileira, salvarElemento, salvarFundo, salvarSala } from "@/modules/mapa/application/actions";
import { medida, MODELOS, TIPOS, type Modelo } from "@/modules/mapa/domain/catalogo";
import { caixa, type Elemento, type Sala } from "@/modules/mapa/domain/tipos";
import { Botao } from "@/shared/ui/Botao";
import { Campo, Selecao } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { useToast } from "@/shared/ui/Toast";

// Painéis laterais do editor da sala: catálogo, propriedades (um ou vários itens),
// fileira e medidas/fundo da sala.

const m = (cm: number) => String(cm / 100).replace(".", ",");

/** Moldura dos painéis laterais: título e botão de fechar (heurística 3). */
export function PainelLateral({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <button type="button" onClick={aoFechar} className="rounded-lg p-1.5 text-suave hover:bg-marca-fundo hover:text-foreground" aria-label={`Fechar ${titulo.toLowerCase()}`}>
          <Icone nome="fechar" className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

/** Modelos prontos: um toque coloca no meio da sala, já escolhido para arrastar. */
export function Catalogo({ aoColocar }: { aoColocar: (m: Modelo) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-suave">Toque num modelo: ele aparece no meio da sala, pronto para arrastar e redimensionar.</p>
      {(["Equipes", "Móveis", "Sala"] as const).map((grupo) => (
        <div key={grupo} className="space-y-1.5">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{grupo}</p>
          <div className="grid gap-1.5">
            {MODELOS.filter((x) => x.grupo === grupo).map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => aoColocar(x)}
                className="rounded-lg border border-borda-forte bg-superficie px-2.5 py-1.5 text-left transition hover:border-marca"
              >
                <span className="block text-sm font-medium">{x.nome}</span>
                <span className="block text-[11px] text-suave">{x.descricao}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Rótulos dos elementos que estão por cima do escolhido (zonas e textos não contam). */
export function encostados(e: Elemento, todos: Elemento[]): string[] {
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

type Comandos = { girar: () => void; duplicar: () => void; tirar: () => void };

function BotoesSelecao({ girar, duplicar, tirar }: Comandos) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Botao variante="secundario" tamanho="pequeno" icone="girar" onClick={girar}>
        Girar 90°
      </Botao>
      <Botao variante="secundario" tamanho="pequeno" icone="copiar" onClick={duplicar}>
        Duplicar
      </Botao>
      <Botao variante="perigo" tamanho="pequeno" icone="lixo" onClick={tirar}>
        Tirar
      </Botao>
    </div>
  );
}

/** Um item escolhido: medidas exatas, posição, rótulo e lugares. */
export function PainelElemento({ e, encostando, ...comandos }: { e: Elemento; encostando: string[] } & Comandos) {
  const tipo = TIPOS[e.tipo];
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{tipo.rotulo}</p>
          <p className="text-lg font-semibold">{e.rotulo || tipo.rotulo}</p>
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
      <BotoesSelecao {...comandos} />
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
            Salvar medidas
          </BotaoEnviar>
        </div>
      </Formulario>
      <p className="text-xs text-suave">Ou puxe as alças do item no desenho para mudar o tamanho.</p>
    </div>
  );
}

/** Vários itens escolhidos: o que dá para fazer com todos de uma vez. */
export function PainelVarios({ itens, aoLimpar, ...comandos }: { itens: Elemento[]; aoLimpar: () => void } & Comandos) {
  const lugares = itens.reduce((t, e) => t + (e.lugares ?? 0), 0);
  return (
    <div className="space-y-3">
      <div>
        <p className="text-lg font-semibold">{itens.length} itens escolhidos</p>
        <p className="text-xs text-suave">
          {itens
            .map((e) => e.rotulo || TIPOS[e.tipo].rotulo)
            .slice(0, 12)
            .join(", ")}
          {itens.length > 12 ? "…" : ""}
          {lugares ? ` · ${lugares} lugar(es) para equipes` : ""}
        </p>
      </div>
      <BotoesSelecao {...comandos} />
      <p className="text-xs text-suave">Arraste qualquer um deles para mover todos juntos. Setas também movem o grupo.</p>
      <Botao variante="fantasma" tamanho="pequeno" onClick={aoLimpar}>
        Desmarcar todos
      </Botao>
    </div>
  );
}

export function FormFileira({ salaId }: { salaId: string }) {
  return (
    <Formulario action={criarFileira} className="grid grid-cols-2 gap-2">
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
  );
}

export function FormSala({ sala }: { sala: Sala }) {
  return (
    <div className="space-y-4">
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
      const fd = new FormData();
      fd.set("id", sala.id);
      fd.set("fundo", canvas.toDataURL("image/webp", 0.7));
      const r = await salvarFundo(null, fd);
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
