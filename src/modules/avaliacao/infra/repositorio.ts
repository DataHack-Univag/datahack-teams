// Repositório das fichas de avaliação e penalidades. O RLS garante que cada avaliador só vê
// e grava as fichas dele, nas rubricas da banca dele, e só enquanto a avaliação está aberta.

import type { Ficha, Notas } from "@/modules/avaliacao/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

const SELECT_FICHA =
  "id, equipe_id, avaliador, rubrica, notas, comentario, atualizado_em, quem:inscritos!avaliacoes_avaliador_fkey(nome)";

export async function listarFichas(cliente: Cliente, filtro?: { equipeId?: string; avaliador?: string }): Promise<Ficha[]> {
  let q = cliente.from("avaliacoes").select(SELECT_FICHA);
  if (filtro?.equipeId) q = q.eq("equipe_id", filtro.equipeId);
  if (filtro?.avaliador) q = q.eq("avaliador", filtro.avaliador);
  const r = await q.order("atualizado_em", { ascending: false }).overrideTypes<Ficha[], { merge: false }>();
  return exigir(r, "as fichas de avaliação") ?? [];
}

/** Penalidades aplicadas: equipe → lista de ids. */
export async function listarPenalidades(cliente: Cliente): Promise<Map<string, string[]>> {
  const r = await cliente.from("penalidades_aplicadas").select("equipe_id, penalidade");
  const mapa = new Map<string, string[]>();
  for (const p of exigir(r, "as penalidades") ?? []) mapa.set(p.equipe_id, [...(mapa.get(p.equipe_id) ?? []), p.penalidade]);
  return mapa;
}

export async function avaliacaoEncerrada(cliente: Cliente): Promise<boolean> {
  const r = await cliente.from("configuracao").select("avaliacao_encerrada").eq("id", 1).maybeSingle();
  return !r.error && !!r.data?.avaliacao_encerrada;
}

export async function salvarFicha(
  cliente: Cliente,
  ficha: { equipe_id: string; avaliador: string; rubrica: string; notas: Notas; comentario: string | null },
) {
  const { error } = await cliente.from("avaliacoes").upsert(ficha, { onConflict: "equipe_id,avaliador,rubrica" });
  return { error };
}

export async function excluirFicha(cliente: Cliente, id: string) {
  const { data, error } = await cliente.from("avaliacoes").delete().eq("id", id).select("id");
  return { alterou: !!data?.length, error };
}

export async function aplicarPenalidade(cliente: Cliente, equipeId: string, penalidade: string, aplicadoPor: string | null) {
  const { error } = await cliente
    .from("penalidades_aplicadas")
    .upsert({ equipe_id: equipeId, penalidade, aplicado_por: aplicadoPor }, { onConflict: "equipe_id,penalidade" });
  return { error };
}

export async function retirarPenalidade(cliente: Cliente, equipeId: string, penalidade: string) {
  const { error } = await cliente.from("penalidades_aplicadas").delete().eq("equipe_id", equipeId).eq("penalidade", penalidade);
  return { error };
}
