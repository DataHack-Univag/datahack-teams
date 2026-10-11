"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { escolherEdicao } from "@/modules/edicoes/application/actions";
import { Icone } from "@/shared/ui/Icone";

/**
 * Edição que a organização está vendo (heurística 1: sempre visível no cabeçalho).
 * Trocar a edição recarrega a tela com os dados dela; a edição "atual" (a dos alunos) não muda.
 */
export function SeletorEdicao({ edicoes, escolhida }: { edicoes: { id: string; nome: string; numero: number; atual: boolean }[]; escolhida: string }) {
  const form = useRef<HTMLFormElement>(null);
  const caminho = usePathname();
  if (edicoes.length < 2) {
    const e = edicoes[0];
    return e ? <span className="chip hidden max-w-56 truncate md:inline-flex" title={e.nome}>Edição {e.numero}</span> : null;
  }
  return (
    <form ref={form} action={escolherEdicao} className="hidden md:block">
      <input type="hidden" name="voltar" value={caminho.startsWith("/admin/equipes/") ? "/admin/equipes" : caminho} />
      <label className="relative flex items-center">
        <span className="sr-only">Edição que você está administrando</span>
        <Icone nome="relogio" className="pointer-events-none absolute left-2.5 size-4 text-suave" />
        <select
          name="edicao"
          defaultValue={escolhida}
          onChange={() => form.current?.requestSubmit()}
          className="campo min-h-9 max-w-64 py-1 pr-8 pl-8 text-xs"
          title="Edição que você está administrando"
        >
          {edicoes.map((e) => (
            <option key={e.id} value={e.id}>
              {`Edição ${e.numero} · ${e.nome}${e.atual ? " (atual)" : ""}`}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
