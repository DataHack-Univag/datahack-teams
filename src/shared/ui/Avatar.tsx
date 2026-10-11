import { iniciais } from "@/shared/lib/texto";

export function Avatar({ nome, foto, tamanho = "size-9" }: { nome: string; foto?: string | null; tamanho?: string }) {
  if (foto)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" className={`${tamanho} shrink-0 rounded-full`} referrerPolicy="no-referrer" />;
  return (
    <span
      aria-hidden
      className={`${tamanho} flex shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white`}
      style={{ background: "var(--grad)" }}
    >
      {iniciais(nome)}
    </span>
  );
}
