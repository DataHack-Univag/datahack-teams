"use client";

import Link from "next/link";
import { useState } from "react";
import { removerParticipante } from "@/app/actions";
import { FormParticipante } from "@/components/FormParticipante";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import type { Participante } from "@/lib/tipos";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Tabela de participantes com busca e edição inline. */
export function ListaParticipantes({ participantes, meuEmail }: { participantes: Participante[]; meuEmail: string }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "sem_equipe" | "sem_nota">("todos");
  const [aberto, setAberto] = useState<string | null>(null);

  const termo = semAcento(busca.trim());
  const lista = participantes.filter((p) => {
    if (filtro === "sem_equipe" && (p.equipe_id || p.papel !== "aluno")) return false;
    if (filtro === "sem_nota" && (p.nota || p.papel !== "aluno")) return false;
    if (!termo) return true;
    return semAcento(`${p.nome} ${p.email} ${p.curso ?? ""} ${p.equipe_nome ?? ""}`).includes(termo);
  });

  return (
    <section className="card space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail, curso ou equipe..."
          className="campo sm:flex-1"
        />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="campo sm:w-48">
          <option value="todos">Todos</option>
          <option value="sem_equipe">Sem equipe</option>
          <option value="sem_nota">Sem nota</option>
        </select>
      </div>
      <p className="text-xs text-suave">
        {lista.length} de {participantes.length}
      </p>

      <ul className="divide-y divide-borda">
        {lista.map((p) => (
          <li key={p.email} className="py-3">
            <button
              type="button"
              onClick={() => setAberto(aberto === p.email ? null : p.email)}
              className="flex w-full items-center gap-3 text-left"
              aria-expanded={aberto === p.email}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.nome}
                  {p.papel === "organizador" && (
                    <span className="selo ml-2 bg-marca-fundo align-middle text-marca">organizador</span>
                  )}
                </p>
                <p className="truncate text-xs text-suave">
                  {[p.curso, p.semestre && `${p.semestre}º sem.`, p.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="hidden shrink-0 text-right text-xs sm:block">
                <p className="font-mono">{p.nota != null ? `nota ${String(p.nota).replace(".", ",")}` : "sem nota"}</p>
                <p className="text-suave">{p.equipe_nome ?? (p.papel === "aluno" ? "sem equipe" : "")}</p>
              </div>
              <span className="text-suave">{aberto === p.email ? "▴" : "▾"}</span>
            </button>

            {aberto === p.email && (
              <div className="mt-3 space-y-3 rounded-xl border border-borda p-3">
                <p className="text-xs text-suave sm:hidden">
                  {p.nota != null ? `Nota ${String(p.nota).replace(".", ",")}` : "Sem nota"} ·{" "}
                  {p.equipe_nome ?? "sem equipe"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.papel === "aluno" && (
                    <Link
                      href={`/ver-como?email=${encodeURIComponent(p.email)}`}
                      className="btn-secundario min-h-9 px-3 text-xs"
                    >
                      👁 Ver como este aluno
                    </Link>
                  )}
                  {p.equipe_id && (
                    <Link href={`/admin/equipes/${p.equipe_id}`} className="btn-secundario min-h-9 px-3 text-xs">
                      Ver equipe {p.equipe_nome}
                    </Link>
                  )}
                </div>
                <FormParticipante p={p} />
                {p.email !== meuEmail && (
                  <Formulario
                    action={removerParticipante}
                    confirmar={`Remover ${p.nome} da lista? Ele(a) perde o acesso e sai da equipe.`}
                  >
                    <input type="hidden" name="email" value={p.email} />
                    <BotaoEnviar className="btn-perigo min-h-9 px-3 text-xs">Remover participante</BotaoEnviar>
                  </Formulario>
                )}
              </div>
            )}
          </li>
        ))}
        {lista.length === 0 && <li className="py-3 text-sm text-suave">Ninguém encontrado.</li>}
      </ul>
    </section>
  );
}
