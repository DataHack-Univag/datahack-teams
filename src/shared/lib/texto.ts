/** Remove acentos e passa para minúsculas (para buscas: "joao" acha "João"). */
export const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** A busca casa se todas as palavras do termo aparecem no texto. */
export function casaBusca(texto: string, termo: string): boolean {
  const alvo = semAcento(texto);
  return semAcento(termo)
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => alvo.includes(p));
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

/** Iniciais para o avatar: "Ana Barbiero" → "AB". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ý]/.test(p));
  const a = partes[0]?.[0] ?? "?";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase();
}
