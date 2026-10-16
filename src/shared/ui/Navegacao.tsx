"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  /** Itens de "mais" com o mesmo grupo viram um menu ("Participantes ▾"); sem grupo, ficam à direita. */
  grupo?: string;
};

function useAtivo() {
  const caminho = usePathname();
  const params = useSearchParams();
  const aba = params.get("aba");
  return (i: ItemNav) => {
    if (i.aba !== undefined) return aba ? aba === i.aba : !!i.padrao;
    const base = i.href.split("?")[0];
    // O próprio endereço sempre conta; os prefixos acrescentam as subpáginas.
    return caminho === base || (i.prefixos ?? []).some((p) => caminho === p || caminho.startsWith(p + "/"));
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

/** Junta os itens por grupo, na ordem em que aparecem. */
function agrupar(itens: ItemNav[]): { grupo: string | null; itens: ItemNav[] }[] {
  const grupos: { grupo: string | null; itens: ItemNav[] }[] = [];
  for (const i of itens) {
    const g = grupos.find((x) => x.grupo === (i.grupo ?? null));
    if (g) g.itens.push(i);
    else grupos.push({ grupo: i.grupo ?? null, itens: [i] });
  }
  return grupos;
}

const classeAba = (atual: boolean) =>
  `relative flex shrink-0 items-center gap-2 px-2.5 py-3 text-sm xl:px-3 font-semibold whitespace-nowrap transition ${atual ? "text-foreground" : "text-suave hover:text-foreground"}`;
const Sublinhado = () => <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--grad)" }} />;

/**
 * Navegação principal (heurística 4: mesma forma em todas as áreas).
 * Computador: o que se usa o tempo todo fica em abas; o resto, em menus por tarefa
 * ("Participantes ▾", "Durante o evento ▾"…), que mostram a tela aberta e somam as pendências
 * (heurísticas 1, 6 e 8). Celular e tablet: barra fixa embaixo, ao alcance do polegar, com até
 * 4 itens; o resto fica em "Mais", com os mesmos grupos.
 */
export function Navegacao({ itens, mais = [] }: { itens: ItemNav[]; mais?: ItemNav[] }) {
  const ativo = useAtivo();
  const [abertoMais, setAbertoMais] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const barra = useRef<HTMLDivElement>(null);

  // Esc fecha qualquer menu; clicar fora fecha o menu do computador.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAbertoMais(false);
      setAberto(null);
    };
    const fora = (e: MouseEvent) => {
      if (barra.current && !barra.current.contains(e.target as Node)) setAberto(null);
    };
    addEventListener("keydown", tecla);
    addEventListener("mousedown", fora);
    return () => {
      removeEventListener("keydown", tecla);
      removeEventListener("mousedown", fora);
    };
  }, []);

  const grupos = agrupar(mais);
  const noMais = mais.some(ativo);

  return (
    <>
      {/* ------------------------------------------------ computador: abas + menus por tarefa */}
      <nav
        aria-label="Navegação principal"
        className="relative z-20 hidden border-b border-borda bg-[color-mix(in_srgb,var(--background)_55%,transparent)] backdrop-blur-[10px] lg:block"
      >
        <div ref={barra} className="mx-auto flex max-w-6xl items-stretch gap-1 px-4">
          {itens.map((i) => {
            const atual = ativo(i);
            return (
              <Link key={i.href} href={i.href} aria-current={atual ? "page" : undefined} className={classeAba(atual)}>
                <Icone nome={i.icone} className="size-4" />
                {i.rotulo}
                <Contador n={i.contagem} />
                {atual && <Sublinhado />}
              </Link>
            );
          })}

          {grupos
            .filter((g) => g.grupo)
            .map((g, n, lista) => {
              const nome = g.grupo!;
              const naTela = g.itens.find(ativo);
              const pendencias = g.itens.reduce((t, i) => t + (i.contagem ?? 0), 0);
              const estaAberto = aberto === nome;
              const id = `menu-${nome.replace(/\W+/g, "-")}`;
              return (
                <div key={nome} className="relative flex">
                  <button
                    type="button"
                    onClick={() => setAberto(estaAberto ? null : nome)}
                    aria-expanded={estaAberto}
                    aria-controls={id}
                    className={classeAba(!!naTela)}
                  >
                    {nome}
                    {/* A tela aberta no nome do grupo, quando cabe (nas telas menores, o destaque basta). */}
                    {naTela && <span className="hidden font-normal text-suave xl:inline">· {naTela.rotulo}</span>}
                    <Contador n={pendencias} />
                    <span aria-hidden className={`text-xs text-suave transition-transform ${estaAberto ? "rotate-180" : ""}`}>
                      ▾
                    </span>
                    {naTela && <Sublinhado />}
                  </button>
                  {estaAberto && (
                    <div
                      id={id}
                      // O último menu abre para a esquerda, para não sair da tela.
                      className={`destaque-grad absolute top-full z-40 mt-1 w-64 space-y-0.5 rounded-2xl p-1.5 shadow-lg ${n === lista.length - 1 ? "right-0" : "left-0"}`}
                    >
                      {g.itens.map((i) => {
                        const atual = ativo(i);
                        return (
                          <Link
                            key={i.href}
                            href={i.href}
                            onClick={() => setAberto(null)}
                            aria-current={atual ? "page" : undefined}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${atual ? "bg-marca-fundo text-foreground" : "text-suave hover:bg-marca-fundo hover:text-foreground"}`}
                          >
                            <Icone nome={i.icone} className="size-4" />
                            <span className="flex-1">{i.rotulo}</span>
                            <Contador n={i.contagem} />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Sem grupo (ex.: Ajuda): à direita. */}
          <div className="ml-auto flex">
            {grupos
              .filter((g) => !g.grupo)
              .flatMap((g) => g.itens)
              .map((i) => {
                const atual = ativo(i);
                return (
                  <Link key={i.href} href={i.href} aria-current={atual ? "page" : undefined} className={classeAba(atual)}>
                    <Icone nome={i.icone} className="size-4" />
                    {i.rotulo}
                    <Contador n={i.contagem} />
                    {atual && <Sublinhado />}
                  </Link>
                );
              })}
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------ celular e tablet: barra embaixo */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-borda-forte bg-[color-mix(in_srgb,var(--background)_88%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] lg:hidden"
      >
        <div className="mx-auto flex max-w-3xl">
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
              <span className="relative">
                <Icone nome="mais" />
                {mais.some((i) => i.contagem) && <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-[var(--magenta)]" aria-label="Há pendências" />}
              </span>
              Mais
              {noMais && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full" style={{ background: "var(--grad)" }} />}
            </button>
          )}
        </div>
      </nav>

      {/* "Mais": folha que sobe de baixo, com os grupos */}
      {abertoMais && (
        <div className="fixed inset-0 z-20 lg:hidden" onClick={() => setAbertoMais(false)}>
          <div className="absolute inset-0 bg-[var(--veu)] backdrop-blur-sm" />
          <div
            id="nav-mais"
            onClick={(e) => e.stopPropagation()}
            className="destaque-grad absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] mx-auto max-h-[70vh] max-w-lg space-y-2 overflow-y-auto rounded-2xl p-2"
            style={{ animation: "dh-sobe .2s both" }}
          >
            {grupos.map((g) => (
              <div key={g.grupo ?? "outros"} className="space-y-0.5">
                {g.grupo && <p className="px-3 pt-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{g.grupo}</p>}
                {g.itens.map((i) => {
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
            ))}
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
