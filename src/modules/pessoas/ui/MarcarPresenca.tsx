"use client";

import { useFormStatus } from "react-dom";
import { registrarPresenca, registrarPresencas } from "@/modules/pessoas/application/actions";
import type { Presenca } from "@/modules/pessoas/domain/tipos";
import { Avatar } from "@/shared/ui/Avatar";
import { Girando } from "@/shared/ui/Botao";
import { Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

/** Quem aparece num bloco de presença: o essencial para reconhecer a pessoa. */
export type PessoaPresenca = { email: string; nome: string; detalhe?: string; presenca: Presenca | null };

/**
 * Os dois botões de presença de um aluno (chamada e equipes). O que já está marcado fica
 * destacado e não reenvia; cada marcação traz "desfazer" no aviso (heurística 3).
 * No celular os botões ocupam a linha de baixo, largos, para o nome não ser cortado.
 */
export function MarcarPresenca({ pessoa }: { pessoa: PessoaPresenca }) {
  return (
    <div className="flex w-full gap-1.5 pl-12 sm:w-auto sm:shrink-0 sm:pl-0" role="group" aria-label={`Presença de ${pessoa.nome}`}>
      {(["presente", "ausente"] as const).map((valor) => (
        <Formulario key={valor} action={registrarPresenca} acaoDesfazer={registrarPresenca} className="flex-1 sm:flex-none">
          <Ocultos valores={{ email: pessoa.email, presenca: valor, anterior: pessoa.presenca ?? "", nome: pessoa.nome }} />
          <BotaoMarcar valor={valor} marcado={pessoa.presenca === valor} />
        </Formulario>
      ))}
    </div>
  );
}

function BotaoMarcar({ valor, marcado }: { valor: Presenca; marcado: boolean }) {
  const { pending } = useFormStatus();
  const presente = valor === "presente";
  const estilo = marcado
    ? presente
      ? "border-transparent bg-emerald-600 text-white"
      : "border-transparent bg-amber-500 text-amber-950"
    : "border-borda-forte bg-superficie-solida text-suave hover:text-foreground";
  return (
    <button
      type="submit"
      aria-pressed={marcado}
      disabled={marcado || pending}
      className={`inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-default sm:min-h-9 sm:w-auto ${estilo}`}
    >
      {pending ? <Girando className="size-3.5" /> : <Icone nome={presente ? "ok" : "fechar"} className="size-3.5" />}
      {presente ? "Presente" : "Ausente"}
    </button>
  );
}

/** Atalho da equipe: marca todos os integrantes como presentes de uma vez (com desfazer). */
export function TodosPresentes({ equipe, pessoas }: { equipe: string; pessoas: PessoaPresenca[] }) {
  const faltam = pessoas.filter((p) => p.presenca !== "presente");
  return (
    <Formulario action={registrarPresencas} acaoDesfazer={registrarPresencas}>
      <Ocultos
        valores={{
          itens: JSON.stringify(faltam.map((p) => ({ email: p.email, presenca: "presente" }))),
          anteriores: JSON.stringify(faltam.map((p) => ({ email: p.email, presenca: p.presenca }))),
          rotulo: equipe,
        }}
      />
      <BotaoTodos desabilitado={!faltam.length} />
    </Formulario>
  );
}

function BotaoTodos({ desabilitado }: { desabilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={desabilitado || pending}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-600/40 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/10 disabled:cursor-default disabled:opacity-50 dark:text-emerald-300"
    >
      {pending ? <Girando className="size-3.5" /> : <Icone nome="ok" className="size-3.5" />}
      {desabilitado ? "Todos presentes" : "Marcar todos presentes"}
    </button>
  );
}

/**
 * Bloco de presença de uma equipe: contagem, atalho "todos presentes" e cada integrante.
 * `semContagem` quando quem envolve o bloco já mostra a contagem (card recolhido).
 */
export function PresencaEquipe({ equipe, pessoas, semContagem = false }: { equipe: string; pessoas: PessoaPresenca[]; semContagem?: boolean }) {
  const presentes = pessoas.filter((p) => p.presenca === "presente").length;
  if (!pessoas.length) return <p className="text-sm text-suave">Sem integrantes.</p>;
  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap items-center gap-2 ${semContagem ? "justify-end" : "justify-between"}`}>
        {!semContagem && (
          <p className="text-xs text-suave">
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {presentes}/{pessoas.length}
            </span>{" "}
            presente(s)
          </p>
        )}
        <TodosPresentes equipe={equipe} pessoas={pessoas} />
      </div>
      <ul className="divide-y divide-borda">
        {pessoas.map((p) => (
          <li key={p.email} className="flex flex-wrap items-center gap-3 py-2">
            <Avatar nome={p.nome} tamanho="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.nome}</p>
              {p.detalhe && <p className="truncate text-xs text-suave">{p.detalhe}</p>}
            </div>
            <MarcarPresenca pessoa={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}
