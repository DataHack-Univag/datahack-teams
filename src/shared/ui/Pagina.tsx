import Link from "next/link";
import type { ReactNode } from "react";
import { Icone } from "@/shared/ui/Icone";

/** Container padrão das telas. */
export function Pagina({ children, estreita = false }: { children: ReactNode; estreita?: boolean }) {
  return (
    <div className={`mx-auto w-full min-w-0 space-y-6 px-4 py-6 sm:py-8 ${estreita ? "max-w-3xl" : "max-w-6xl"}`}>{children}</div>
  );
}

export type Trilha = { rotulo: string; href?: string }[];

/**
 * Topo de cada tela, sempre no mesmo formato (heurística 4): trilha "você está aqui"
 * (heurística 1), título, uma frase do que se faz na tela e as ações da página.
 */
export function CabecalhoPagina({
  trilha,
  titulo,
  destaque,
  descricao,
  acoes,
}: {
  trilha?: Trilha;
  titulo: string;
  /** Palavra do título pintada com o gradiente da marca. */
  destaque?: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
}) {
  const partes = destaque ? titulo.split(destaque) : [titulo];
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        {trilha && trilha.length > 0 && (
          <nav aria-label="Você está aqui" className="flex flex-wrap items-center gap-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-suave uppercase">
            {trilha.map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <Icone nome="avancar" className="size-3" />}
                {t.href ? (
                  <Link href={t.href} className="hover:text-foreground hover:underline">
                    {t.rotulo}
                  </Link>
                ) : (
                  <span aria-current="page">{t.rotulo}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-extrabold [overflow-wrap:anywhere] sm:text-3xl">
          {destaque ? (
            <>
              {partes[0]}
              <span className="grad-text">{destaque}</span>
              {partes[1]}
            </>
          ) : (
            titulo
          )}
        </h1>
        {descricao && <p className="max-w-3xl text-sm text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}

/** Sub-abas dentro de uma tela (ex.: Equipes · Trocas · Gerador). */
export function SubAbas({ abas, ativa }: { abas: { id: string; rotulo: string; href: string; contagem?: number }[]; ativa: string }) {
  return (
    <nav aria-label="Seções" className="flex gap-1 overflow-x-auto rounded-xl border border-borda-forte bg-superficie-solida p-1 [scrollbar-width:none]">
      {abas.map((a) => {
        const atual = a.id === ativa;
        return (
          <Link
            key={a.id}
            href={a.href}
            aria-current={atual ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition ${
              atual ? "text-white [background:var(--grad)]" : "text-suave hover:bg-marca-fundo hover:text-foreground"
            }`}
          >
            {a.rotulo}
            {a.contagem !== undefined && (
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${atual ? "bg-white/20" : "bg-marca-fundo"}`}>{a.contagem}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
