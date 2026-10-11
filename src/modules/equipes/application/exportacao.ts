import { situacaoRepo } from "@/modules/equipes/domain/permissoes";
import { rotuloCategoria, type Equipe } from "@/modules/equipes/domain/tipos";

const REPO: Record<ReturnType<typeof situacaoRepo>, string> = {
  pendente: "sem repositorio",
  nao_verificado: "nao verificado",
  publico: "sim",
  privado: "nao",
};

/** Uma linha por integrante (equipe sem integrantes sai numa linha só). */
export function planilhaEquipes(equipes: Equipe[]): string[][] {
  const cab = ["equipe", "repo_github", "repo_publico", "integrante", "email", "curso", "semestre", "lider", "links"];
  const linhas: string[][] = [];
  for (const e of equipes) {
    const links = e.links.map((l) => `${rotuloCategoria(l.categoria)}: ${l.url}`).join(" | ");
    for (const m of e.membros.length ? e.membros : [null]) {
      linhas.push([
        e.nome,
        e.repo_github ?? "",
        REPO[situacaoRepo(e)],
        m?.inscritos?.nome ?? "",
        m?.email ?? "",
        m?.inscritos?.curso ?? "",
        String(m?.inscritos?.semestre ?? ""),
        m && m.email === e.lider_email ? "sim" : "",
        links,
      ]);
    }
  }
  return [cab, ...linhas];
}
