"use client";

import { useId, useState } from "react";
import { conferirSvg } from "@/modules/instituicoes/domain/tipos";
import { LogoSvg } from "@/modules/instituicoes/ui/LogoSvg";
import { Icone } from "@/shared/ui/Icone";

/**
 * Escolher a logo (.svg): confere na hora, mostra a prévia e manda o texto do SVG num campo
 * oculto. O servidor e o banco conferem de novo antes de gravar (heurísticas 1, 5 e 9).
 */
export function CampoLogo({ name = "logo_svg", inicial, rotulo = "Logo (SVG)", dica }: { name?: string; inicial?: string | null; rotulo?: string; dica?: string }) {
  const [svg, setSvg] = useState(inicial ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const idCampo = useId();

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    const texto = await arquivo.text();
    const problema = conferirSvg(texto);
    setErro(problema);
    if (!problema) setSvg(texto.trim());
  }

  return (
    <div className="space-y-2">
      <span className="rotulo">
        {rotulo} <span className="ml-1 font-normal text-suave">(opcional)</span>
      </span>
      <input type="hidden" name={name} value={svg} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-16 w-32 place-items-center rounded-xl border border-dashed border-borda bg-white p-2 dark:bg-white/90">
          {svg ? <LogoSvg svg={svg} nome="escolhida" className="max-h-12 w-auto" /> : <span className="text-xs text-slate-500">sem logo</span>}
        </div>
        <label htmlFor={idCampo} className="btn-secundario min-h-9 cursor-pointer px-3 text-xs">
          <Icone nome="imagem" className="size-4" /> {svg ? "Trocar logo" : "Escolher arquivo .svg"}
        </label>
        <input
          id={idCampo}
          type="file"
          accept=".svg,image/svg+xml"
          className="sr-only"
          onChange={(ev) => {
            void escolher(ev.target.files?.[0]);
            ev.target.value = "";
          }}
        />
        {svg && (
          <button type="button" onClick={() => setSvg("")} className="btn-secundario min-h-9 px-3 text-xs">
            <Icone nome="fechar" className="size-4" /> Tirar logo
          </button>
        )}
      </div>
      {erro ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {erro}
        </p>
      ) : (
        <p className="text-xs text-suave">{dica ?? "Arquivo .svg de até 200 KB. A mudança só vale depois de salvar."}</p>
      )}
    </div>
  );
}
