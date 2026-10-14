"use client";

import { Icone } from "@/shared/ui/Icone";

/**
 * Baixa o desenho de uma sala como .svg com as cores já resolvidas (o arquivo abre em
 * qualquer programa, fora do sistema). Imprimir usa o próprio navegador.
 */
export function BaixarSvg({ idSvg, nome }: { idSvg: string; nome: string }) {
  function baixar() {
    const original = document.getElementById(idSvg) as SVGSVGElement | null;
    if (!original) return;
    const copia = original.cloneNode(true) as SVGSVGElement;
    // var(--...) e color-mix() só existem dentro do sistema: troca pelas cores calculadas.
    const de = original.querySelectorAll<SVGElement>("*");
    const para = copia.querySelectorAll<SVGElement>("*");
    de.forEach((el, i) => {
      const css = getComputedStyle(el);
      for (const atributo of ["fill", "stroke"] as const) if (el.getAttribute(atributo)?.match(/var|color-mix/)) para[i].setAttribute(atributo, css[atributo]);
    });
    copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const fundo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const [x, y, w, h] = (copia.getAttribute("viewBox") ?? "0 0 0 0").split(" ");
    Object.entries({ x, y, width: w, height: h, fill: "#ffffff" }).forEach(([k, v]) => fundo.setAttribute(k, v));
    copia.insertBefore(fundo, copia.firstChild);
    const blob = new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `croqui-${nome.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <button type="button" onClick={baixar} className="btn-secundario min-h-9 px-3 text-xs" data-nao-imprimir>
      <Icone nome="baixar" className="size-4" /> Baixar SVG
    </button>
  );
}

export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primario">
      <Icone nome="baixar" className="size-4" /> Imprimir ou salvar em PDF
    </button>
  );
}
