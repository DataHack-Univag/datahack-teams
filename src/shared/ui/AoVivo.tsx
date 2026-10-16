"use client";

import type { TabelaAoVivo } from "@/shared/lib/tempoReal";
import { TempoReal } from "@/shared/ui/TempoReal";

/**
 * Atualiza a tela na hora em que uma linha de uma tabela muda (ex.: a inscrição foi
 * aprovada, o check-in foi feito). Atalho do <TempoReal> para uma tabela só, sem avisos.
 */
export function AoVivo({ tabela, filtro, reserva = 20 }: { tabela: TabelaAoVivo; filtro: string; reserva?: number }) {
  return <TempoReal assinaturas={[{ tabela, filtro }]} reserva={reserva} />;
}
