"use client";

import { useState } from "react";
import { instrucoesRegulamentoIA } from "@/modules/avaliacao/domain/regulamento";
import { importarRegulamento } from "@/modules/edicoes/application/actions";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

/** Regulamento de outra edição para usar como ponto de partida. */
export type ModeloRegulamento = { rotulo: string; json: string };

/**
 * Importar (ou trocar, enquanto não há fichas) o regulamento por JSON. Pensado para planejar
 * com uma IA: copiar as instruções, partir de um modelo, colar o resultado. O sistema confere
 * a estrutura e os pesos e diz onde está cada problema antes de gravar (heurísticas 5 e 9).
 */
export function ImportarRegulamento({ edicaoId, substituir, modelos }: { edicaoId: string; substituir: boolean; modelos: ModeloRegulamento[] }) {
  const [json, setJson] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(instrucoesRegulamentoIA());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-suave">
        <li>Copie as instruções e mande para uma IA (ChatGPT, Claude…) dizendo como serão as fases, as bancas e o que avaliar.</li>
        <li>Se quiser partir de uma edição anterior, escolha o modelo abaixo, copie o JSON e peça para a IA ajustar.</li>
        <li>Cole aqui o JSON que ela devolver e importe. O sistema confere tudo antes de gravar.</li>
      </ol>

      <div className="flex flex-wrap items-end gap-2">
        <button type="button" onClick={() => void copiar()} className="btn-secundario min-h-9 px-3 text-xs">
          <Icone nome={copiado ? "ok" : "copiar"} className="size-4" /> {copiado ? "Instruções copiadas" : "Copiar instruções para a IA"}
        </button>
        {modelos.length > 0 && (
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Começar de um modelo</span>
            <select
              id="modelo-regulamento"
              className="campo min-h-9 py-1 text-sm"
              defaultValue=""
              onChange={(ev) => {
                const m = modelos.find((x) => x.rotulo === ev.target.value);
                if (m) setJson(m.json);
              }}
            >
              <option value="">Escolha uma edição…</option>
              {modelos.map((m) => (
                <option key={m.rotulo} value={m.rotulo}>
                  {m.rotulo}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <details className="text-xs text-suave">
        <summary className="cursor-pointer">Ver as instruções (o formato do JSON)</summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-marca-fundo p-3 font-mono text-[11px] whitespace-pre-wrap">{instrucoesRegulamentoIA()}</pre>
      </details>

      <Formulario
        action={importarRegulamento}
        className="space-y-3"
        confirmar={substituir ? "O regulamento atual sai e entra o novo. O atual fica guardado no histórico. Dá para trocar de novo enquanto não houver fichas." : undefined}
        tituloConfirmar={substituir ? "Trocar o regulamento desta edição?" : undefined}
        rotuloConfirmar="Trocar regulamento"
        perigo={false}
      >
        <Ocultos valores={{ id: edicaoId, substituir: substituir ? "1" : "" }} />
        <label className="block">
          <span className="rotulo">Regulamento (JSON)</span>
          <textarea
            id="json-regulamento"
            name="json"
            rows={10}
            required
            value={json}
            onChange={(ev) => setJson(ev.target.value)}
            placeholder='{ "bancas": [ … ], "niveis": [ … ], "fases": [ … ], "rubricas": [ … ], "penalidades": [ … ], "desempate": [ … ] }'
            className="campo font-mono text-xs"
          />
        </label>
        <BotaoEnviar icone="baixar">{substituir ? "Trocar regulamento" : "Importar regulamento"}</BotaoEnviar>
      </Formulario>
    </div>
  );
}
