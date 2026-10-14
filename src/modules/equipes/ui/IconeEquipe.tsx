import { iniciais } from "@/shared/lib/texto";

/** Ícone da equipe (emoji escolhido) ou as iniciais do nome, num círculo. */
export function IconeEquipe({ equipe, tamanho = "size-9 text-lg" }: { equipe: { nome: string; icone: string | null }; tamanho?: string }) {
  return (
    <span
      aria-hidden
      className={`${tamanho} flex shrink-0 items-center justify-center rounded-full border border-borda-forte bg-marca-fundo leading-none ${equipe.icone ? "" : "font-mono text-[0.6em] font-bold text-marca"}`}
    >
      {equipe.icone ?? iniciais(equipe.nome)}
    </span>
  );
}
