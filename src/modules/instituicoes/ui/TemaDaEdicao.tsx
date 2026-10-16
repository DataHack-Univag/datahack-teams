import { cssDoTema, temaDaCor } from "@/modules/instituicoes/domain/tema";

/**
 * Pinta o sistema inteiro com a cor da edição (botões, links, abas, fundo, telão), nos temas
 * claro e escuro, trocando as variáveis de cor do globals.css. Sem cor (ou com o azul-marinho
 * padrão), não faz nada: fica o visual de sempre do DATAHack.
 */
export function TemaDaEdicao({ cor }: { cor: string | null | undefined }) {
  const tema = temaDaCor(cor);
  // A cor já foi conferida (#RRGGBB) no banco e em temaDaCor: o CSS só tem cores geradas aqui.
  return tema ? <style dangerouslySetInnerHTML={{ __html: cssDoTema(tema) }} /> : null;
}
