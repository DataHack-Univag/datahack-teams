// Ícones de traço (24×24), sempre ao lado de um texto: nunca são a única pista (heurística 6).

const CAMINHOS = {
  painel: "M4 13h6V4H4zm10 7h6v-9h-6zM4 20h6v-3H4zm10-13h6V4h-6z",
  pessoas: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8",
  equipe: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  trocas: "M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  materiais: "M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM14 3v5h5M8 13h8M8 17h5",
  avaliacao: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  ranking: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3",
  ajuda: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
  mais: "M5 12h.01M12 12h.01M19 12h.01",
  sair: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  olho: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  busca: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  fechar: "M6 6l12 12M18 6 6 18",
  ok: "M20 6 9 17l-5-5",
  alerta: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0M12 9v4M12 17h.01",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 16v-4M12 8h.01",
  erro: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M15 9l-6 6M9 9l6 6",
  voltar: "M15 18l-6-6 6-6",
  avancar: "M9 18l6-6-6-6",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  github: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.6 16 2.5a13.4 13.4 0 0 0-7 0C6.3.6 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V22",
  teclado: "M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
  desfazer: "M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13",
  estrela: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  baixar: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  mais_novo: "M12 5v14M5 12h14",
  lixo: "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
  editar: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  sino: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  cadeado: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  relogio: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2",
  telao: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  gerador: "M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 8.8h6.1z",
  mapa: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  girar: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  copiar: "M9 9h11v11H9zM5 15H4V4h11v1",
  imagem: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01",
  instituicao: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-5h6v5M9 12h.01M15 12h.01",
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, className = "size-5", rotulo }: { nome: NomeIcone; className?: string; rotulo?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={rotulo ? undefined : true}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
