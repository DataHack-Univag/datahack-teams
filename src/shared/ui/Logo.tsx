import Image from "next/image";

// Logo do DATAHack Univag. O texto "DATA" é branco, então vai sempre sobre a placa azul-marinho.
export function Logo({ className = "w-32" }: { className?: string }) {
  return (
    <span className={`block rounded-lg bg-[#000b38] px-2 py-1 ring-1 ring-cyan-400/25 ${className}`}>
      <Image src="/logo-datahack.png" alt="DATAHack Univag" width={700} height={233} priority className="h-auto w-full" />
    </span>
  );
}
