"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/admin", rotulo: "Equipes" },
  { href: "/admin/participantes", rotulo: "Participantes" },
  { href: "/admin/gerador", rotulo: "Gerador de equipes" },
  { href: "/admin/materiais", rotulo: "Materiais" },
  { href: "/admin/organizadores", rotulo: "Organizadores" },
];

// Navegação da área da organização (rolagem horizontal no celular).
export function AbasAdmin() {
  const caminho = usePathname();
  const ativa = (href: string) =>
    href === "/admin" ? caminho === "/admin" || caminho.startsWith("/admin/equipes") : caminho.startsWith(href);

  return (
    <nav className="relative z-10 border-b border-borda bg-[color-mix(in_srgb,var(--background)_55%,transparent)] backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        {ABAS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativa(a.href) ? "page" : undefined}
            className={`relative shrink-0 px-3 py-3 text-sm font-semibold whitespace-nowrap transition ${
              ativa(a.href) ? "text-foreground" : "text-suave hover:text-foreground"
            }`}
          >
            {a.rotulo}
            {ativa(a.href) && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--grad)" }} />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
