import { COR_PADRAO, type MarcaResolvida } from "@/modules/instituicoes/domain/tipos";

/**
 * Logo da edição numa placa com a cor dela (a mesma placa azul-marinho do DATAHack Univag).
 * Sem logo cadastrada, a placa mostra só "DATAHack", para não exibir a marca de outra edição.
 * A imagem vai num <img>: nem um SVG enviado executa nada.
 */
export function LogoEdicao({
  marca,
  className = "h-9 w-32",
  texto = "text-sm",
}: {
  marca: Pick<MarcaResolvida, "logo" | "cor" | "nome">;
  className?: string;
  /** Tamanho do "DATAHack" quando não há logo (placas grandes, como a do login, pedem texto maior). */
  texto?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg px-2 py-1 ring-1 ring-cyan-400/25 ${className}`}
      style={{ backgroundColor: marca.cor ?? COR_PADRAO }}
    >
      {marca.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo enviada pela organização (data URL) ou arquivo do sistema
        <img src={marca.logo} alt={marca.nome} className="max-h-full max-w-full object-contain" />
      ) : (
        <span className={`truncate font-mono font-bold tracking-tight text-white ${texto}`} title={marca.nome}>
          DATA<span className="text-cyan-300">Hack</span>
        </span>
      )}
    </span>
  );
}
