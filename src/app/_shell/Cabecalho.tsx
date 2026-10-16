import Link from "next/link";
import type { ReactNode } from "react";
import type { MarcaResolvida } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { sair } from "@/modules/pessoas/application/actions";
import { rotuloPapel, type Papel } from "@/modules/pessoas/domain/papeis";
import { primeiroNome } from "@/shared/lib/texto";
import { Avatar } from "@/shared/ui/Avatar";
import { BotaoTema } from "@/shared/ui/BotaoTema";
import { Logo } from "@/shared/ui/Logo";
import { Icone } from "@/shared/ui/Icone";
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
  /** Logo e cor da edição que a pessoa está vendo. */
  marca?: MarcaResolvida;
}) {
  return (
    <header
      style={marca?.cor ? { borderTop: `3px solid ${marca.cor}` } : undefined}
      className={`border-b border-borda bg-[color-mix(in_srgb,var(--background)_72%,transparent)] backdrop-blur-[14px] ${simulacao ? "relative z-30" : "sticky top-0 z-30"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3">
        <Link href={inicio} className="mr-auto" aria-label={`${marca?.nome ?? "DATAHack"}: ir para o início`}>
          {marca ? <LogoEdicao marca={marca} className="h-10 w-28 sm:w-32" /> : <Logo className="w-28 sm:w-32" />}
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
