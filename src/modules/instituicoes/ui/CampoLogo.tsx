"use client";

import { useId, useState } from "react";
import { conferirLogo, conferirSvg, svgComoImagem } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { LogoSvg } from "@/modules/instituicoes/ui/LogoSvg";
import { Icone } from "@/shared/ui/Icone";

const lerComoDataUrl = (arquivo: File) =>
  new Promise<string>((ok, erro) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result));
    leitor.onerror = () => erro(leitor.error);
    leitor.readAsDataURL(arquivo);
  });

/**
 * Escolher a logo: confere na hora, mostra a prévia e manda o valor num campo oculto.
 * O servidor e o banco conferem de novo antes de gravar (heurísticas 1, 5 e 9).
 *  - tipo "svg": logo de instituição, guardada como texto SVG;
 *  - tipo "imagem": logo da edição (PNG, JPG, WEBP ou SVG), guardada como data URL e
 *    mostrada na placa com a cor da edição, como vai ficar no topo das telas.
 */
export function CampoLogo({
  name = "logo_svg",
  tipo = "svg",
  inicial,
  rotulo = "Logo (SVG)",
  dica,
  cor = null,
}: {
  name?: string;
  tipo?: "svg" | "imagem";
  inicial?: string | null;
  rotulo?: string;
  dica?: string;
  cor?: string | null;
}) {
  const [valor, setValor] = useState(inicial ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const idCampo = useId();

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    const ehSvg = arquivo.type === "image/svg+xml" || arquivo.name.toLowerCase().endsWith(".svg");
    if (tipo === "svg" || ehSvg) {
      const texto = await arquivo.text();
      const problema = conferirSvg(texto);
      setErro(problema);
      if (!problema) setValor(tipo === "svg" ? texto.trim() : svgComoImagem(texto));
      return;
    }
    const dataUrl = await lerComoDataUrl(arquivo);
    const problema = conferirLogo(dataUrl);
    setErro(problema);
    if (!problema) setValor(dataUrl);
  }

  return (
    <div className="space-y-2">
      <span className="rotulo">
        {rotulo} <span className="ml-1 font-normal text-suave">(opcional)</span>
      </span>
      <input type="hidden" name={name} value={valor} />
      <div className="flex flex-wrap items-center gap-3">
        {tipo === "imagem" ? (
          <LogoEdicao marca={{ logo: valor || null, cor, nome: "Prévia da logo" }} className="h-12 w-40" />
        ) : (
          <div className="grid h-16 w-32 place-items-center rounded-xl border border-dashed border-borda bg-white p-2 dark:bg-white/90">
            {valor ? <LogoSvg svg={valor} nome="escolhida" className="max-h-12 w-auto" /> : <span className="text-xs text-slate-500">sem logo</span>}
          </div>
        )}
        <label htmlFor={idCampo} className="btn-secundario min-h-9 cursor-pointer px-3 text-xs">
          <Icone nome="imagem" className="size-4" /> {valor ? "Trocar logo" : "Escolher arquivo"}
        </label>
        <input
          id={idCampo}
          type="file"
          accept={tipo === "svg" ? ".svg,image/svg+xml" : ".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"}
          className="sr-only"
          onChange={(ev) => {
            void escolher(ev.target.files?.[0]);
            ev.target.value = "";
          }}
        />
        {valor && (
          <button type="button" onClick={() => setValor("")} className="btn-secundario min-h-9 px-3 text-xs">
            <Icone nome="fechar" className="size-4" /> Tirar logo
          </button>
        )}
      </div>
      {erro ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {erro}
        </p>
      ) : (
        <p className="text-xs text-suave">{dica ?? (tipo === "svg" ? "Arquivo .svg de até 200 KB." : "PNG, JPG, WEBP ou SVG de até ~500 KB.")} A mudança só vale depois de salvar.</p>
      )}
    </div>
  );
}
