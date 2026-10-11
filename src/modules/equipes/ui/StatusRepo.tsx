import { situacaoRepo } from "@/modules/equipes/domain/permissoes";
import type { Equipe } from "@/modules/equipes/domain/tipos";
import { dataHora } from "@/shared/lib/formatar";
import { Selo } from "@/shared/ui/Selo";

/** Selo do repositório: público, privado/inexistente, não verificado ou pendente. */
export function StatusRepo({ equipe }: { equipe: Pick<Equipe, "repo_github" | "repo_publico" | "repo_verificado_em"> }) {
  const s = situacaoRepo(equipe);
  const quando = equipe.repo_verificado_em ? ` (verificado ${dataHora(equipe.repo_verificado_em)})` : "";
  if (s === "publico") return <Selo tom="sucesso" title={`Público${quando}`}>✔ Público</Selo>;
  if (s === "privado") return <Selo tom="erro" title={`Privado ou inexistente${quando}`}>⚠ Privado ou inexistente</Selo>;
  if (s === "pendente") return <Selo tom="alerta">Repositório pendente</Selo>;
  return <Selo tom="alerta">Não verificado</Selo>;
}
