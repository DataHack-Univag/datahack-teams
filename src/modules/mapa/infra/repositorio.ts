import type { Elemento, MapaCanonico, Piso, Sala } from "@/modules/mapa/domain/tipos";
import { exigir } from "@/shared/db/erros";
import type { Cliente } from "@/shared/db/servidor";

// Mapa do evento: pisos, salas e elementos da edição (só os ativos; arquivar = removido_em).

const COLUNAS_SALA = "id, piso_id, nome, largura_cm, profundidade_cm, fundo, ordem";
const COLUNAS_ELEMENTO = "id, sala_id, tipo, rotulo, x_cm, y_cm, largura_cm, profundidade_cm, rotacao, lugares";

export type MapaDaEdicao = { pisos: (Piso & { salas: Sala[] })[]; elementos: Elemento[] };

/** O mapa inteiro da edição, já agrupado por piso (e as salas na ordem). */
export async function carregarMapa(cliente: Cliente, edicaoId: string): Promise<MapaDaEdicao> {
  const [rp, rs, re] = await Promise.all([
    cliente.from("pisos").select("id, nome, ordem").eq("edicao_id", edicaoId).is("removido_em", null).order("ordem"),
    cliente.from("salas").select(COLUNAS_SALA).eq("edicao_id", edicaoId).is("removido_em", null).order("ordem"),
    cliente
      .from("mapa_elementos")
      .select(COLUNAS_ELEMENTO)
      .eq("edicao_id", edicaoId)
      .is("removido_em", null)
      .order("criado_em")
      .overrideTypes<Elemento[], { merge: false }>(),
  ]);
  const salas = exigir(rs, "as salas") ?? [];
  return {
    pisos: (exigir(rp, "os pisos") ?? []).map((p) => ({ ...p, salas: salas.filter((s) => s.piso_id === p.id) })),
    elementos: exigir(re, "os elementos do mapa") ?? [],
  };
}

export async function buscarSala(cliente: Cliente, id: string): Promise<(Sala & { edicao_id: string }) | null> {
  const r = await cliente.from("salas").select(`${COLUNAS_SALA}, edicao_id`).eq("id", id).is("removido_em", null).maybeSingle();
  return exigir(r, "a sala");
}

// ---------------------------------------------------------------- gravação

export const criarPiso = (cliente: Cliente, edicaoId: string, nome: string, ordem: number) =>
  cliente.from("pisos").insert({ edicao_id: edicaoId, nome, ordem }).select("id").single();

export const renomearPiso = (cliente: Cliente, id: string, nome: string) => cliente.from("pisos").update({ nome }).eq("id", id).select("id");

export const arquivarPiso = (cliente: Cliente, id: string, arquivar: boolean) =>
  cliente.from("pisos").update({ removido_em: arquivar ? new Date().toISOString() : null }).eq("id", id).select("id");

export const criarSala = (cliente: Cliente, edicaoId: string, dados: Pick<Sala, "piso_id" | "nome" | "largura_cm" | "profundidade_cm" | "ordem">) =>
  cliente.from("salas").insert({ edicao_id: edicaoId, ...dados }).select("id").single();

export const atualizarSala = (cliente: Cliente, id: string, dados: Partial<Pick<Sala, "nome" | "largura_cm" | "profundidade_cm" | "fundo" | "piso_id">>) =>
  cliente.from("salas").update(dados).eq("id", id).select("id");

export const arquivarSala = (cliente: Cliente, id: string, arquivar: boolean) =>
  cliente.from("salas").update({ removido_em: arquivar ? new Date().toISOString() : null }).eq("id", id).select("id");

export const criarElementos = (cliente: Cliente, edicaoId: string, salaId: string, elementos: Omit<Elemento, "id" | "sala_id">[]) =>
  cliente.from("mapa_elementos").insert(elementos.map((e) => ({ ...e, edicao_id: edicaoId, sala_id: salaId }))).select("id");

export const atualizarElemento = (cliente: Cliente, id: string, dados: Partial<Omit<Elemento, "id" | "sala_id">>) =>
  cliente.from("mapa_elementos").update(dados).eq("id", id).select("id");

export const arquivarElemento = (cliente: Cliente, id: string, arquivar: boolean) =>
  cliente.from("mapa_elementos").update({ removido_em: arquivar ? new Date().toISOString() : null }).eq("id", id).select("id");

export const importarMapa = (cliente: Cliente, edicaoId: string, mapa: MapaCanonico, substituir: boolean) =>
  cliente.rpc("importar_mapa", { p_edicao: edicaoId, p_mapa: mapa, p_substituir: substituir });

export const exportarMapa = (cliente: Cliente, edicaoId: string) => cliente.rpc("exportar_mapa", { p_edicao: edicaoId });
