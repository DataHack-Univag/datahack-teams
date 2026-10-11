import type { ReactNode } from "react";
import type { Tom } from "@/shared/ui/Aviso";

const TOM: Record<Tom | "marca" | "forte", string> = {
  info: "bg-[var(--azul)]/12 text-[var(--azul)] dark:text-blue-200",
  alerta: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  erro: "bg-red-500/15 text-red-700 dark:text-red-300",
  sucesso: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  neutro: "bg-marca-fundo text-suave",
  marca: "bg-marca-fundo text-marca",
  forte: "bg-foreground text-background",
};

/** Etiqueta curta de estado ("Público", "Líder", "Aguardando"). Sempre com texto. */
export function Selo({ tom = "neutro", children, title }: { tom?: keyof typeof TOM; children: ReactNode; title?: string }) {
  return (
    <span className={`selo ${TOM[tom]}`} title={title}>
      {children}
    </span>
  );
}
