import { describe, expect, it } from "vitest";
import { contraste, cssDoTema, temaDaCor } from "./tema";

describe("tema da edição", () => {
  it("sem cor, ou com o azul-marinho padrão, fica o tema de sempre", () => {
    expect(temaDaCor(null)).toBeNull();
    expect(temaDaCor("#000b38")).toBeNull();
    expect(temaDaCor("verde")).toBeNull();
  });

  it.each(["#16a34a", "#22c55e", "#facc15", "#e05a1b", "#7c3aed", "#00e5ff", "#888888"])("cor %s: textos e destaques leem bem nos dois temas", (cor) => {
    const t = temaDaCor(cor)!;
    // tema claro: destaque e texto suave sobre o fundo claro e sobre branco (cartões)
    expect(contraste(t.claro["--marca"], "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.claro["--marca"], t.claro["--background"])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.claro["--suave"], t.claro["--background"])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.claro["--foreground"], t.claro["--background"])).toBeGreaterThanOrEqual(7);
    // tema escuro: destaque mais claro sobre o fundo escuro
    expect(contraste(t.escuro["--marca"], t.escuro["--background"])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.escuro["--marca"], t.escuro["--superficie-solida"])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.escuro["--suave"], t.escuro["--background"])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.escuro["--foreground"], t.escuro["--background"])).toBeGreaterThanOrEqual(7);
    // botão principal (texto branco) nos dois temas
    for (const k of ["--botao-1", "--azul", "--botao-3"]) {
      expect(contraste(t.claro[k], "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contraste(t.escuro[k], "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("verde vira verde no sistema todo (mesmo matiz) e gera as regras dos dois temas", () => {
    const t = temaDaCor("#16a34a")!;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(t.claro["--marca"].slice(i, i + 2), 16));
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
    const css = cssDoTema(t);
    expect(css).toContain(':root[data-theme="light"]{');
    expect(css).toContain(":root,:root[data-theme=\"dark\"]{");
  });
});
