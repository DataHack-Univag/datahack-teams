import { svgComoImagem } from "@/modules/instituicoes/domain/tipos";

/**
 * Logo em SVG mostrada como imagem: o navegador não executa nada dentro de um <img>,
 * então a logo enviada nunca roda código na página.
 */
export function LogoSvg({ svg, nome, className = "h-8 w-auto" }: { svg: string; nome: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- SVG em texto (data:), sem arquivo para o next/image otimizar
  return <img src={svgComoImagem(svg)} alt={`Logo ${nome}`} className={`object-contain ${className}`} />;
}
