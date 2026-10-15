import { describe, expect, it } from "vitest";
import { conferirSvg, resolverMarca, svgComoImagem } from "./tipos";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

describe("logo em SVG", () => {
  it("aceita SVG simples e recusa o que tem código", () => {
    expect(conferirSvg(svg)).toBeNull();
    expect(conferirSvg("")).toContain("vazio");
    expect(conferirSvg("<html></html>")).toContain("não é um SVG");
    expect(conferirSvg('<svg onload="alert(1)"></svg>')).toContain("código embutido");
    expect(conferirSvg("<svg><script>alert(1)</script></svg>")).toContain("código embutido");
    expect(conferirSvg('<svg><a href="javascript:x()"/></svg>')).toContain("código embutido");
    expect(conferirSvg(`<svg>${"x".repeat(200_001)}</svg>`)).toContain("limite");
  });

  it("vira endereço de imagem", () => {
    expect(svgComoImagem(svg)).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
  });
});

describe("marca da edição", () => {
  const univag = { nome: "Centro Universitário de Várzea Grande", sigla: "UNIVAG", logo_svg: svg };

  it("usa a logo da edição, senão a da instituição, senão nenhuma", () => {
    expect(resolverMarca({ nome: "Edição 1", marca: {} }, [univag])).toEqual({ nome: "Edição 1", cor: null, logo: svg, origem: "instituicao" });
    expect(resolverMarca({ nome: "Edição 4", marca: { nome_publico: "DATAHack MT", logo_svg: "<svg/>", cor: "#e05a1b" } }, [univag])).toEqual({
      nome: "DATAHack MT",
      cor: "#e05a1b",
      logo: "<svg/>",
      origem: "edicao",
    });
    expect(resolverMarca({ nome: "Edição 5", marca: { cor: "vermelho" } }, [{ ...univag, logo_svg: null }])).toMatchObject({ cor: null, logo: null, origem: null });
  });
});
