import QRCode from "qrcode";
import { AoVivo } from "@/shared/ui/AoVivo";
import { Icone } from "@/shared/ui/Icone";

/**
 * QR de entrada do participante. Antes do check-in: o QR grande, com o código escrito embaixo
 * (para digitar se a câmera não ler). Depois: só a confirmação "Presença confirmada", que
 * aparece na hora em que a mentoria lê o QR (ao vivo, heurística 1).
 */
export async function MeuQr({
  codigo,
  edicao,
  email,
  presente,
  presencaEm,
}: {
  codigo: string;
  edicao: string;
  email: string;
  presente: boolean;
  presencaEm: string | null;
}) {
  if (presente) {
    const hora = presencaEm ? new Date(presencaEm).toLocaleTimeString("pt-BR", { timeZone: "America/Cuiaba", hour: "2-digit", minute: "2-digit" }) : null;
    const dia = presencaEm ? new Date(presencaEm).toLocaleDateString("pt-BR", { timeZone: "America/Cuiaba", day: "2-digit", month: "2-digit" }) : null;
    return (
      <section role="status" className="card flex items-center gap-3 border-l-4 border-l-emerald-500 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <Icone nome="ok" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Presença confirmada</p>
          <p className="text-xs text-suave">
            {hora ? `Check-in em ${dia} às ${hora}` : "Check-in feito"} · código <span className="font-mono tracking-wider">{codigo}</span>
          </p>
        </div>
      </section>
    );
  }

  const svg = await QRCode.toString(codigo, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000b38", light: "#ffffff" } });
  return (
    <details className="card group" open>
      {/* Muda sozinho para "Presença confirmada" assim que a mentoria ler o QR. */}
      <AoVivo tabela="participacoes" filtro={`email=eq.${email}`} />
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <Icone nome="qr" className="size-5 text-marca" />
        Seu QR de entrada
        <span className="ml-auto text-xs font-normal text-suave group-open:hidden">mostrar</span>
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {/* SVG gerado aqui no servidor a partir do código (sem conteúdo de terceiros). */}
        <div className="size-44 shrink-0 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="space-y-2 text-sm">
          <p>Mostre na entrada da {edicao}: a mentoria lê e marca a sua presença. Esta tela muda sozinha quando o check-in for feito.</p>
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
