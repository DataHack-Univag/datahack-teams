"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { escolherEdicao } from "@/modules/edicoes/application/actions";
import { periodo, rotuloSituacaoEdicao, type Edicao } from "@/modules/edicoes/domain/tipos";
import { COR_PADRAO, resolverMarca, rotuloAcesso } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { Girando } from "@/shared/ui/Botao";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";
import { useFecharDetalhes } from "@/shared/ui/useFecharDetalhes";

type EdicaoResumo = Pick<Edicao, "id" | "numero" | "nome" | "atual" | "situacao" | "data_inicio" | "data_fim" | "acesso" | "marca">;

/**
 * Menu das edições no cabeçalho (heurística 1: a edição está sempre à vista). Cada edição
 * aparece com a logo e a cor dela, período, situação e tipo de acesso (heurística 6: reconhecer
 * em vez de lembrar). Trocar aqui não muda a edição dos alunos e das bancas, e o menu diz
 * isso (heurísticas 2 e 10).
 */
export function SeletorEdicao({ edicoes, escolhida, participante = false }: { edicoes: EdicaoResumo[]; escolhida: string; participante?: boolean }) {
  const { ref: menu, fechar } = useFecharDetalhes();
  const caminho = usePathname();
  const vendo = edicoes.find((e) => e.id === escolhida) ?? edicoes[0];
  // Página de uma equipe não existe na outra edição: volta para a lista.
  // Participante: volta ao início (o papel pode ser outro na outra edição).
  const voltar = participante ? "/" : caminho.startsWith("/admin/equipes/") ? "/admin/equipes" : caminho;

  if (!vendo) return null;
  const ordenadas = [...edicoes].sort((a, b) => b.numero - a.numero);
  const corVendo = resolverMarca(vendo).cor ?? COR_PADRAO;

  return (
    <details ref={menu} className="group relative">
      <summary
        className="btn-secundario min-h-9 cursor-pointer list-none gap-2 px-3 py-1 whitespace-nowrap [&::-webkit-details-marker]:hidden"
        title={`${participante ? "Você está vendo" : "Você está administrando"} a Edição ${vendo.numero} · ${vendo.nome}${vendo.atual ? " (atual)" : " (não é a atual)"}`}
      >
        <span aria-hidden className="relative size-3.5 shrink-0 rounded" style={{ backgroundColor: corVendo }}>
          <span className={`absolute -right-1 -bottom-1 size-2 rounded-full ring-2 ring-[var(--background)] ${vendo.atual ? "bg-emerald-500" : "bg-amber-500"}`} />
        </span>
        <span className="sr-only">{participante ? "Edição que você está vendo:" : "Edição que você está administrando:"}</span>
        <span className="text-sm font-semibold">
          <span className="sm:hidden">Ed. {vendo.numero}</span>
          <span className="hidden sm:inline">Edição {vendo.numero}</span>
        </span>
        <span aria-hidden className="text-xs text-suave transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="destaque-grad z-40 mt-2 rounded-2xl p-2 shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:top-14 sm:absolute sm:right-0 sm:w-[30rem]">
        <div className="flex items-baseline justify-between px-2 pt-1 pb-2">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{participante ? "Suas edições" : "Edições"}</p>
          <p className="text-[11px] text-suave">
            <span className="mr-1 inline-block size-2 rounded-full bg-emerald-500" /> atual
            <span className="mr-1 ml-3 inline-block size-2 rounded-full bg-amber-500" /> outras
          </p>
        </div>
        <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {ordenadas.map((e) => (
            <li key={e.id}>
              {e.id === vendo.id ? (
                <div aria-current="true" className="rounded-xl ring-2 ring-marca">
                  <CartaoMenu edicao={e} marcada participante={participante} />
                </div>
              ) : (
                <form action={escolherEdicao}>
                  <input type="hidden" name="edicao" value={e.id} />
                  <input type="hidden" name="voltar" value={voltar} />
                  <BotaoEdicao edicao={e} participante={participante} />
                </form>
              )}
            </li>
          ))}
        </ul>
        <p className="px-2 pt-2 text-xs text-suave">
          {participante
            ? "As edições anteriores ficam só para consulta. Ao entrar, você sempre começa na atual."
            : "Trocar aqui muda só o que você vê. Alunos e bancas continuam na edição atual."}
        </p>
        {!participante && (
          <div className="mt-2 grid grid-cols-2 gap-1 border-t border-borda pt-2">
            <Link href="/admin/edicoes" onClick={fechar} className="flex items-center gap-2 rounded-xl p-2 text-sm font-semibold hover:bg-superficie">
              <Icone nome="relogio" className="size-4 text-suave" />
              Gerenciar edições
            </Link>
            <Link href="/admin/edicoes#acesso" onClick={fechar} className="flex items-center gap-2 rounded-xl p-2 text-sm font-semibold hover:bg-superficie">
              <Icone nome="imagem" className="size-4 text-suave" />
              Logo e cor desta edição
            </Link>
          </div>
        )}
      </div>
    </details>
  );
}

/** Uma edição no menu: faixa e logo na cor dela, número, nome, período e situação. */
function CartaoMenu({ edicao, marcada = false, enviando = false, participante }: { edicao: EdicaoResumo; marcada?: boolean; enviando?: boolean; participante: boolean }) {
  const marca = resolverMarca(edicao);
  return (
    <span
      className={`flex items-center gap-3 overflow-hidden rounded-xl border-l-4 p-2 text-left ${marcada ? "bg-marca-fundo" : ""}`}
      style={{ borderLeftColor: marca.cor ?? COR_PADRAO }}
    >
      <LogoEdicao marca={marca} className="h-9 w-24" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Edição {edicao.numero}</span>
          {edicao.atual && (
            <Selo tom="sucesso" title="A edição que alunos e bancas veem ao entrar">
              Atual
            </Selo>
          )}
          {marcada && <Selo tom="marca">{participante ? "Vendo" : "Você está aqui"}</Selo>}
        </span>
        <span className="block truncate text-sm font-semibold" title={marca.nome}>
          {marca.nome}
        </span>
        <span className="block truncate text-xs text-suave">
          {periodo(edicao)} · {rotuloSituacaoEdicao(edicao.situacao)}
          {!participante && edicao.acesso ? ` · ${rotuloAcesso(edicao.acesso)}` : ""}
        </span>
      </span>
      <span className="flex size-5 shrink-0 items-center justify-center text-marca">
        {enviando ? <Girando className="size-4" /> : marcada ? <Icone nome="ok" className="size-4" /> : <Icone nome="avancar" className="size-4 text-suave" />}
      </span>
    </span>
  );
}

/** Opção do menu: mostra "abrindo" enquanto troca de edição (heurística 1). */
function BotaoEdicao({ edicao, participante }: { edicao: EdicaoResumo; participante: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="block w-full rounded-xl hover:bg-superficie disabled:opacity-70">
      <CartaoMenu edicao={edicao} enviando={pending} participante={participante} />
    </button>
  );
}
