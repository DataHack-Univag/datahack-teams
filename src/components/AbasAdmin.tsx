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
    <nav className="relative z-10 border-b border-borda bg-superficie">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        {ABAS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativa(a.href) ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition ${
              ativa(a.href) ? "border-marca text-marca" : "border-transparent text-suave hover:text-foreground"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>
    </nav>
  );
}
