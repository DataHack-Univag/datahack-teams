"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { casaBusca } from "@/shared/lib/texto";
import { Avatar } from "@/shared/ui/Avatar";
import { Icone } from "@/shared/ui/Icone";

export type OpcaoPessoa = { email: string; nome: string; detalhe?: string };

/**
 * Escolher pessoas de uma lista, no lugar do <datalist> do navegador:
 *  - abre ao clicar e filtra enquanto digita, sem acento (heurísticas 6 e 7);
 *  - escolhidos viram chips com "x" para tirar (heurística 3) e somem da lista;
 *  - teclado: setas, Enter escolhe, Esc fecha, Backspace no campo vazio tira o último;
 *  - se alguém escolhido deixa de estar livre (entrou em outra equipe na atualização
 *    automática), sai dos chips com um aviso (heurística 1).
 * Envia um campo oculto `name` por pessoa escolhida (o e-mail).
 */
export function EscolherPessoas({
  name,
  rotulo,
  opcoes,
  maximo,
  dica,
  placeholder = "Clique e digite um nome…",
  vazio = "Ninguém disponível.",
  className = "",
}: {
  name: string;
  rotulo: string;
  opcoes: OpcaoPessoa[];
  maximo: number;
  dica?: string;
  placeholder?: string;
  /** Texto quando não há ninguém livre para escolher. */
  vazio?: string;
  className?: string;
}) {
  const id = useId();
  const [escolhidos, setEscolhidos] = useState<OpcaoPessoa[]>([]);
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [saiu, setSaiu] = useState<OpcaoPessoa[]>([]);
  const campo = useRef<HTMLInputElement>(null);

  const porEmail = useMemo(
    () => new Map(opcoes.map((o) => [o.email, o])),
    [opcoes],
  );

  // Quem foi escolhido mas não está mais livre (convidado por outra equipe) sai da seleção.
  useEffect(() => {
    const fora = escolhidos.filter((e) => !porEmail.has(e.email));
    if (!fora.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com a lista atualizada pelo servidor
    setEscolhidos((atual) => atual.filter((e) => porEmail.has(e.email)));
    setSaiu(fora);
  }, [porEmail, escolhidos]);

  const filtradas = useMemo(
    () =>
      opcoes
        .filter((o) => !escolhidos.some((e) => e.email === o.email))
        .filter(
          (o) =>
            !termo.trim() ||
            casaBusca(`${o.nome} ${o.detalhe ?? ""} ${o.email}`, termo),
        )
        .slice(0, 50),
    [opcoes, escolhidos, termo],
  );
  const cheio = escolhidos.length >= maximo;
  const idAtivo = aberto && filtradas[ativo] ? `${id}-op-${ativo}` : undefined;

  // Mantém a opção ativa visível ao navegar com as setas.
  useEffect(() => {
    if (idAtivo)
      document.getElementById(idAtivo)?.scrollIntoView({ block: "nearest" });
  }, [idAtivo]);

  function escolher(o: OpcaoPessoa) {
    setEscolhidos((atual) =>
      atual.some((e) => e.email === o.email) || atual.length >= maximo
        ? atual
        : [...atual, o],
    );
    setTermo("");
    setAtivo(0);
    setSaiu([]);
    if (escolhidos.length + 1 >= maximo) setAberto(false);
    campo.current?.focus();
  }

  function tirar(email: string) {
    setEscolhidos((atual) => atual.filter((e) => e.email !== email));
    campo.current?.focus();
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={`${id}-campo`} className="rotulo">
        {rotulo}
      </label>
      <div
        className="campo flex min-h-12 cursor-text flex-wrap items-center gap-1.5 !py-1.5 focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/30"
        onClick={() => {
          campo.current?.focus();
          if (!cheio) setAberto(true);
        }}
      >
        {escolhidos.map((p) => {
          const email = p.email;
          return (
            <span
              key={email}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-borda-forte bg-marca-fundo py-0.5 pr-1 pl-0.5 text-sm"
            >
              <Avatar nome={p.nome} tamanho="size-6" />
              <span className="truncate">{p.nome}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  tirar(email);
                }}
                className="rounded-full p-0.5 text-suave hover:bg-borda hover:text-foreground"
                aria-label={`Tirar ${p.nome}`}
              >
                <Icone nome="fechar" className="size-3.5" />
              </button>
              <input type="hidden" name={name} value={email} />
            </span>
          );
        })}
        <input
          ref={campo}
          id={`${id}-campo`}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={`${id}-lista`}
          aria-activedescendant={idAtivo}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={cheio}
          value={termo}
          placeholder={
            cheio
              ? maximo === 1
                ? ""
                : `Limite de ${maximo} atingido`
              : escolhidos.length
                ? "Adicionar mais…"
                : placeholder
          }
          className="min-w-32 flex-1 bg-transparent py-1 outline-none placeholder:text-suave disabled:cursor-default"
          onFocus={() => !cheio && setAberto(true)}
          onBlur={() => setAberto(false)}
          onChange={(e) => {
            setTermo(e.target.value);
            setAtivo(0);
            setAberto(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAberto(true);
              setAtivo((a) =>
                Math.min(a + 1, Math.max(0, filtradas.length - 1)),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAtivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              // Enter escolhe da lista em vez de enviar o formulário.
              if (aberto && filtradas[ativo]) {
                e.preventDefault();
                escolher(filtradas[ativo]);
              } else if (termo.trim()) e.preventDefault();
            } else if (e.key === "Escape") {
              setAberto(false);
            } else if (e.key === "Backspace" && !termo && escolhidos.length) {
              tirar(escolhidos[escolhidos.length - 1].email);
            }
          }}
        />
      </div>

      {/* A lista abre no fluxo da página (empurra o conteúdo): nunca é cortada pelo cartão nem sai da tela no celular. */}
      {aberto && !cheio && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          aria-label={rotulo}
          className="mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-borda-forte bg-superficie-solida p-1 shadow-lg"
        >
          {filtradas.length ? (
            filtradas.map((o, i) => (
              <li
                key={o.email}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={i === ativo}
                // mousedown (e não click) para escolher antes do blur fechar a lista.
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(o);
                }}
                onMouseEnter={() => setAtivo(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${i === ativo ? "bg-marca-fundo" : ""}`}
              >
                <Avatar nome={o.nome} tamanho="size-8" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {o.nome}
                  </span>
                  {o.detalhe && (
                    <span className="block truncate text-xs text-suave">
                      {o.detalhe}
                    </span>
                  )}
                </span>
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-sm text-suave">
              {opcoes.length && termo.trim()
                ? `Ninguém livre com “${termo.trim()}”.`
                : vazio}
            </li>
          )}
        </ul>
      )}

      <p className="mt-1 text-xs text-suave" aria-live="polite">
        {saiu.length
          ? `${saiu.map((e) => e.nome).join(", ")} ${saiu.length > 1 ? "acabaram" : "acabou"} de entrar em outra equipe (ou receber convite) e saiu da sua escolha.`
          : maximo > 1
            ? `${escolhidos.length} de ${maximo} escolhido(s).${dica ? ` ${dica}` : ""}`
            : dica}
      </p>
    </div>
  );
}
