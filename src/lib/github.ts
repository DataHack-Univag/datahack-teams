// Normalização e verificação de URLs de repositório GitHub.

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

/**
 * Consulta a API pública do GitHub (no servidor) para saber se o repositório é público.
 * Devolve null se não foi possível verificar (limite de requisições, rede).
 */
export async function repoEhPublico(url: string): Promise<boolean | null> {
  const caminho = url.replace("https://github.com/", "");
  try {
    const r = await fetch(`https://api.github.com/repos/${caminho}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "datahack-teams" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (r.status === 200) {
      const j = (await r.json()) as { private?: boolean };
      return j.private === false;
    }
    if (r.status === 404) return false; // inexistente ou privado
    return null;
  } catch {
    return null;
  }
}
