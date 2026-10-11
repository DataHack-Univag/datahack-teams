import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";

// Avisos com ícone + texto (cor nunca é a única pista; heurísticas 1 e 9).

export type Tom = "info" | "alerta" | "erro" | "sucesso" | "neutro";

const ESTILO: Record<Tom, { classe: string; icone: NomeIcone }> = {
  info: { classe: "border-[var(--azul)]/30 bg-[var(--azul)]/10", icone: "info" },
  alerta: { classe: "border-amber-400/60 bg-amber-500/12 text-amber-950 dark:text-amber-100", icone: "alerta" },
  erro: { classe: "border-red-400/60 bg-red-500/12 text-red-900 dark:text-red-100", icone: "erro" },
  sucesso: { classe: "border-emerald-400/60 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100", icone: "ok" },
  neutro: { classe: "border-borda bg-marca-fundo", icone: "info" },
};

export function Aviso({
  tom = "info",
  titulo,
  children,
  acao,
  className = "",
}: {
  tom?: Tom;
  titulo?: ReactNode;
  children?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  const e = ESTILO[tom];
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={`flex flex-wrap items-start gap-3 rounded-xl border p-3 text-sm ${e.classe} ${className}`}
    >
      <Icone nome={e.icone} className="mt-0.5 size-5" />
      <div className="min-w-0 flex-1 space-y-1 [overflow-wrap:anywhere]">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? "opacity-90" : ""}>{children}</div>}
      </div>
      {acao && <div className="flex shrink-0 flex-wrap gap-2">{acao}</div>}
    </div>
  );
}
