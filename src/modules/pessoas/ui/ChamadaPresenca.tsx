"use client";

import { useState } from "react";
import { cursoSemestre, type Participante } from "@/modules/pessoas/domain/tipos";
import { MarcarPresenca } from "@/modules/pessoas/ui/MarcarPresenca";
import { casaBusca } from "@/shared/lib/texto";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Avatar } from "@/shared/ui/Avatar";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { FiltrosChips } from "@/shared/ui/FiltrosChips";
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
        <span className="sr-only">Buscar participante</span>
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
        <EstadoVazio icone="busca" titulo={alunos.length ? "Ninguém encontrado" : "Nenhum participante nesta edição"}>
          {alunos.length ? "Tente outro nome ou limpe o filtro." : "Os participantes aparecem aqui assim que a organização cadastrar em Pessoas."}
        </EstadoVazio>
      ) : (
        <ul className="divide-y divide-borda">
          {lista.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center gap-3 py-2.5">
              <Avatar nome={a.nome} tamanho="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.nome}</p>
                <p className="truncate text-xs text-suave">
                  {[cursoSemestre(a), a.equipe_nome ?? "sem equipe"].filter(Boolean).join(" · ")}
                </p>
              </div>
              <MarcarPresenca pessoa={a} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Ajuda da chamada (mesmo texto na organização e na mentoria). */
export function AjudaPresenca() {
  return (
    <BotaoAjuda titulo="Presença">
      <ul>
        <li>Marque cada participante como presente ou ausente. Errou? Use “Desfazer” no aviso ou marque de novo.</li>
        <li>Ausente não sai da edição nem da equipe: continua inscrito e no histórico.</li>
        <li>Quem marcou e quando fica registrado. A lista se atualiza sozinha a cada 30 segundos.</li>
      </ul>
    </BotaoAjuda>
  );
}
