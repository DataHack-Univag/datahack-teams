"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";

export type ItemMenu = { rotulo: string; href: string; descricao?: string; icone?: NomeIcone; baixar?: boolean };

/**
 * Menu de ações secundárias (heurística 8: o que é raro fica recolhido).
 * Fecha ao escolher, ao clicar fora ou com Esc. No celular abre logo abaixo, na largura da tela.
 */
export function Menu({ rotulo, icone = "mais", titulo, itens, children }: { rotulo: string; icone?: NomeIcone; titulo?: string; itens: ItemMenu[]; children?: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const fechar = (e: Event) => {
      const el = menu.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("click", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("click", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, []);

  return (
    <details ref={menu} className="group relative open:max-sm:w-full open:max-sm:basis-full">
      <summary className="btn-secundario cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <Icone nome={icone} className="size-4" />
        {rotulo}
        <span aria-hidden className="text-xs transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="destaque-grad z-30 mt-2 space-y-1 rounded-2xl p-2 shadow-lg max-sm:w-full sm:absolute sm:right-0 sm:w-80">
        {titulo && <p className="px-2 pt-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{titulo}</p>}
        {itens.map((o) => (
          <a
            key={o.href}
            href={o.href}
            download={o.baixar || undefined}
            onClick={() => menu.current && (menu.current.open = false)}
            className="flex items-start gap-3 rounded-xl p-2 hover:bg-superficie"
          >
            {o.icone && <Icone nome={o.icone} className="mt-0.5 size-4 text-suave" />}
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{o.rotulo}</span>
              {o.descricao && <span className="block text-xs text-suave">{o.descricao}</span>}
            </span>
          </a>
        ))}
        {children}
      </div>
    </details>
  );
}
