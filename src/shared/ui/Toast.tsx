"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Tom } from "@/shared/ui/Aviso";
import { Icone } from "@/shared/ui/Icone";

// Avisos rápidos no canto da tela (heurística 1: retorno imediato), com "Desfazer" quando a
// ação permite (heurística 3). Ficam numa região aria-live para leitores de tela.

type Acao = { rotulo: string; executar: () => void | Promise<void> };
type Item = { id: number; texto: string; tom: Tom; acao?: Acao };
type Mostrar = (texto: string, opcoes?: { tom?: Tom; acao?: Acao; segundos?: number }) => void;

const Contexto = createContext<Mostrar>(() => {});

export const useToast = () => useContext(Contexto);

const ICONE = { sucesso: "ok", erro: "erro", alerta: "alerta", info: "info", neutro: "info" } as const;

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const seq = useRef(0);
  const tirar = useCallback((id: number) => setItens((xs) => xs.filter((x) => x.id !== id)), []);

  const mostrar = useCallback<Mostrar>(
    (texto, { tom = "sucesso", acao, segundos } = {}) => {
      const id = ++seq.current;
      setItens((xs) => [...xs.slice(-2), { id, texto, tom, acao }]);
      // Com "Desfazer", fica mais tempo na tela para dar tempo de reagir.
      setTimeout(() => tirar(id), (segundos ?? (acao ? 8 : 4.5)) * 1000);
    },
    [tirar],
  );

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto flex max-w-md flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4"
      >
        {itens.map((t) => (
          <div
            key={t.id}
            role={t.tom === "erro" ? "alert" : "status"}
            className="destaque-grad pointer-events-auto flex items-center gap-3 rounded-2xl p-3 shadow-lg"
            style={{ animation: "dh-sobe .3s both" }}
          >
            <span
              aria-hidden
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-white ${
                t.tom === "erro" ? "bg-red-500" : t.tom === "alerta" ? "bg-amber-500" : "bg-emerald-500"
              }`}
            >
              <Icone nome={ICONE[t.tom]} className="size-4" />
            </span>
            <p className="min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere]">{t.texto}</p>
            {t.acao && (
              <button
                type="button"
                className="btn-secundario min-h-9 shrink-0 px-3 text-xs"
                onClick={async () => {
                  tirar(t.id);
                  await t.acao!.executar();
                }}
              >
                <Icone nome="desfazer" className="size-4" />
                {t.acao.rotulo}
              </button>
            )}
            <button type="button" onClick={() => tirar(t.id)} className="shrink-0 text-suave hover:text-foreground" aria-label="Fechar aviso">
              <Icone nome="fechar" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

/**
 * Mostra um aviso vindo da URL (ex.: depois de salvar a ficha e voltar para a lista)
 * e limpa o parâmetro para o aviso não voltar ao recarregar.
 */
const MENSAGENS_URL: Record<string, (v: string) => string> = {
  salvo: (v) => `Ficha salva: ${v}`,
  excluida: () => "Equipe excluída.",
};

export function ToastDaUrl() {
  const params = useSearchParams();
  const router = useRouter();
  const caminho = usePathname();
  const mostrar = useToast();
  const chave = useMemo(() => Object.keys(MENSAGENS_URL).find((k) => params.has(k)), [params]);

  useEffect(() => {
    if (!chave) return;
    mostrar(MENSAGENS_URL[chave](params.get(chave) ?? ""));
    const resto = new URLSearchParams(params);
    resto.delete(chave);
    router.replace(resto.size ? `${caminho}?${resto}` : caminho, { scroll: false });
  }, [chave, params, router, caminho, mostrar]);

  return null;
}
