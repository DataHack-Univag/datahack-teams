import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Detecta queda de conexão (Wi-Fi do laboratório) e reenvia navegação e ações quando ela volta.
    useOffline: true,
  },
  // Endereços antigos (antes da reorganização das abas) continuam funcionando.
  async redirects() {
    return [
      { source: "/admin/participantes", destination: "/admin/pessoas?filtro=aluno", permanent: false },
      { source: "/admin/organizadores", destination: "/admin/pessoas?filtro=organizador", permanent: false },
      { source: "/admin/trocas", destination: "/admin/equipes/trocas", permanent: false },
      { source: "/admin/gerador", destination: "/admin/equipes/gerador", permanent: false },
      { source: "/admin/exportar", destination: "/admin/equipes/exportar", permanent: false },
    ];
  },
  turbopack: {
    // Raiz fixa: evita o Next usar o package-lock.json da pasta de cima.
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
