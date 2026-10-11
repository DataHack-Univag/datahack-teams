import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/shared/ui/Icone";

/** Lista vazia explicando o porquê e o próximo passo (em vez de só "nada aqui"). */
export function EstadoVazio({
  icone = "info",
  titulo,
  children,
  acao,
}: {
  icone?: NomeIcone;
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-borda-forte px-4 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-marca-fundo text-marca">
        <Icone nome={icone} />
      </span>
      <p className="font-semibold">{titulo}</p>
      {children && <div className="max-w-md text-sm text-suave">{children}</div>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
