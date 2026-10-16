import { describe, expect, it } from "vitest";
import { chamadaDaAtual } from "@/modules/edicoes/domain/atual";

describe("chamadaDaAtual", () => {
  it("quem já participa só abre a edição", () => {
    expect(chamadaDaAtual({ participa: true, slug: "x", inscricoes: "aberta" })).toEqual({ tipo: "abrir" });
  });
  it("quem já se inscreveu acompanha a inscrição", () => {
    expect(chamadaDaAtual({ participa: false, minhaInscricao: "espera", slug: "x", inscricoes: "aberta" })).toEqual({ tipo: "acompanhar", situacao: "espera" });
  });
  it("recusada com inscrições abertas pode se inscrever de novo", () => {
    expect(chamadaDaAtual({ participa: false, minhaInscricao: "recusada", slug: "x", inscricoes: "aberta" })).toEqual({ tipo: "inscrever", slug: "x" });
  });
  it("inscrições abertas, em breve e encerradas", () => {
    expect(chamadaDaAtual({ participa: false, slug: "x", inscricoes: "aberta" }).tipo).toBe("inscrever");
    expect(chamadaDaAtual({ participa: false, slug: "x", inscricoes: "em_breve" }).tipo).toBe("em_breve");
    expect(chamadaDaAtual({ participa: false, slug: "x", inscricoes: "encerrada" }).tipo).toBe("encerrada");
  });
  it("lista fechada (sem link) é só por convite", () => {
    expect(chamadaDaAtual({ participa: false, slug: null, inscricoes: "fechada" })).toEqual({ tipo: "convite" });
    expect(chamadaDaAtual({ participa: false })).toEqual({ tipo: "convite" });
  });
});
