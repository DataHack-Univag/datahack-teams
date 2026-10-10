import Link from "next/link";
import { redirect } from "next/navigation";
import { AjudaCalculo } from "@/components/AjudaCalculo";
import { Cabecalho } from "@/components/Cabecalho";
import { sessaoAtual } from "@/lib/dados";

// Área das bancas: só avaliadores (técnico/negócio) e organizadores.
export default async function LayoutAvaliar({ children }: LayoutProps<"/avaliar">) {
  const { inscrito, avatar, organizador, avaliador } = await sessaoAtual();
  if (!organizador && !avaliador) redirect("/");

  return (
    <>
      <Cabecalho inscrito={inscrito} avatar={avatar} organizador={organizador} />
      {/* Barra da área de avaliação: ajuda do cálculo para todos; atalhos para a organização. */}
      <nav className="relative z-10 border-b border-borda bg-[color-mix(in_srgb,var(--background)_55%,transparent)] backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
          {organizador && (
            <>
              <Link href="/admin" className="text-suave hover:text-foreground">
                ← Organização
              </Link>
              <Link href="/admin/avaliacao" className="font-semibold text-marca">
                Ver nota final e ranking (média dos avaliadores) →
              </Link>
            </>
          )}
          <span className="ml-auto">
            <AjudaCalculo className="btn-secundario min-h-9 px-3 text-xs" />
          </span>
        </div>
      </nav>
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
