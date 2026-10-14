import { encerrarSimulacao } from "@/modules/pessoas/application/simulacao";
import { rotuloPapel, type Papel } from "@/modules/pessoas/domain/papeis";
import { Icone } from "@/shared/ui/Icone";

/** Faixa fixa do "ver como": quem está sendo simulado, o que vale e como sair (heurística 3). */
export function FaixaSimulacao({ nome, papel }: { nome: string; papel: Papel }) {
  const aviso =
    papel === "avaliador"
      ? "a ficha fica só para consulta: nada é salvo em nome da banca"
      : "o que você mudar aqui fica registrado em seu nome, como organização";
  return (
    <div role="status" className="sticky top-0 z-30 bg-amber-400 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <Icone nome="olho" className="size-4" />
        <span className="font-semibold">
          Vendo como {nome} · {rotuloPapel(papel)}
        </span>
        <span className="hidden sm:inline">· {aviso}</span>
        <form action={encerrarSimulacao} className="ml-auto">
          <button className="rounded-lg bg-amber-950 px-3 py-1 font-semibold text-amber-50">Sair da simulação</button>
        </form>
      </div>
    </div>
  );
}
