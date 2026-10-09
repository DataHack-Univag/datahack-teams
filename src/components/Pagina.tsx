// Container padrão das páginas da organização (o gerador usa a largura toda).
export function Pagina({ children, estreita = false }: { children: React.ReactNode; estreita?: boolean }) {
  return (
    <div className={`mx-auto w-full space-y-6 px-4 py-6 sm:py-8 ${estreita ? "max-w-3xl" : "max-w-6xl"}`}>
      {children}
    </div>
  );
}
