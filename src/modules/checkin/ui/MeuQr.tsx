import QRCode from "qrcode";
import { Icone } from "@/shared/ui/Icone";

/**
 * QR de entrada do participante: a mentoria lê na porta e a presença é marcada. O código
 * também aparece escrito, para digitar se a câmera não ler (heurística 9).
 */
export async function MeuQr({ codigo, edicao }: { codigo: string; edicao: string }) {
  const svg = await QRCode.toString(codigo, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000b38", light: "#ffffff" } });
  return (
    <details className="card group" open>
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <Icone nome="qr" className="size-5 text-marca" />
        Seu QR de entrada
        <span className="ml-auto text-xs font-normal text-suave group-open:hidden">mostrar</span>
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {/* SVG gerado aqui no servidor a partir do código (sem conteúdo de terceiros). */}
        <div className="size-44 shrink-0 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="space-y-2 text-sm">
          <p>Mostre na entrada da {edicao}: a mentoria lê e marca a sua presença.</p>
          <p>
            Se a câmera não ler, diga o código:{" "}
            <strong className="font-mono text-lg tracking-[0.2em]">
              {codigo.slice(0, 4)} {codigo.slice(4)}
            </strong>
          </p>
          <p className="text-xs text-suave">O código é só seu. Não compartilhe.</p>
        </div>
      </div>
    </details>
  );
}
