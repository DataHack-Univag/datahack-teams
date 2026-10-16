import { SubAbas } from "@/shared/ui/Pagina";

/** Sub-abas da aba Equipes: lista, propostas dos participantes, trocas e gerador. */
export function SubAbasEquipes({
  ativa,
  trocas,
  equipes,
  propostas,
  paraAprovar,
}: {
  ativa: "lista" | "propostas" | "trocas" | "gerador";
  trocas?: number;
  equipes?: number;
  propostas?: number;
  /** Propostas com todos confirmados, esperando a organização: bolinha em destaque. */
  paraAprovar?: number;
}) {
  return (
    <SubAbas
      ativa={ativa}
      abas={[
        { id: "lista", rotulo: "Equipes", href: "/admin/equipes", contagem: equipes },
        { id: "propostas", rotulo: "Propostas", href: "/admin/equipes/propostas", contagem: propostas, pendentes: paraAprovar },
        { id: "trocas", rotulo: "Trocas", href: "/admin/equipes/trocas", pendentes: trocas },
        { id: "gerador", rotulo: "Gerador de equipes", href: "/admin/equipes/gerador" },
      ]}
    />
  );
}
