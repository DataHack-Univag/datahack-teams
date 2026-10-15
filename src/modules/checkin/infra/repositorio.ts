import type { Cliente } from "@/shared/db/servidor";

// Check-in por QR: o código de cada participante e a leitura na entrada.

/** O código de quem está logado nesta edição (null se o banco não tiver a migração 021). */
export async function meuCodigo(cliente: Cliente, edicaoId: string): Promise<string | null> {
  const { data, error } = await cliente.rpc("meu_codigo_checkin", { p_edicao: edicaoId });
  return error ? null : (data ?? null);
}

export type ResultadoCheckin = { nome: string; email: string; papel: string; equipe: string | null; ja_estava: boolean; presenca_em: string | null };

export const fazerCheckin = (cliente: Cliente, edicaoId: string, codigo: string) =>
  cliente.rpc("fazer_checkin", { p_edicao: edicaoId, p_codigo: codigo });
