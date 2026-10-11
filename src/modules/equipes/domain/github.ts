// Normalização de URLs de repositório GitHub (regra pura; a consulta ao GitHub fica em infra/github.ts).

const REGEX_REPO = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Aceita "github.com/user/repo", ".git", barra final, etc. e devolve a URL canônica ou null. */
export function normalizarRepo(entrada: string): string | null {
  let url = entrada.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  url = url.replace(/^http:\/\//i, "https://").replace(/^https:\/\/www\./i, "https://");
  url = url.split(/[?#]/)[0].replace(/\/+$/, "").replace(/\.git$/i, "");
  // Corta caminhos extras como /tree/main.
  const m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)/i);
  if (!m) return null;
  url = `https://github.com/${m[1]}/${m[2]}`;
  return REGEX_REPO.test(url) ? url : null;
}
