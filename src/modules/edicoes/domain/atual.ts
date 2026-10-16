// O que oferecer, sobre a edição que está acontecendo, a quem só participou de edições anteriores.

import type { SituacaoInscricao, SituacaoInscricoes } from "@/modules/inscricoes/domain/publica";

export type ChamadaAtual =
  | { tipo: "abrir" } // já participa: é só abrir
  | { tipo: "acompanhar"; situacao: SituacaoInscricao } // já se inscreveu: acompanha
  | { tipo: "inscrever"; slug: string } // inscrições abertas pelo site
  | { tipo: "em_breve"; slug: string }
  | { tipo: "encerrada" }
  | { tipo: "convite" }; // lista fechada (ou banco sem a migração 025): só pela organização

export function chamadaDaAtual({
  participa,
  minhaInscricao,
  slug,
  inscricoes,
}: {
  participa: boolean;
  /** Situação da inscrição da pessoa nesta edição, se ela já se inscreveu. */
  minhaInscricao?: SituacaoInscricao | null;
  slug?: string | null;
  inscricoes?: SituacaoInscricoes | null;
}): ChamadaAtual {
  if (participa) return { tipo: "abrir" };
  // Recusada ou cancelada: pode tentar de novo se ainda estiver aberta.
  if (minhaInscricao && minhaInscricao !== "recusada" && minhaInscricao !== "cancelada") return { tipo: "acompanhar", situacao: minhaInscricao };
  if (!slug) return { tipo: "convite" };
  if (inscricoes === "aberta") return { tipo: "inscrever", slug };
  if (inscricoes === "em_breve") return { tipo: "em_breve", slug };
  if (inscricoes === "encerrada") return { tipo: "encerrada" };
  return { tipo: "convite" };
}
