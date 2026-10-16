"use client";

import { useState } from "react";
import { salvarSituacaoEdicao } from "@/modules/edicoes/application/actions";
import { SITUACOES_EDICAO, type Edicao } from "@/modules/edicoes/domain/tipos";
import { AreaTexto } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";

/**
 * Situação da edição: um cartão por situação (heurística 6: ver as opções e o efeito de cada
 * uma). Cancelar pede o motivo e confirmação (heurística 5); a edição atual não pode ser cancelada.
 */
export function FormSituacaoEdicao({ edicao }: { edicao: Pick<Edicao, "id" | "situacao" | "atual" | "motivo_cancelamento"> }) {
  const [escolhida, setEscolhida] = useState(edicao.situacao);
  const cancelar = escolhida === "cancelada";
  const mudou = escolhida !== edicao.situacao;

  return (
    <Formulario
      action={salvarSituacaoEdicao}
      livre
      className="space-y-3"
      confirmar={cancelar && mudou ? "O link de inscrição desta edição deixa de funcionar. Dá para desfazer depois mudando a situação de novo." : undefined}
      tituloConfirmar="Cancelar esta edição?"
      rotuloConfirmar="Cancelar a edição"
      perigo
    >
      <Ocultos valores={{ id: edicao.id }} />
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Situação</legend>
        {SITUACOES_EDICAO.map((s) => {
          // A atual não pode ser cancelada nem voltar ao planejamento (banco, 031/033).
          const bloqueada = edicao.atual && (s.valor === "cancelada" || (s.valor === "planejada" && edicao.situacao !== "planejada"));
          return (
            <label
              key={s.valor}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition has-[:checked]:border-marca has-[:checked]:bg-marca-fundo ${
                bloqueada ? "cursor-not-allowed border-borda opacity-60" : "border-borda hover:bg-superficie"
              }`}
            >
              <input
                type="radio"
                name="situacao"
                value={s.valor}
                checked={escolhida === s.valor}
                disabled={bloqueada}
                onChange={() => setEscolhida(s.valor)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--marca)]"
              />
              <span>
                <span className="block font-semibold">
                  {s.rotulo}
                  {s.valor === edicao.situacao && <span className="ml-2 text-xs font-normal text-suave">(agora)</span>}
                </span>
                <span className="block text-xs text-suave">
                  {bloqueada
                    ? s.valor === "cancelada"
                      ? "A edição atual não pode ser cancelada: torne outra a atual antes."
                      : "A edição atual está acontecendo. Para voltar ao planejamento, use “Deixar de ser a atual” antes."
                    : s.descricao}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {cancelar && (
        <AreaTexto
          rotulo="Motivo do cancelamento"
          name="motivo"
          rows={2}
          minLength={5}
          maxLength={500}
          required
          defaultValue={edicao.motivo_cancelamento ?? ""}
          placeholder="Ex.: faltou patrocínio, o local não ficou disponível…"
          dica="Fica registrado na edição para consulta."
        />
      )}
      <BotaoEnviar icone="ok" desativado={!mudou && !cancelar} variante={cancelar && mudou ? "perigoSolido" : "primario"}>
        {cancelar && mudou ? "Cancelar a edição" : "Salvar situação"}
      </BotaoEnviar>
    </Formulario>
  );
}
