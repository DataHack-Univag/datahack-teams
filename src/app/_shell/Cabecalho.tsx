import Link from "next/link";
import type { ReactNode } from "react";
import type { MarcaResolvida } from "@/modules/instituicoes/domain/tipos";
import { LogoSvg } from "@/modules/instituicoes/ui/LogoSvg";
import { sair } from "@/modules/pessoas/application/actions";
import { rotuloPapel, type Papel } from "@/modules/pessoas/domain/papeis";
import { primeiroNome } from "@/shared/lib/texto";
import { Avatar } from "@/shared/ui/Avatar";
import { BotaoTema } from "@/shared/ui/BotaoTema";
import { Icone } from "@/shared/ui/Icone";
import { Logo } from "@/shared/ui/Logo";
import { BotaoBusca } from "@/shared/ui/PaletaComandos";

/** Cabeçalho de todas as áreas logadas: logo, papel, busca, tema e sair. */
export function Cabecalho({
  nome,
  papel,
  avatar,
  inicio,
  simulacao = false,
  edicao,
  marca,
}: {
  nome: string;
  papel: Papel;
  avatar: string | null;
  inicio: string;
  /** Modo "ver como": cabeçalho da pessoa simulada, sem o botão de sair da conta da organização. */
  simulacao?: boolean;
  /** Seletor da edição (só a organização). */
  edicao?: ReactNode;
  /** Logo e cor da edição (da própria edição ou da instituição). */
  marca?: MarcaResolvida;
}) {
  return (
    <header
      style={marca?.cor ? { borderTop: `3px solid ${marca.cor}` } : undefined}
      className={`border-b border-borda bg-[color-mix(in_srgb,var(--background)_72%,transparent)] backdrop-blur-[14px] ${simulacao ? "" : "sticky top-0 z-20"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3">
        <Link href={inicio} className="mr-auto flex min-w-0 items-center gap-2" aria-label="Ir para o início">
          <Logo className="w-28 shrink-0 sm:w-32" />
          {marca?.logo && (
            <span className="hidden h-9 items-center rounded-lg bg-white px-2 ring-1 ring-borda sm:flex" title={marca.nome}>
              <LogoSvg svg={marca.logo} nome={marca.nome} className="h-6 max-w-28" />
            </span>
          )}
        </Link>

        {edicao}
        {papel !== "aluno" && !edicao && <span className="chip hidden md:inline-flex">{rotuloPapel(papel)}</span>}
        <BotaoBusca />

        <div className="flex items-center gap-2" title={nome}>
          <Avatar nome={nome} foto={avatar} tamanho="size-8" />
          <span className="hidden text-sm lg:inline">{primeiroNome(nome)}</span>
        </div>

        <BotaoTema className="btn-secundario size-9 min-h-9 p-0" />

        {!simulacao && (
          <form action={sair}>
            <button className="btn-secundario size-9 min-h-9 p-0 sm:w-auto sm:px-3" title="Sair da conta" aria-label="Sair da conta">
              <Icone nome="sair" className="size-4" />
              <span className="hidden text-xs sm:inline">Sair</span>
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
