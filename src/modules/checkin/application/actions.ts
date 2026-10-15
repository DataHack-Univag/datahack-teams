"use server";

import type { ResultadoCheckin } from "@/modules/checkin/infra/repositorio";
import * as repo from "@/modules/checkin/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { atualizarTelas } from "@/shared/acao/acao";
import { traduzirErro } from "@/shared/db/erros";

/**
 * Leitura de um QR (ou código digitado) na entrada. Devolve quem é, para a tela mostrar na hora;
 * o banco confere se quem lê é da mentoria ou da organização.
 */
export async function checkinPorCodigo(codigo: string): Promise<{ ok: true; pessoa: ResultadoCheckin } | { ok: false; erro: string }> {
  const limpo = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (limpo.length !== 8) return { ok: false, erro: "Código incompleto: são 8 letras e números." };
  const { cliente, edicao } = await sessaoAtual();
  const { data, error } = await repo.fazerCheckin(cliente, edicao.id, limpo);
  if (error) return { ok: false, erro: error.code === "P0001" ? error.message : traduzirErro(error) };
  atualizarTelas();
  return { ok: true, pessoa: data as unknown as ResultadoCheckin };
}
