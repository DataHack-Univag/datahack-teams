import { describe, expect, it } from "vitest";
import { conferirLogo, conferirSvg, resolverMarca, svgComoImagem } from "./tipos";

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
  it("usa a logo da própria edição; sem logo, só o nome", () => {
    expect(resolverMarca({ nome: "Edição 1", marca: { logo: "/logo-datahack.png", cor: "#000b38" } })).toEqual({
      nome: "Edição 1",
      cor: "#000b38",
      logo: "/logo-datahack.png",
    });
    expect(resolverMarca({ nome: "Edição 4", marca: { nome_publico: "DATAHack MT" } })).toEqual({ nome: "DATAHack MT", cor: null, logo: null });
    expect(resolverMarca({ nome: "Edição 5", marca: { cor: "vermelho", logo: "javascript:alert(1)" } })).toMatchObject({ cor: null, logo: null });
  });

  it("aceita imagem ou arquivo do sistema como logo", () => {
    expect(conferirLogo("data:image/png;base64,iVBORw0KGgo=")).toBeNull();
    expect(conferirLogo("data:image/svg+xml;charset=utf-8,%3Csvg")).toBeNull();
    expect(conferirLogo("/logo-datahack.png")).toBeNull();
    expect(conferirLogo("data:text/html,<script>")).toContain("PNG");
    expect(conferirLogo(`data:image/png;base64,${"A".repeat(700_001)}`)).toContain("limite");
  });
});
