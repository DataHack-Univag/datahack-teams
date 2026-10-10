import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { sessaoAtual } from "@/lib/dados";

// Área das bancas: só avaliadores (técnico/negócio) e organizadores.
export default async function LayoutAvaliar({ children }: LayoutProps<"/avaliar">) {
  const { inscrito, avatar, organizador, avaliador } = await sessaoAtual();
  if (!organizador && !avaliador) redirect("/");

  return (
    <>
      <Cabecalho inscrito={inscrito} avatar={avatar} organizador={organizador} />
      {organizador && (
        <nav className="relative z-10 border-b border-borda bg-[color-mix(in_srgb,var(--background)_55%,transparent)] backdrop-blur-[10px]">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-1 px-4 py-2 text-sm">
            <Link href="/admin" className="text-suave hover:text-foreground">
              ← Organização
            </Link>
            <Link href="/admin/avaliacao" className="font-semibold text-marca">
              Ver nota final e ranking (média dos avaliadores) →
            </Link>
          </div>
        </nav>
      )}
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
