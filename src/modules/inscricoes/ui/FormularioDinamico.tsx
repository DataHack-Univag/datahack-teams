"use client";

import { visiveis, type Campo, type Respostas, type Valor } from "@/modules/inscricoes/domain/campos";

export type OpcaoInstituicao = { id: string; nome: string };

/**
 * O formulário de inscrição desenhado a partir das perguntas da edição. Pergunta condicional
 * só aparece quando a resposta anterior pede (heurística 8); cada erro aparece embaixo da
 * pergunta, em texto claro (heurística 9). Usado na prévia do editor e na página de inscrição.
 */
export function FormularioDinamico({
  campos,
  valores,
  aoMudar,
  erros = {},
  instituicoes = [],
  aceitaOutra = true,
}: {
  campos: Campo[];
  valores: Respostas;
  aoMudar: (chave: string, valor: Valor | undefined) => void;
  erros?: Record<string, string>;
  instituicoes?: OpcaoInstituicao[];
  aceitaOutra?: boolean;
}) {
  const vistos = visiveis(campos, valores);
  return (
    <div className="space-y-4">
      {campos
        .filter((c) => vistos.has(c.chave))
        .map((c) => {
          const id = `pergunta-${c.chave}`;
          const erro = erros[c.chave];
          const descricao = [c.ajuda ? `${id}-ajuda` : "", erro ? `${id}-erro` : ""].filter(Boolean).join(" ") || undefined;
          const comum = { id, "aria-invalid": erro ? true : undefined, "aria-describedby": descricao };
          return (
            <div key={c.chave}>
              {c.tipo === "aceite" ? (
                <label htmlFor={id} className="flex items-start gap-3 text-sm">
                  <input {...comum} type="checkbox" checked={valores[c.chave] === true} onChange={(e) => aoMudar(c.chave, e.target.checked || undefined)} className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]" />
                  <span>
                    <strong className="font-semibold">{c.rotulo}</strong>
                    {!c.obrigatorio && <span className="ml-1 text-suave">(opcional)</span>}
                  </span>
                </label>
              ) : (
                <>
                  {/* Grupo de opções (sim/não, várias) não tem um campo só: o texto da pergunta nomeia o grupo. */}
                  {c.tipo === "sim_nao" || c.tipo === "multipla" ? (
                    <span id={`${id}-rotulo`} className="rotulo">
                      {c.rotulo}
                      {!c.obrigatorio && <span className="ml-1 font-normal text-suave">(opcional)</span>}
                    </span>
                  ) : (
                    <label htmlFor={id} className="rotulo">
                      {c.rotulo}
                      {!c.obrigatorio && <span className="ml-1 font-normal text-suave">(opcional)</span>}
                    </label>
                  )}
                  <Entrada campo={c} comum={comum} valor={valores[c.chave]} aoMudar={(v) => aoMudar(c.chave, v)} instituicoes={instituicoes} aceitaOutra={aceitaOutra} />
                </>
              )}
              {c.ajuda && (
                <span id={`${id}-ajuda`} className="mt-1 block text-xs text-suave">
                  {c.ajuda}
                </span>
              )}
              {erro && (
                <span id={`${id}-erro`} role="alert" className="mt-1 block text-xs font-medium text-red-600 dark:text-red-400">
                  {erro}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
}

type Comum = { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

function Entrada({
  campo: c,
  comum,
  valor,
  aoMudar,
  instituicoes,
  aceitaOutra,
}: {
  campo: Campo;
  comum: Comum;
  valor: Valor | undefined;
  aoMudar: (v: Valor | undefined) => void;
  instituicoes: OpcaoInstituicao[];
  aceitaOutra: boolean;
}) {
  const opcoes = Array.isArray(c.opcoes) ? c.opcoes : [];
  const faixa = c.opcoes && !Array.isArray(c.opcoes) ? c.opcoes : {};
  switch (c.tipo) {
    case "texto_longo":
      return <textarea {...comum} rows={3} maxLength={2000} className="campo" value={typeof valor === "string" ? valor : ""} onChange={(e) => aoMudar(e.target.value || undefined)} />;
    case "numero":
      return (
        <input
          {...comum}
          type="number"
          inputMode="numeric"
          min={faixa.min}
          max={faixa.max}
          className="campo"
          value={typeof valor === "number" ? valor : ""}
          onChange={(e) => aoMudar(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );
    case "data":
      return <input {...comum} type="date" className="campo" value={typeof valor === "string" ? valor : ""} onChange={(e) => aoMudar(e.target.value || undefined)} />;
    case "escolha":
    case "instituicao": {
      const itens =
        c.tipo === "instituicao"
          ? [...instituicoes.map((i) => ({ valor: i.id, rotulo: i.nome })), ...(aceitaOutra ? [{ valor: "outra", rotulo: "Outra / não estudo" }] : [])]
          : opcoes.map((o) => ({ valor: o, rotulo: o }));
      return (
        <select {...comum} className="campo" value={typeof valor === "string" ? valor : ""} onChange={(e) => aoMudar(e.target.value || undefined)}>
          <option value="">Escolha…</option>
          {itens.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      );
    }
    case "sim_nao":
      return (
        <div role="radiogroup" aria-labelledby={`${comum.id}-rotulo`} aria-describedby={comum["aria-describedby"]} className="flex gap-2">
          {[
            [true, "Sim"],
            [false, "Não"],
          ].map(([v, r]) => (
            <label key={String(v)} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm ${valor === v ? "border-marca bg-marca-fundo font-semibold" : "border-borda"}`}>
              <input type="radio" name={comum.id} checked={valor === v} onChange={() => aoMudar(v as boolean)} className="accent-[var(--marca)]" />
              {r as string}
            </label>
          ))}
        </div>
      );
    case "multipla": {
      const marcadas = Array.isArray(valor) ? valor : [];
      return (
        <div role="group" aria-labelledby={`${comum.id}-rotulo`} aria-describedby={comum["aria-describedby"]} className="flex flex-wrap gap-2">
          {opcoes.map((o) => (
            <label key={o} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${marcadas.includes(o) ? "border-marca bg-marca-fundo font-semibold" : "border-borda"}`}>
              <input
                type="checkbox"
                checked={marcadas.includes(o)}
                onChange={() => {
                  const novo = marcadas.includes(o) ? marcadas.filter((x) => x !== o) : [...marcadas, o];
                  aoMudar(novo.length ? novo : undefined);
                }}
                className="accent-[var(--marca)]"
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    default:
      return <input {...comum} type="text" maxLength={300} className="campo" value={typeof valor === "string" ? valor : ""} onChange={(e) => aoMudar(e.target.value || undefined)} />;
  }
}
