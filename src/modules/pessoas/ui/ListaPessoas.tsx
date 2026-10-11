"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { alterarPapel, removerParticipante } from "@/modules/pessoas/application/actions";
import { PAPEIS, rotuloPapel, type Papel } from "@/modules/pessoas/domain/papeis";
import type { Participante } from "@/modules/pessoas/domain/tipos";
import { FormPessoa } from "@/modules/pessoas/ui/FormPessoa";
import { casaBusca } from "@/shared/lib/texto";
import { Avatar } from "@/shared/ui/Avatar";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

type Filtro = "todos" | Papel | "sem_equipe" | "sem_nota";

const FILTROS: { id: Filtro; rotulo: string; teste: (p: Participante) => boolean }[] = [
  { id: "todos", rotulo: "Todos", teste: () => true },
  ...PAPEIS.map((x) => ({ id: x.valor as Filtro, rotulo: x.rotulo, teste: (p: Participante) => p.papel === x.valor })),
  { id: "sem_equipe", rotulo: "Alunos sem equipe", teste: (p) => p.papel === "aluno" && !p.equipe_id },
  { id: "sem_nota", rotulo: "Alunos sem nota", teste: (p) => p.papel === "aluno" && p.nota == null },
];

const CHAVE = "dh-pessoas-filtro";

/**
 * Lista única de pessoas (alunos, organização e bancas), com busca e filtros.
 * O filtro escolhido fica salvo neste navegador (heurística 7).
 */
export function ListaPessoas({
  pessoas,
  meuEmail,
  filtroInicial,
  buscaInicial,
}: {
  pessoas: Participante[];
  meuEmail: string;
  filtroInicial?: string;
  buscaInicial?: string;
}) {
  const [busca, setBusca] = useState(buscaInicial ?? "");
  const [filtro, setFiltro] = useState<Filtro>((FILTROS.find((f) => f.id === filtroInicial)?.id ?? "todos") as Filtro);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    if (filtroInicial || buscaInicial) return;
    try {
      const salvo = localStorage.getItem(CHAVE) as Filtro | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (salvo && FILTROS.some((f) => f.id === salvo)) setFiltro(salvo);
    } catch {}
  }, [filtroInicial, buscaInicial]);

  function escolher(f: Filtro) {
    setFiltro(f);
    try {
      localStorage.setItem(CHAVE, f);
    } catch {}
  }

  const teste = FILTROS.find((f) => f.id === filtro)!.teste;
  const lista = pessoas.filter((p) => teste(p) && (!busca.trim() || casaBusca(`${p.nome} ${p.email} ${p.curso ?? ""} ${p.equipe_nome ?? ""}`, busca)));

  return (
    <section className="card space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar pessoa</span>
        <Icone nome="busca" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail, curso ou equipe…"
          className="campo pl-9"
        />
      </label>

      <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => {
          const n = pessoas.filter(f.teste).length;
          const atual = f.id === filtro;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={atual}
              onClick={() => escolher(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                atual ? "border-transparent text-white [background:var(--grad)]" : "border-borda-forte bg-superficie-solida text-suave hover:text-foreground"
              }`}
            >
              {f.rotulo}
              <span className={`rounded-full px-1.5 tabular-nums ${atual ? "bg-white/20" : "bg-marca-fundo"}`}>{n}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-suave" aria-live="polite">
        Mostrando {lista.length} de {pessoas.length}
      </p>

      {lista.length === 0 ? (
        <EstadoVazio icone="busca" titulo="Ninguém encontrado">
          Tente outro nome ou limpe o filtro.
        </EstadoVazio>
      ) : (
        <ul className="divide-y divide-borda">
          {lista.map((p) => {
            const abertoAqui = aberto === p.email;
            const avaliador = p.papel === "avaliador_tecnico" || p.papel === "avaliador_negocio";
            return (
              <li key={p.email} className="py-2">
                <button
                  type="button"
                  onClick={() => setAberto(abertoAqui ? null : p.email)}
                  className="flex w-full items-center gap-3 rounded-xl p-1 text-left hover:bg-marca-fundo/50"
                  aria-expanded={abertoAqui}
                >
                  <Avatar nome={p.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 font-medium">
                      <span className="truncate">{p.nome}</span>
                      {p.email === meuEmail && <span className="text-xs text-suave">(você)</span>}
                      {p.papel !== "aluno" && <Selo tom="marca">{rotuloPapel(p.papel)}</Selo>}
                    </p>
                    <p className="truncate text-xs text-suave">
                      {[p.curso, p.semestre && `${p.semestre}º sem.`, p.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {p.papel === "aluno" && (
                    <div className="hidden shrink-0 text-right text-xs sm:block">
                      <p className={p.equipe_nome ? "" : "text-amber-700 dark:text-amber-300"}>{p.equipe_nome ?? "sem equipe"}</p>
                      <p className="font-mono text-suave">{p.nota != null ? `nota ${String(p.nota).replace(".", ",")}` : "sem nota"}</p>
                    </div>
                  )}
                  <Icone nome="avancar" className={`size-4 text-suave transition ${abertoAqui ? "rotate-90" : ""}`} />
                </button>

                {abertoAqui && (
                  <div className="mt-2 space-y-3 rounded-xl border border-borda p-3" style={{ animation: "dh-sobe .2s both" }}>
                    <div className="flex flex-wrap gap-2">
                      {p.papel !== "organizador" && (
                        <Link href={`/ver-como?email=${encodeURIComponent(p.email)}`} className="btn-secundario min-h-9 px-3 text-xs">
                          <Icone nome="olho" className="size-4" /> Ver como esta pessoa
                        </Link>
                      )}
                      {p.equipe_id && (
                        <Link href={`/admin/equipes/${p.equipe_id}`} className="btn-secundario min-h-9 px-3 text-xs">
                          <Icone nome="equipe" className="size-4" /> Abrir a {p.equipe_nome}
                        </Link>
                      )}
                      {avaliador && (
                        <Formulario
                          action={alterarPapel}
                          perigo={false}
                          rotuloConfirmar="Trocar de banca"
                          confirmar={`${p.nome} passa para ${p.papel === "avaliador_tecnico" ? "os jurados de negócio" : "a banca de professores"}. As fichas já lançadas continuam valendo.`}
                        >
                          <Ocultos valores={{ email: p.email, papel: p.papel === "avaliador_tecnico" ? "avaliador_negocio" : "avaliador_tecnico" }} />
                          <BotaoEnviar variante="secundario" tamanho="pequeno" icone="trocas">
                            Mudar para {p.papel === "avaliador_tecnico" ? "jurados de negócio" : "banca de professores"}
                          </BotaoEnviar>
                        </Formulario>
                      )}
                    </div>
                    <FormPessoa p={p} />
                    {p.email !== meuEmail && (
                      <Formulario
                        action={removerParticipante}
                        tituloConfirmar={`Remover ${p.nome}?`}
                        rotuloConfirmar="Remover da lista"
                        confirmar="A pessoa perde o acesso ao sistema e sai da equipe. Se já lançou notas, apague as fichas dela antes (Avaliação → Fichas)."
                      >
                        <Ocultos valores={{ email: p.email }} />
                        <BotaoEnviar variante="perigo" tamanho="pequeno" icone="lixo">
                          Remover da lista
                        </BotaoEnviar>
                      </Formulario>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
