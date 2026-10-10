"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Rótulo exibido acima do campo. */
  label: string;
};

/** Campo de senha com o "olhinho" para mostrar/esconder o que foi digitado. */
export function CampoSenha({ label, className = "", ...props }: Props) {
  const [visivel, setVisivel] = useState(false);

  return (
    <label className="block">
      <span className="rotulo">{label}</span>
      <span className="relative block">
        <input {...props} type={visivel ? "text" : "password"} className={`campo pr-12 ${className}`} />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-suave hover:text-foreground"
          aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={visivel}
          title={visivel ? "Esconder senha" : "Mostrar senha"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            aria-hidden
          >
            {visivel ? (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c5 0 9 4.5 10 8a12.6 12.6 0 0 1-3.2 4.6M6.1 6.1A12.5 12.5 0 0 0 2 12c1 3.5 5 8 10 8 1.7 0 3.3-.5 4.7-1.3" />
              </>
            ) : (
              <>
                <path d="M2 12c1-3.5 5-8 10-8s9 4.5 10 8c-1 3.5-5 8-10 8S3 15.5 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </span>
    </label>
  );
}
