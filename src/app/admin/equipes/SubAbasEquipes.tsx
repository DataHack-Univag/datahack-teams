import { SubAbas } from "@/shared/ui/Pagina";

/** Sub-abas da aba Equipes: formação (lista), trocas e gerador. */
export function SubAbasEquipes({ ativa, trocas, equipes }: { ativa: "lista" | "trocas" | "gerador"; trocas?: number; equipes?: number }) {
  return (
    <SubAbas
      ativa={ativa}
      abas={[
        { id: "lista", rotulo: "Equipes", href: "/admin/equipes", contagem: equipes },
        { id: "trocas", rotulo: "Trocas", href: "/admin/equipes/trocas", contagem: trocas },
        { id: "gerador", rotulo: "Gerador de equipes", href: "/admin/equipes/gerador" },
      ]}
    />
  );
}
