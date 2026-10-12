import { SubAbas } from "@/shared/ui/Pagina";

/** Sub-abas da aba Equipes: lista, propostas dos alunos, trocas e gerador. */
export function SubAbasEquipes({
  ativa,
  trocas,
  equipes,
  propostas,
}: {
  ativa: "lista" | "propostas" | "trocas" | "gerador";
  trocas?: number;
  equipes?: number;
  propostas?: number;
}) {
  return (
    <SubAbas
      ativa={ativa}
      abas={[
        { id: "lista", rotulo: "Equipes", href: "/admin/equipes", contagem: equipes },
        { id: "propostas", rotulo: "Propostas", href: "/admin/equipes/propostas", contagem: propostas },
        { id: "trocas", rotulo: "Trocas", href: "/admin/equipes/trocas", contagem: trocas },
        { id: "gerador", rotulo: "Gerador de equipes", href: "/admin/equipes/gerador" },
      ]}
    />
  );
}
