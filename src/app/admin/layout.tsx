import { redirect } from "next/navigation";
import { AbasAdmin } from "@/components/AbasAdmin";
import { Cabecalho } from "@/components/Cabecalho";
import { sessaoAtual } from "@/lib/dados";

// Área da organização: só organizadores. Cada aba é uma página em /admin/*.
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const { inscrito, avatar, organizador } = await sessaoAtual();
  if (!organizador) redirect("/");

  return (
    <>
      <Cabecalho inscrito={inscrito} avatar={avatar} organizador />
      <AbasAdmin />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
