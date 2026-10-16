"use client";

import { useState } from "react";
import { limparRespostas, validarRespostas, type Campo, type Respostas } from "@/modules/inscricoes/domain/campos";
import { FormularioDinamico, type OpcaoInstituicao } from "@/modules/inscricoes/ui/FormularioDinamico";

/**
 * As outras perguntas do formulário da edição dentro do cadastro em Pessoas (a organização
 * preenche pela pessoa). Não cobra as obrigatórias, mas avisa formato errado na hora.
 */
export function CamposExtras({
  campos,
  inicial,
  instituicoes,
  aceitaOutra,
}: {
  campos: Campo[];
  inicial: Respostas;
  instituicoes: OpcaoInstituicao[];
  aceitaOutra: boolean;
}) {
  const [respostas, setRespostas] = useState<Respostas>(inicial);
  const soltos = campos.map((c) => ({ ...c, obrigatorio: false }));
  const erros = validarRespostas(soltos, respostas, { instituicoes: instituicoes.map((i) => i.id), aceitaOutra });
  return (
    <fieldset className="space-y-3 rounded-xl border border-borda p-3">
      <legend className="px-1 text-sm font-semibold">Outras perguntas da edição</legend>
      <input type="hidden" name="respostas" value={JSON.stringify(limparRespostas(soltos, respostas))} />
      <FormularioDinamico
        campos={soltos}
        valores={respostas}
        aoMudar={(k, v) => setRespostas((r) => ({ ...Object.fromEntries(Object.entries(r).filter(([x]) => x !== k)), ...(v === undefined ? {} : { [k]: v }) }))}
        erros={erros}
        instituicoes={instituicoes}
        aceitaOutra={aceitaOutra}
      />
      <p className="text-xs text-suave">Para participantes. Em branco = a pessoa ainda não respondeu.</p>
    </fieldset>
  );
}
