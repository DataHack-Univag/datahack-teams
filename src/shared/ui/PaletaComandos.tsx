"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { casaBusca } from "@/shared/lib/texto";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";
import { Modal, useModal } from "@/shared/ui/Modal";

export type Comando = { grupo: string; rotulo: string; href: string; icone?: NomeIcone; detalhe?: string };

const ATALHOS: { teclas: string[]; texto: string }[] = [
  { teclas: ["Ctrl", "K"], texto: "Buscar telas, equipes e pessoas" },
  { teclas: ["?"], texto: "Ver estes atalhos" },
  { teclas: ["1", "2", "3", "4"], texto: "Na ficha: marcar o nível do critério selecionado" },
  { teclas: ["↑", "↓"], texto: "Na ficha: ir para o critério anterior / próximo" },
  { teclas: ["Ctrl", "S"], texto: "Na ficha: salvar" },
  { teclas: ["Esc"], texto: "Fechar janelas e menus" },
];

const digitando = (el: Element | null) =>
  !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || (el as HTMLElement).isContentEditable);

/**
 * Busca rápida (Ctrl+K / ⌘K) para ir direto a uma tela, equipe ou pessoa (heurística 7:
 * atalho para quem já conhece o sistema; o menu normal continua lá para os iniciantes).
 * "?" mostra a lista de atalhos.
 */
export function PaletaComandos({ comandos }: { comandos: Comando[] }) {
  const router = useRouter();
  const paleta = useModal();
  const atalhos = useModal();
  const [termo, setTermo] = useState("");
  const [sel, setSel] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  const lista = useMemo(
    () => (termo.trim() ? comandos.filter((c) => casaBusca(`${c.rotulo} ${c.detalhe ?? ""} ${c.grupo}`, termo)) : comandos).slice(0, 40),
    [comandos, termo],
  );

  // Evento de efeito: sempre usa a versão atual de abrir() sem reinscrever os ouvintes.
  const abrir = useEffectEvent(() => {
    setTermo("");
    setSel(0);
    paleta.abrir();
    requestAnimationFrame(() => campo.current?.focus());
  });
  const abrirAtalhos = useEffectEvent(() => atalhos.abrir());

  useEffect(() => {
    const pedirPaleta = () => abrir();
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        pedirPaleta();
      } else if (e.key === "?" && !digitando(document.activeElement) && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        abrirAtalhos();
      }
    };
    addEventListener("keydown", k);
    addEventListener("dh-paleta", pedirPaleta);
    return () => {
      removeEventListener("keydown", k);
      removeEventListener("dh-paleta", pedirPaleta);
    };
  }, []);

  function ir(c: Comando | undefined) {
    if (!c) return;
    paleta.fechar();
    router.push(c.href);
  }

  return (
    <>
      <Modal refModal={paleta.ref} titulo="Ir para…" subtitulo="Digite o nome de uma tela, equipe ou pessoa." largura="md">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <Icone nome="busca" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave" />
          <input
            ref={campo}
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(lista.length - 1, s + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                ir(lista[sel]);
              }
            }}
            placeholder="Ex.: Pandas, ranking, Ana…"
            className="campo pl-9"
            role="combobox"
            aria-expanded
            aria-controls="paleta-lista"
            aria-activedescendant={lista[sel] ? `cmd-${sel}` : undefined}
          />
        </label>
        <ul id="paleta-lista" role="listbox" className="max-h-[50dvh] space-y-0.5 overflow-y-auto">
          {lista.map((c, i) => {
            // Título do grupo antes do primeiro item de cada grupo.
            const cab = i === 0 || lista[i - 1].grupo !== c.grupo;
            return (
              <li key={`${c.grupo}-${c.href}-${i}`} role="presentation">
                {cab && <p className="px-2 pt-2 pb-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-suave uppercase">{c.grupo}</p>}
                <button
                  id={`cmd-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === sel}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => ir(c)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm ${i === sel ? "bg-marca-fundo" : ""}`}
                >
                  <Icone nome={c.icone ?? "avancar"} className="size-4 text-suave" />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.rotulo}</span>
                  {c.detalhe && <span className="shrink-0 truncate text-xs text-suave">{c.detalhe}</span>}
                </button>
              </li>
            );
          })}
          {lista.length === 0 && <li className="px-2 py-6 text-center text-sm text-suave">Nada encontrado para “{termo}”.</li>}
        </ul>
        <p className="text-xs text-suave">↑ ↓ para escolher · Enter para abrir · Esc para fechar · ? mostra todos os atalhos</p>
      </Modal>

      <Modal refModal={atalhos.ref} titulo="Atalhos de teclado" largura="sm">
        <ul className="space-y-2 text-sm">
          {ATALHOS.map((a) => (
            <li key={a.texto} className="flex items-center justify-between gap-3">
              <span className="text-suave">{a.texto}</span>
              <span className="flex shrink-0 gap-1">
                {a.teclas.map((t) => (
                  <kbd key={t} className="rounded-md border border-borda-forte bg-superficie-solida px-1.5 py-0.5 font-mono text-xs">
                    {t}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}

/** Botão do cabeçalho que abre a busca (para quem não conhece o atalho). */
export function BotaoBusca() {
  return (
    <button
      type="button"
      onClick={() => dispatchEvent(new Event("dh-paleta"))}
      className="btn-secundario min-h-9 gap-2 px-2.5 text-xs sm:px-3"
      aria-label="Buscar (Ctrl+K)"
      title="Buscar (Ctrl+K)"
    >
      <Icone nome="busca" className="size-4" />
      <span className="hidden text-suave md:inline">Buscar</span>
      <kbd className="hidden rounded border border-borda px-1 font-mono text-[10px] text-suave lg:inline">Ctrl K</kbd>
    </button>
  );
}
