import Link from "next/link";
import { sair } from "@/app/actions";
import { BotaoTema } from "@/components/BotaoTema";
import { Logo } from "@/components/Logo";
import { rotuloPapel, type Inscrito } from "@/lib/tipos";

export function Cabecalho({
  inscrito,
  avatar,
  organizador,
  simulacao = false,
}: {
  inscrito: Inscrito;
  avatar: string | null;
  organizador: boolean;
  /** Modo "ver como aluno": cabeçalho do aluno, sem botão de sair. */
  simulacao?: boolean;
}) {
  const primeiroNome = inscrito.nome.split(" ")[0];
  const avaliador = inscrito.papel === "avaliador_tecnico" || inscrito.papel === "avaliador_negocio";

  return (
    <header
      className={`border-b border-borda bg-[color-mix(in_srgb,var(--background)_72%,transparent)] backdrop-blur-[14px] ${simulacao ? "" : "sticky top-0 z-10"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        {simulacao ? (
          <span className="mr-auto">
            <Logo className="w-28 sm:w-32" />
          </span>
        ) : (
          <Link href={organizador ? "/admin" : avaliador ? "/avaliar" : "/"} className="mr-auto" aria-label="Início">
            <Logo className="w-28 sm:w-32" />
          </Link>
        )}

        {organizador && (
          <span className="chip hidden sm:inline-flex">Organização</span>
        )}
        {avaliador && <span className="chip hidden sm:inline-flex">{rotuloPapel(inscrito.papel)}</span>}

        <div className="flex items-center gap-2">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "var(--grad)" }}>
              {primeiroNome[0]}
            </span>
          )}
          <span className="hidden text-sm sm:inline">{primeiroNome}</span>
        </div>

        <BotaoTema className="btn-secundario size-9 min-h-9 p-0" />

        {simulacao ? (
          <span className="text-sm text-suave">Sair</span>
        ) : (
          <form action={sair}>
            <button className="text-sm text-suave underline-offset-4 hover:underline">Sair</button>
          </form>
        )}
      </div>
    </header>
  );
}
