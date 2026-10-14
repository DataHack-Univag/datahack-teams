"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { alterarFuncao, removerParticipante, restaurarParticipante } from "@/modules/pessoas/application/actions";
import { funcaoDe, opcoesFuncao, rotuloFuncao, type BancaResumo } from "@/modules/pessoas/domain/papeis";
import { cursoSemestre, type Participante } from "@/modules/pessoas/domain/tipos";
import { FormPessoa } from "@/modules/pessoas/ui/FormPessoa";
import { casaBusca } from "@/shared/lib/texto";
import { Avatar } from "@/shared/ui/Avatar";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { FiltrosChips } from "@/shared/ui/FiltrosChips";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

type Filtro = { id: string; rotulo: string; teste: (p: Participante) => boolean };

/** Filtros: todos, cada função da edição (aluno, organização, cada banca) e pendências dos alunos. */
function filtrosDa(bancas: BancaResumo[]): Filtro[] {
  return [
    { id: "todos", rotulo: "Todos", teste: () => true },
    ...opcoesFuncao(bancas).map((x) => ({ id: x.valor, rotulo: x.rotulo, teste: (p: Participante) => funcaoDe(p.papel, p.banca) === x.valor })),
    { id: "sem_equipe", rotulo: "Alunos sem equipe", teste: (p) => p.papel === "aluno" && !p.equipe_id },
    { id: "sem_nota", rotulo: "Alunos sem nota", teste: (p) => p.papel === "aluno" && p.nota == null },
    { id: "ausentes", rotulo: "Ausentes no evento", teste: (p) => p.presenca === "ausente" },
  ];
}

const CHAVE = "dh-pessoas-filtro";

/**
 * Lista única de pessoas (alunos, organização e bancas), com busca e filtros.
 * O filtro escolhido fica salvo neste navegador (heurística 7).
 */
export function ListaPessoas({
  pessoas,
  bancas,
  meuEmail,
  filtroInicial,
  buscaInicial,
}: {
  pessoas: Participante[];
  bancas: BancaResumo[];
  meuEmail: string;
  filtroInicial?: string;
  buscaInicial?: string;
}) {
  const FILTROS = filtrosDa(bancas);
  const [busca, setBusca] = useState(buscaInicial ?? "");
  // Links antigos (?filtro=avaliador) caem no primeiro filtro equivalente.
  const [filtro, setFiltro] = useState<string>(FILTROS.find((f) => f.id === filtroInicial || f.id.startsWith(`${filtroInicial}:`))?.id ?? "todos");
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    if (filtroInicial || buscaInicial) return;
    try {
      const salvo = localStorage.getItem(CHAVE);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (salvo && filtrosDa(bancas).some((f) => f.id === salvo)) setFiltro(salvo);
    } catch {}
  }, [filtroInicial, buscaInicial, bancas]);

  function escolher(f: string) {
    setFiltro(f);
    try {
      localStorage.setItem(CHAVE, f);
    } catch {}
  }

  const teste = (FILTROS.find((f) => f.id === filtro) ?? FILTROS[0]).teste;
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

      <FiltrosChips
        // "Ausentes" só aparece quando a presença da edição foi registrada (heurística 8).
        opcoes={FILTROS.map((f) => ({ id: f.id, rotulo: f.rotulo, n: pessoas.filter(f.teste).length })).filter((f) => f.id !== "ausentes" || f.n > 0 || f.id === filtro)}
        ativo={filtro}
        aoEscolher={escolher}
      />
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
            // Avaliador pode trocar de banca com um clique.
            const outrasBancas = p.papel === "avaliador" ? bancas.filter((b) => !b.daOrganizacao && b.codigo !== p.banca) : [];
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
                      {p.papel !== "aluno" && <Selo tom="marca">{rotuloFuncao(p.papel, p.banca, bancas)}</Selo>}
                      {p.presenca === "ausente" && (
                        <Selo tom="alerta" title="Registrada como ausente no evento (continua inscrita na edição)">
                          Ausente
                        </Selo>
                      )}
                    </p>
                    <p className="truncate text-xs text-suave">
                      {[cursoSemestre(p), p.email].filter(Boolean).join(" · ")}
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
                      {outrasBancas.map((b) => (
                        <Formulario
                          key={b.codigo}
                          action={alterarFuncao}
                          perigo={false}
                          rotuloConfirmar="Trocar de banca"
                          confirmar={`${p.nome} passa para ${b.nome}. As fichas já lançadas continuam valendo.`}
                        >
                          <Ocultos valores={{ email: p.email, funcao: `avaliador:${b.codigo}` }} />
                          <BotaoEnviar variante="secundario" tamanho="pequeno" icone="trocas">
                            Mudar para {b.nome}
                          </BotaoEnviar>
                        </Formulario>
                      ))}
                    </div>
                    <FormPessoa p={p} bancas={bancas} />
                    {p.email !== meuEmail && (
                      <Formulario
                        action={removerParticipante}
                        acaoDesfazer={restaurarParticipante}
                        tituloConfirmar={`Tirar ${p.nome} desta edição?`}
                        rotuloConfirmar="Tirar da edição"
                        perigo
                        confirmar="A pessoa perde o acesso a esta edição. Nada é apagado: equipe, trocas e fichas dela continuam no histórico, e dá para desfazer logo em seguida."
                      >
                        <Ocultos valores={{ email: p.email }} />
                        <BotaoEnviar variante="perigo" tamanho="pequeno" icone="lixo">
                          Tirar da edição
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
