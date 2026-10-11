import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";

// Um só botão para o sistema todo (heurística 4): mesmas cores, tamanhos e lugar do ícone.

export type Variante = "primario" | "secundario" | "perigo" | "perigoSolido" | "fantasma";
export type Tamanho = "normal" | "pequeno";

const VARIANTE: Record<Variante, string> = {
  primario: "btn-primario",
  secundario: "btn-secundario",
  perigo: "btn-perigo",
  perigoSolido: "btn border-0 bg-red-600 text-white hover:bg-red-500",
  fantasma: "btn border border-transparent text-marca hover:bg-marca-fundo",
};
const TAMANHO: Record<Tamanho, string> = { normal: "", pequeno: "min-h-9 px-3 text-xs" };

export function classeBotao(variante: Variante = "primario", tamanho: Tamanho = "normal", extra = "") {
  return `${VARIANTE[variante]} ${TAMANHO[tamanho]} ${extra}`.trim();
}

type Comum = { variante?: Variante; tamanho?: Tamanho; icone?: NomeIcone; children?: ReactNode; className?: string };

export function Botao({
  variante,
  tamanho,
  icone,
  children,
  className,
  carregando = false,
  ...props
}: Comum & ComponentProps<"button"> & { carregando?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || carregando}
      aria-busy={carregando || undefined}
      className={classeBotao(variante, tamanho, className)}
    >
      {carregando ? <Girando /> : icone ? <Icone nome={icone} className="size-4" /> : null}
      {children}
    </button>
  );
}

/** Link com cara de botão (navegação). Links externos abrem em nova aba. */
export function BotaoLink({ variante, tamanho, icone, children, className, href, externo = false, ...props }: Comum & { href: string; externo?: boolean } & Omit<ComponentProps<"a">, "href">) {
  const classe = classeBotao(variante ?? "secundario", tamanho, className);
  const conteudo = (
    <>
      {icone && <Icone nome={icone} className="size-4" />}
      {children}
    </>
  );
  if (externo || /^https?:/.test(href))
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classe} {...props}>
        {conteudo}
      </a>
    );
  return (
    <Link href={href} className={classe} {...props}>
      {conteudo}
    </Link>
  );
}

export function Girando({ className = "size-4" }: { className?: string }) {
  return <span aria-hidden className={`${className} animate-spin rounded-full border-2 border-current border-t-transparent`} />;
}
