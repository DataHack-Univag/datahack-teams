// Adaptador da API pública do GitHub (só leitura, sem token).

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
