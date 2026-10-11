import Link from "next/link";
import { Icone } from "@/shared/ui/Icone";

// Endereço que não existe (ou equipe/pessoa que foi removida).
export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-marca-fundo text-marca">
          <Icone nome="busca" />
        </span>
        <h1 className="text-xl font-bold">Não encontramos esta página</h1>
        <p className="text-sm text-suave">O link pode estar errado, ou a equipe/pessoa foi removida.</p>
        <Link href="/" className="btn-primario">
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}
