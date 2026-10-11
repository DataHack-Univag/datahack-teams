import Link from "next/link";
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
}: {
  nome: string;
  papel: Papel;
  avatar: string | null;
  inicio: string;
  /** Modo "ver como": mostra o cabeçalho do aluno, mas sem sair da conta da organização. */
  simulacao?: boolean;
}) {
  return (
    <header
      className={`border-b border-borda bg-[color-mix(in_srgb,var(--background)_72%,transparent)] backdrop-blur-[14px] ${simulacao ? "" : "sticky top-0 z-20"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3">
        <Link href={inicio} className="mr-auto" aria-label="Ir para o início">
          <Logo className="w-28 sm:w-32" />
        </Link>

        {papel !== "aluno" && <span className="chip hidden md:inline-flex">{rotuloPapel(papel)}</span>}
        {!simulacao && <BotaoBusca />}

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
