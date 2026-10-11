import { liderDa, nomeMembro, type Configuracao, type Equipe } from "./tipos";

/**
 * O que quem está vendo pode fazer numa equipe. O banco (RLS e triggers) garante a mesma
 * regra; aqui ela serve para a tela já mostrar só o que é possível e explicar o motivo
 * quando algo está bloqueado (heurística 5).
 */
export function permissoesEquipe({
  equipe,
  config,
  meuEmail,
  organizador,
}: {
  equipe: Equipe;
  config: Configuracao;
  meuEmail: string;
  organizador: boolean;
}) {
  const lider = liderDa(equipe);
  const souLider = !!lider && lider.email === meuEmail;
  const podeEditar = organizador || !config.edicao_bloqueada;

  // Sem líder, qualquer integrante define; com líder, só o líder (ou a organização) passa adiante.
  const podeMexerLider = podeEditar && (organizador || !lider || souLider);
  // Nome e repositório: só o líder (ou a organização).
  const podeEditarDados = podeEditar && (organizador || souLider);

  let motivoSemEdicaoDados: string | null = null;
  if (!podeEditar) motivoSemEdicaoDados = "A edição está bloqueada pela organização.";
  else if (!podeEditarDados)
    motivoSemEdicaoDados = lider
      ? `Só o líder (${nomeMembro(lider)}) pode alterar o nome e o repositório.`
      : "Escolham o líder da equipe: só ele pode alterar o nome e o repositório.";

  return {
    lider,
    souLider,
    podeEditar,
    podeMexerLider,
    podeEditarDados,
    motivoSemEdicaoDados,
    /** Composição da equipe (entrar/sair) é só da organização. */
    podeGerirMembros: organizador,
    lotada: equipe.membros.length >= config.max_membros,
  };
}

export type SituacaoRepo = "pendente" | "publico" | "privado" | "nao_verificado";

export function situacaoRepo(e: Pick<Equipe, "repo_github" | "repo_publico">): SituacaoRepo {
  if (!e.repo_github) return "pendente";
  if (e.repo_publico === true) return "publico";
  if (e.repo_publico === false) return "privado";
  return "nao_verificado";
}

/** Pendências de uma equipe para o painel da organização e para o aviso ao aluno. */
export function pendenciasEquipe(e: Equipe): string[] {
  const p: string[] = [];
  if (e.membros.length && !e.lider_email) p.push("sem líder");
  const repo = situacaoRepo(e);
  if (repo === "pendente") p.push("sem repositório");
  if (repo === "privado") p.push("repositório privado ou inexistente");
  return p;
}
