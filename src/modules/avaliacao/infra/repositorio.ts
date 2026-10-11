// Repositório da avaliação: regulamento da edição, fichas e penalidades. O banco (RLS + funções)
// garante que cada avaliador só vê e grava as fichas dele, nas rubricas da banca dele, e só
// enquanto a avaliação está aberta. Nada é apagado: ficha e penalidade "removidas" são arquivadas.

import { cache } from "react";
import { regulamentoDoCanonico, type Regulamento, type RegulamentoCanonico } from "@/modules/avaliacao/domain/regulamento";
import type { Ficha, Notas } from "@/modules/avaliacao/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";
import type { Json } from "@/shared/db/tipos-banco";

/** Regulamento da edição (uma consulta por requisição). */
export const carregarRegulamento = cache(async (cliente: Cliente, edicaoId: string): Promise<Regulamento> => {
  const [rJson, rRub, rCrit, rPen] = await Promise.all([
    cliente.rpc("exportar_regulamento", { p_edicao: edicaoId }),
    cliente.from("rubricas").select("id, codigo").eq("edicao_id", edicaoId),
    cliente.from("criterios").select("id, codigo, rubrica:rubricas(codigo)").eq("edicao_id", edicaoId).overrideTypes<{ id: string; codigo: string; rubrica: { codigo: string } | null }[], { merge: false }>(),
    cliente.from("penalidades").select("id, codigo").eq("edicao_id", edicaoId),
  ]);
  const json = exigir(rJson, "o regulamento da edição") as unknown as RegulamentoCanonico;
  return regulamentoDoCanonico(json, {
    rubricas: Object.fromEntries((exigir(rRub, "as rubricas") ?? []).map((r) => [r.codigo, r.id])),
    criterios: Object.fromEntries((exigir(rCrit, "os critérios") ?? []).map((c) => [`${c.rubrica?.codigo}.${c.codigo}`, c.id])),
    penalidades: Object.fromEntries((exigir(rPen, "as penalidades") ?? []).map((p) => [p.codigo, p.id])),
  });
});

type LinhaFicha = {
  id: string;
  equipe_id: string;
  avaliador: string;
  comentario: string | null;
  atualizado_em: string;
  rubrica: { codigo: string } | null;
  quem: { nome: string } | null;
  notas: { criterio: { codigo: string } | null; nivel: { fator: number } | null }[];
};

const SELECT_FICHA =
  "id, equipe_id, avaliador, comentario, atualizado_em, rubrica:rubricas(codigo), quem:pessoas!fichas_avaliador_fkey(nome), notas:notas_criterio(criterio:criterios(codigo), nivel:niveis(fator))";

export async function listarFichas(cliente: Cliente, edicaoId: string, filtro?: { equipeId?: string; avaliador?: string }): Promise<Ficha[]> {
  let q = cliente.from("fichas").select(SELECT_FICHA).eq("edicao_id", edicaoId).is("removido_em", null);
  if (filtro?.equipeId) q = q.eq("equipe_id", filtro.equipeId);
  if (filtro?.avaliador) q = q.eq("avaliador", filtro.avaliador);
  const r = await q.order("atualizado_em", { ascending: false }).overrideTypes<LinhaFicha[], { merge: false }>();
  return (exigir(r, "as fichas de avaliação") ?? []).map((f) => {
    const notas: Notas = {};
    for (const n of f.notas ?? []) if (n.criterio && n.nivel) notas[n.criterio.codigo] = Number(n.nivel.fator);
    return {
      id: f.id,
      equipe_id: f.equipe_id,
      avaliador: f.avaliador,
      rubrica: f.rubrica?.codigo ?? "",
      notas,
      comentario: f.comentario,
      atualizado_em: f.atualizado_em,
      quem: f.quem,
    };
  });
}

/** Penalidades aplicadas (ativas): equipe → códigos. */
export async function listarPenalidades(cliente: Cliente, edicaoId: string): Promise<Map<string, string[]>> {
  const r = await cliente
    .from("penalidades_equipe")
    .select("equipe_id, penalidade:penalidades(codigo)")
    .eq("edicao_id", edicaoId)
    .is("removido_em", null)
    .overrideTypes<{ equipe_id: string; penalidade: { codigo: string } | null }[], { merge: false }>();
  const mapa = new Map<string, string[]>();
  for (const p of exigir(r, "as penalidades") ?? [])
    if (p.penalidade) mapa.set(p.equipe_id, [...(mapa.get(p.equipe_id) ?? []), p.penalidade.codigo]);
  return mapa;
}

/** Grava a ficha do avaliador logado. `notas` tem todos os critérios (null = sem nível). */
export const salvarFicha = (
  cliente: Cliente,
  ficha: { equipeId: string; rubricaUuid: string; notas: Record<string, number | null>; comentario: string | null },
) =>
  cliente.rpc("salvar_ficha", {
    p_equipe: ficha.equipeId,
    p_rubrica: ficha.rubricaUuid,
    p_notas: ficha.notas as Json,
    p_comentario: ficha.comentario ?? undefined,
  });

export const arquivarFicha = (cliente: Cliente, id: string) => cliente.rpc("arquivar_ficha", { p_ficha: id });

export async function aplicarPenalidade(cliente: Cliente, edicaoId: string, equipeId: string, penalidadeUuid: string, aplicadoPor: string | null) {
  const { error } = await cliente
    .from("penalidades_equipe")
    .insert({ edicao_id: edicaoId, equipe_id: equipeId, penalidade_id: penalidadeUuid, aplicado_por: aplicadoPor });
  // Já aplicada (clique duplo): não é erro.
  return { error: error?.code === "23505" ? null : error };
}

export async function retirarPenalidade(cliente: Cliente, equipeId: string, penalidadeUuid: string, removidoPor: string | null) {
  const { error } = await cliente
    .from("penalidades_equipe")
    .update({ removido_em: new Date().toISOString(), removido_por: removidoPor })
    .eq("equipe_id", equipeId)
    .eq("penalidade_id", penalidadeUuid)
    .is("removido_em", null);
  return { error };
}
