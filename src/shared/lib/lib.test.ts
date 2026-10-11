import { describe, expect, it } from "vitest";
import { decimalOpcional, email, inteiroOpcional, texto, url } from "@/shared/acao/campos";
import { dataCompleta, hora, nota, plural } from "./formatar";
import { casaBusca, primeiroNome } from "./texto";

describe("formatar", () => {
  it("nota com vírgula e traço quando vazia", () => {
    expect(nota(78.46)).toBe("78,5");
    expect(nota(null)).toBe("—");
    expect(nota(Number.NaN)).toBe("—");
  });
  it("horário no fuso de Cuiabá (UTC−4)", () => {
    expect(hora("2026-10-10T18:30:00Z")).toBe("14:30");
    expect(dataCompleta("2026-10-10T18:30:00Z")).toBe("10/10 às 14:30");
  });
  it("plural", () => {
    expect(plural(1, "ficha")).toBe("1 ficha");
    expect(plural(3, "avaliador", "avaliadores")).toBe("3 avaliadores");
  });
});

describe("texto", () => {
  it("busca ignora acento e maiúsculas", () => {
    expect(casaBusca("João Conceição", "joao conc")).toBe(true);
    expect(casaBusca("Ana", "bia")).toBe(false);
    expect(primeiroNome("  Maria  Clara ")).toBe("Maria");
  });
});

describe("campos dos formulários", () => {
  it("e-mail normaliza e valida", () => {
    expect(email.parse("  Fulano@Gmail.com ")).toBe("fulano@gmail.com");
    expect(email.safeParse("fulano").success).toBe(false);
  });
  it("url completa o https://", () => {
    expect(url.parse("github.com/a/b")).toBe("https://github.com/a/b");
  });
  it("números opcionais aceitam vazio e vírgula", () => {
    expect(decimalOpcional("Nota", 0, 10).parse("8,5")).toBe(8.5);
    expect(decimalOpcional("Nota", 0, 10).parse("")).toBeNull();
    expect(inteiroOpcional("Semestre", 1, 10).safeParse("11").success).toBe(false);
  });
  it("texto obrigatório explica o que falta", () => {
    const r = texto("o nome").safeParse("");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Informe o nome.");
  });
});
