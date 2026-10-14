"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { registrarPresenca } from "@/modules/pessoas/application/actions";
import { cursoSemestre, type Participante, type Presenca } from "@/modules/pessoas/domain/tipos";
import { casaBusca } from "@/shared/lib/texto";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Avatar } from "@/shared/ui/Avatar";
import { Girando } from "@/shared/ui/Botao";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { FiltrosChips } from "@/shared/ui/FiltrosChips";
import { Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

export type AlunoChamada = Pick<Participante, "email" | "nome" | "curso" | "semestre" | "equipe_nome" | "presenca">;

const FILTROS: { id: string; rotulo: string; teste: (a: AlunoChamada) => boolean }[] = [
  { id: "todos", rotulo: "Todos", teste: () => true },
  { id: "sem_registro", rotulo: "Sem registro", teste: (a) => !a.presenca },
  { id: "presente", rotulo: "Presentes", teste: (a) => a.presenca === "presente" },
  { id: "ausente", rotulo: "Ausentes", teste: (a) => a.presenca === "ausente" },
];

/**
 * Chamada do evento: organização e mentoria marcam cada aluno como presente ou ausente.
 *  - resumo e filtros com contagem mostram quanto falta (heurística 1);
 *  - busca por nome, curso ou equipe, sem acento (heurísticas 6 e 7);
 *  - cada marcação traz "desfazer" no aviso (heurística 3); ausência não tira ninguém da edição.
 */
export function ChamadaPresenca({ alunos }: { alunos: AlunoChamada[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const teste = (FILTROS.find((f) => f.id === filtro) ?? FILTROS[0]).teste;
  const lista = alunos.filter((a) => teste(a) && (!busca.trim() || casaBusca(`${a.nome} ${a.curso ?? ""} ${a.equipe_nome ?? ""}`, busca)));
  const presentes = alunos.filter((a) => a.presenca === "presente").length;
  const ausentes = alunos.filter((a) => a.presenca === "ausente").length;
  const semRegistro = alunos.length - presentes - ausentes;

  return (
    <section className="card space-y-4">
      <div className="space-y-2">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {presentes}
            <span className="text-base text-suave">/{alunos.length}</span>
          </span>
          <span className="text-suave">
            presentes · {ausentes} ausente(s) · {semRegistro} sem registro
          </span>
        </p>
        <div className="flex h-2 overflow-hidden rounded-full bg-marca-fundo" aria-hidden>
          <span className="bg-emerald-500" style={{ width: `${alunos.length ? (presentes / alunos.length) * 100 : 0}%` }} />
          <span className="bg-amber-500" style={{ width: `${alunos.length ? (ausentes / alunos.length) * 100 : 0}%` }} />
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">Buscar aluno</span>
        <Icone nome="busca" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave" />
        <input
          id="busca-chamada"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, curso ou equipe…"
          className="campo pl-9"
        />
      </label>

      <FiltrosChips opcoes={FILTROS.map((f) => ({ id: f.id, rotulo: f.rotulo, n: alunos.filter(f.teste).length }))} ativo={filtro} aoEscolher={setFiltro} />

      {lista.length === 0 ? (
        <EstadoVazio icone="busca" titulo={alunos.length ? "Ninguém encontrado" : "Nenhum aluno nesta edição"}>
          {alunos.length ? "Tente outro nome ou limpe o filtro." : "Os alunos aparecem aqui assim que a organização cadastrar em Pessoas."}
        </EstadoVazio>
      ) : (
        <ul className="divide-y divide-borda">
          {lista.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center gap-3 py-2.5">
              <Avatar nome={a.nome} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.nome}</p>
                <p className="truncate text-xs text-suave">
                  {[cursoSemestre(a), a.equipe_nome ?? "sem equipe"].filter(Boolean).join(" · ")}
                </p>
              </div>
              {/* No celular os botões descem para a linha de baixo, largos, e o nome não é cortado. */}
              <div className="flex w-full gap-1.5 pl-12 sm:w-auto sm:shrink-0 sm:pl-0" role="group" aria-label={`Presença de ${a.nome}`}>
                <Marcar aluno={a} valor="presente" />
                <Marcar aluno={a} valor="ausente" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Um dos dois botões da chamada. O que já está marcado fica destacado e não reenvia. */
function Marcar({ aluno, valor }: { aluno: AlunoChamada; valor: Presenca }) {
  const marcado = aluno.presenca === valor;
  return (
    <Formulario action={registrarPresenca} acaoDesfazer={registrarPresenca} className="flex-1 sm:flex-none">
      <Ocultos valores={{ email: aluno.email, presenca: valor, anterior: aluno.presenca ?? "", nome: aluno.nome }} />
      <BotaoMarcar valor={valor} marcado={marcado} />
    </Formulario>
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

/** Ajuda da chamada (mesmo texto na organização e na mentoria). */
export function AjudaPresenca() {
  return (
    <BotaoAjuda titulo="Presença">
      <ul>
        <li>Marque cada aluno como presente ou ausente. Errou? Use “Desfazer” no aviso ou marque de novo.</li>
        <li>Ausente não sai da edição nem da equipe: continua inscrito e no histórico.</li>
        <li>Quem marcou e quando fica registrado. A lista se atualiza sozinha a cada 30 segundos.</li>
      </ul>
    </BotaoAjuda>
  );
}
