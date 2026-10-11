"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: NomeIcone;
  /** Contador de pendências (ex.: pedidos de troca para responder). */
  contagem?: number;
  /** A aba fica ativa quando o caminho começa com um destes (padrão: o próprio href, exato). */
  prefixos?: string[];
  /** Abas por parâmetro (?aba=...): valor que torna esta aba ativa. */
  aba?: string;
  /** É a aba padrão quando não há ?aba= na URL. */
  padrao?: boolean;
};

function useAtivo() {
  const caminho = usePathname();
  const params = useSearchParams();
  const aba = params.get("aba");
  return (i: ItemNav) => {
    if (i.aba !== undefined) return aba ? aba === i.aba : !!i.padrao;
    const base = i.href.split("?")[0];
    return i.prefixos ? i.prefixos.some((p) => caminho === p || caminho.startsWith(p + "/")) : caminho === base;
  };
}

function Contador({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="min-w-5 rounded-full bg-[var(--magenta)] px-1.5 text-center text-[11px] leading-5 font-bold text-white tabular-nums" aria-label={`${n} pendente(s)`}>
      {n > 9 ? "9+" : n}
    </span>
  );
}

/**
 * Navegação principal (heurística 4: mesma forma em todas as áreas).
 * Computador: abas no topo. Celular: barra fixa embaixo, ao alcance do polegar, com
 * até 4 itens; o resto fica em "Mais".
 */
export function Navegacao({ itens, mais = [] }: { itens: ItemNav[]; mais?: ItemNav[] }) {
  const ativo = useAtivo();
  const [abertoMais, setAbertoMais] = useState(false);

  // Fecha o "Mais" com Esc (e ao escolher um item, no onClick).
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setAbertoMais(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  const todos = [...itens, ...mais];
  const noMais = mais.some(ativo);

  return (
    <>
      {/* ------------------------------------------------ computador: abas no topo */}
      <nav
        aria-label="Navegação principal"
        className="relative z-10 hidden border-b border-borda bg-[color-mix(in_srgb,var(--background)_55%,transparent)] backdrop-blur-[10px] sm:block"
      >
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
          {todos.map((i) => {
            const atual = ativo(i);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={atual ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition ${
                  atual ? "text-foreground" : "text-suave hover:text-foreground"
                }`}
              >
                <Icone nome={i.icone} className="size-4" />
                {i.rotulo}
                <Contador n={i.contagem} />
                {atual && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--grad)" }} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ------------------------------------------------ celular: barra embaixo */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-borda-forte bg-[color-mix(in_srgb,var(--background)_88%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] sm:hidden"
      >
        <div className="flex">
          {itens.map((i) => (
            <ItemBarra key={i.href} item={i} atual={ativo(i)} />
          ))}
          {mais.length > 0 && (
            <button
              type="button"
              onClick={() => setAbertoMais((v) => !v)}
              aria-expanded={abertoMais}
              aria-controls="nav-mais"
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                noMais || abertoMais ? "text-foreground" : "text-suave"
              }`}
            >
              <Icone nome="mais" />
              Mais
              {noMais && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full" style={{ background: "var(--grad)" }} />}
            </button>
          )}
        </div>
      </nav>

      {/* "Mais": folha que sobe de baixo */}
      {abertoMais && (
        <div className="fixed inset-0 z-20 sm:hidden" onClick={() => setAbertoMais(false)}>
          <div className="absolute inset-0 bg-[#000b38]/50 backdrop-blur-sm" />
          <div
            id="nav-mais"
            onClick={(e) => e.stopPropagation()}
            className="destaque-grad absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] space-y-1 rounded-2xl p-2"
            style={{ animation: "dh-sobe .2s both" }}
          >
            {mais.map((i) => {
              const atual = ativo(i);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setAbertoMais(false)}
                  aria-current={atual ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl p-3 text-sm font-semibold ${atual ? "bg-marca-fundo text-foreground" : "hover:bg-marca-fundo"}`}
                >
                  <Icone nome={i.icone} />
                  <span className="flex-1">{i.rotulo}</span>
                  <Contador n={i.contagem} />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function ItemBarra({ item, atual }: { item: ItemNav; atual: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={atual ? "page" : undefined}
      className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
        atual ? "text-foreground" : "text-suave"
      }`}
    >
      <span className="relative">
        <Icone nome={item.icone} />
        {item.contagem ? (
          <span className="absolute -top-1.5 -right-2.5">
            <Contador n={item.contagem} />
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate px-1">{item.rotulo}</span>
      {atual && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full" style={{ background: "var(--grad)" }} />}
    </Link>
  );
}
