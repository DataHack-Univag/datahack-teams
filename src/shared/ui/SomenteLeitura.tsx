"use client";

import { createContext, useContext, type ReactNode } from "react";

// Edição encerrada = só consulta (migração 035). As telas desabilitam o que grava, em vez de
// deixar clicar e mostrar o erro do banco depois (heurística 5: prevenir o erro).

const Contexto = createContext(false);

/** true quando a edição da tela está encerrada: nada pode ser alterado. */
export const useSomenteLeitura = () => useContext(Contexto);

export function ProvedorSomenteLeitura({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  return <Contexto.Provider value={ativo}>{children}</Contexto.Provider>;
}

export const MOTIVO_SOMENTE_LEITURA = "Edição encerrada: só consulta. Nada pode ser alterado.";

/** Mostra o conteúdo só se der para alterar; na edição encerrada, mostra o aviso no lugar. */
export function SoSeEditavel({ children, aviso }: { children: ReactNode; aviso: ReactNode }) {
  const leitura = useSomenteLeitura();
  if (!leitura) return <>{children}</>;
  return (
    <p role="status" className="card border-l-4 border-l-[var(--marca)] text-sm">
      {aviso}
    </p>
  );
}
