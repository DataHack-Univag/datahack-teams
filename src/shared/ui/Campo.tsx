import type { ComponentProps, ReactNode } from "react";

// Campos com rótulo sempre visível e dica logo abaixo (heurísticas 5 e 6).

type Base = { rotulo: string; dica?: ReactNode; className?: string; rotuloOculto?: boolean };

function Rotulo({ rotulo, oculto, obrigatorio }: { rotulo: string; oculto?: boolean; obrigatorio?: boolean }) {
  return (
    <span className={oculto ? "sr-only" : "rotulo"}>
      {rotulo}
      {obrigatorio === false ? <span className="ml-1 font-normal text-suave">(opcional)</span> : null}
    </span>
  );
}

function Dica({ children }: { children?: ReactNode }) {
  return children ? <span className="mt-1 block text-xs text-suave">{children}</span> : null;
}

export function Campo({ rotulo, dica, className = "", rotuloOculto, ...props }: Base & ComponentProps<"input">) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <Rotulo rotulo={rotulo} oculto={rotuloOculto} obrigatorio={props.required ? undefined : props.type === "checkbox" ? undefined : false} />
      <input {...props} className={`campo ${props.inputMode === "url" ? "font-mono text-sm" : ""}`} />
      <Dica>{dica}</Dica>
    </label>
  );
}

export function AreaTexto({ rotulo, dica, className = "", rotuloOculto, ...props }: Base & ComponentProps<"textarea">) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <Rotulo rotulo={rotulo} oculto={rotuloOculto} obrigatorio={props.required ? undefined : false} />
      <textarea rows={3} {...props} className="campo" />
      <Dica>{dica}</Dica>
    </label>
  );
}

export function Selecao({
  rotulo,
  dica,
  className = "",
  rotuloOculto,
  opcoes,
  vazio,
  ...props
}: Base & ComponentProps<"select"> & { opcoes: { valor: string; rotulo: string }[]; vazio?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <Rotulo rotulo={rotulo} oculto={rotuloOculto} />
      <select {...props} className="campo">
        {vazio !== undefined && (
          <option value="" disabled>
            {vazio}
          </option>
        )}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <Dica>{dica}</Dica>
    </label>
  );
}

export function CaixaMarcar({ rotulo, dica, className = "", ...props }: Base & ComponentProps<"input">) {
  return (
    <label className={`flex items-start gap-3 ${className}`}>
      <input type="checkbox" {...props} className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]" />
      <span className="text-sm">
        <strong className="font-semibold">{rotulo}</strong>
        {dica && <span className="block text-suave">{dica}</span>}
      </span>
    </label>
  );
}
