import { describe, expect, it } from "vitest";
import { normalizarRepo } from "./github";
import { pendenciasEquipe, permissoesEquipe, situacaoRepo } from "./permissoes";
import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { configuracaoDa, type Equipe } from "./tipos";

describe("normalizarRepo", () => {
  it.each([
    ["github.com/fulano/projeto", "https://github.com/fulano/projeto"],
    ["http://www.github.com/fulano/projeto.git", "https://github.com/fulano/projeto"],
    ["https://github.com/fulano/projeto/tree/main?tab=readme#x", "https://github.com/fulano/projeto"],
    ["  https://github.com/fulano/projeto/  ", "https://github.com/fulano/projeto"],
  ])("%s → %s", (entrada, esperado) => expect(normalizarRepo(entrada)).toBe(esperado));

  it.each(["", "https://gitlab.com/a/b", "https://github.com/so-usuario", "github.com/a b/c"])("rejeita %j", (e) =>
    expect(normalizarRepo(e)).toBeNull(),
  );
});

const membro = (email: string) => ({ email, situacao: "confirmado" as const, inscritos: { nome: email.split("@")[0], curso: null, semestre: null } });
const equipe = (extra: Partial<Equipe> = {}): Equipe =>
  ({
    id: "e1",
    nome: "Equipe",
    repo_github: null,
    repo_publico: null,
    lider_email: null,
    membros: [membro("ana@x.com"), membro("bia@x.com")],
    links: [],
    ...extra,
  }) as Equipe;
const config = { max_membros: 2, min_membros: 1, edicao_bloqueada: false, motivo_bloqueio: null, permite_trocas: true, modo_formacao: "gerador" as const };

describe("permissoesEquipe", () => {
  it("sem líder: qualquer integrante escolhe o líder, mas não edita os dados", () => {
    const p = permissoesEquipe({ equipe: equipe(), config, meuEmail: "ana@x.com", organizador: false });
    expect(p.podeMexerLider).toBe(true);
    expect(p.podeEditarDados).toBe(false);
    expect(p.motivoSemEdicaoDados).toMatch(/líder/);
    expect(p.lotada).toBe(true);
  });
  it("com líder: só o líder edita os dados e passa a liderança", () => {
    const e = equipe({ lider_email: "ana@x.com" });
    expect(permissoesEquipe({ equipe: e, config, meuEmail: "ana@x.com", organizador: false }).podeEditarDados).toBe(true);
    const bia = permissoesEquipe({ equipe: e, config, meuEmail: "bia@x.com", organizador: false });
    expect(bia.podeEditarDados).toBe(false);
    expect(bia.podeMexerLider).toBe(false);
  });
  it("edição bloqueada vale para alunos, não para a organização", () => {
    const bloqueada = { ...config, edicao_bloqueada: true };
    const e = equipe({ lider_email: "ana@x.com" });
    expect(permissoesEquipe({ equipe: e, config: bloqueada, meuEmail: "ana@x.com", organizador: false }).podeEditar).toBe(false);
    const org = permissoesEquipe({ equipe: e, config: bloqueada, meuEmail: "org@x.com", organizador: true });
    expect(org.podeEditarDados).toBe(true);
    expect(org.podeGerirMembros).toBe(true);
  });
});

describe("pendências", () => {
  it("aponta líder e repositório", () => {
    expect(pendenciasEquipe(equipe())).toEqual(["sem líder", "sem repositório"]);
    expect(pendenciasEquipe(equipe({ lider_email: "ana@x.com", repo_github: "https://github.com/a/b", repo_publico: true }))).toEqual([]);
    expect(situacaoRepo({ repo_github: "https://github.com/a/b", repo_publico: false })).toBe("privado");
    expect(situacaoRepo({ repo_github: "https://github.com/a/b", repo_publico: null })).toBe("nao_verificado");
  });
});

describe("configuracaoDa", () => {
  const edicao = (e: Partial<Edicao>) =>
    ({ max_membros: 6, min_membros: 2, equipes_travadas: false, situacao: "em_andamento", atual: true, permite_trocas: true, modo_formacao: "gerador", nome: "Edição 1", ...e }) as Edicao;

  it("edição que já passou fica só para consulta para alunos e bancas, não para a organização", () => {
    const passada = edicao({ atual: false });
    expect(configuracaoDa(passada, { paraParticipante: true })).toMatchObject({ edicao_bloqueada: true, motivo_bloqueio: expect.stringContaining("já terminou") });
    expect(configuracaoDa(passada)).toMatchObject({ edicao_bloqueada: false, motivo_bloqueio: null });
  });

  it("edição encerrada ou travada bloqueia com o motivo certo", () => {
    expect(configuracaoDa(edicao({ situacao: "encerrada" })).motivo_bloqueio).toBe("Edição encerrada");
    expect(configuracaoDa(edicao({ equipes_travadas: true })).motivo_bloqueio).toBe("Edição bloqueada pela organização");
  });
});
