"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { escolherEdicao } from "@/modules/edicoes/application/actions";
import {
  periodo,
  rotuloSituacaoEdicao,
  type Edicao,
} from "@/modules/edicoes/domain/tipos";
import { Girando } from "@/shared/ui/Botao";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";
import { useFecharDetalhes } from "@/shared/ui/useFecharDetalhes";

type EdicaoResumo = Pick<
  Edicao,
  "id" | "numero" | "nome" | "atual" | "situacao" | "data_inicio" | "data_fim"
>;

/**
 * Edição que a organização está administrando, no cabeçalho (heurística 1: sempre visível).
 * Mesmo padrão do menu "Mais" (heurística 4): botão com seta e painel com as opções.
 * Cada edição mostra período, situação e se é a atual (heurística 6); trocar aqui não muda
 * a edição dos alunos e das bancas, e o painel diz isso (heurísticas 2 e 10).
 */
export function SeletorEdicao({
  edicoes,
  escolhida,
  participante = false,
}: {
  edicoes: EdicaoResumo[];
  escolhida: string;
  participante?: boolean;
}) {
  const { ref: menu, fechar } = useFecharDetalhes();
  const caminho = usePathname();
  const vendo = edicoes.find((e) => e.id === escolhida) ?? edicoes[0];
  // Página de uma equipe não existe na outra edição: volta para a lista.
  // Participante: volta ao início (o papel pode ser outro na outra edição).
  const voltar = participante
    ? "/"
    : caminho.startsWith("/admin/equipes/")
      ? "/admin/equipes"
      : caminho;

  if (!vendo) return null;
  const ordenadas = [...edicoes].sort((a, b) => b.numero - a.numero);

  return (
    <details ref={menu} className="group relative">
      <summary
        className="btn-secundario min-h-9 cursor-pointer list-none gap-2 px-3 py-1 whitespace-nowrap [&::-webkit-details-marker]:hidden"
        title={`Você está administrando a Edição ${vendo.numero} · ${vendo.nome}${vendo.atual ? " (atual)" : " (não é a atual)"}`}
      >
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${vendo.atual ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        <span className="sr-only">
          {participante
            ? "Edição que você está vendo:"
            : "Edição que você está administrando:"}
        </span>
        <span className="text-sm font-semibold">
          <span className="sm:hidden">Ed. {vendo.numero}</span>
          <span className="hidden sm:inline">Edição {vendo.numero}</span>
        </span>
        <span
          aria-hidden
          className="text-xs text-suave transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>

      <div className="destaque-grad z-40 mt-2 space-y-1 rounded-2xl p-2 shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:top-14 sm:absolute sm:right-0 sm:w-96">
        <p className="px-2 pt-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
          {participante ? "Suas edições" : "Edição que você administra"}
        </p>
        <ul className="space-y-1">
          {ordenadas.map((e) => (
            <li key={e.id}>
              {e.id === vendo.id ? (
                <div
                  aria-current="true"
                  className="flex items-start gap-3 rounded-xl bg-marca-fundo p-2"
                >
                  <ConteudoEdicao edicao={e} marcada />
                </div>
              ) : (
                <form action={escolherEdicao}>
                  <input type="hidden" name="edicao" value={e.id} />
                  <input type="hidden" name="voltar" value={voltar} />
                  <BotaoEdicao edicao={e} />
                </form>
              )}
            </li>
          ))}
        </ul>
        <p className="px-2 text-xs text-suave">
          {participante
            ? "As edições anteriores ficam só para consulta. Ao entrar, você sempre começa na atual."
            : "Trocar aqui muda só o que você vê. Alunos e bancas continuam na edição atual."}
        </p>
        {!participante && (
          <Link
            href="/admin/edicoes"
            onClick={fechar}
            className="mt-1 flex items-center gap-2 rounded-xl border-t border-borda p-2 pt-3 text-sm font-semibold hover:bg-superficie"
          >
            <Icone nome="relogio" className="size-4 text-suave" />
            Gerenciar edições
            <Icone nome="avancar" className="ml-auto size-4 text-suave" />
          </Link>
        )}
      </div>
    </details>
  );
}

function ConteudoEdicao({
  edicao,
  marcada = false,
  enviando = false,
}: {
  edicao: EdicaoResumo;
  marcada?: boolean;
  enviando?: boolean;
}) {
  return (
    <>
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-marca">
        {enviando ? (
          <Girando className="size-4" />
        ) : marcada ? (
          <Icone nome="ok" className="size-4" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
            Edição {edicao.numero}
          </span>
          {edicao.atual && (
            <Selo
              tom="sucesso"
              title="A edição que alunos e bancas veem ao entrar"
            >
              Atual
            </Selo>
          )}
        </span>
        <span className="block text-sm font-semibold break-words">
          {edicao.nome}
        </span>
        <span className="block text-xs text-suave">
          {periodo(edicao)} · {rotuloSituacaoEdicao(edicao.situacao)}
        </span>
      </span>
    </>
  );
}

/** Opção do painel: mostra "abrindo" enquanto troca de edição (heurística 1). */
function BotaoEdicao({ edicao }: { edicao: EdicaoResumo }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-start gap-3 rounded-xl p-2 hover:bg-superficie disabled:opacity-70"
    >
      <ConteudoEdicao edicao={edicao} enviando={pending} />
    </button>
  );
}
