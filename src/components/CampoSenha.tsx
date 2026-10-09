"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";

type CampoSenhaProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function CampoSenha({ label, className, ...props }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  const id = useId();

  return (
    <label className="block">
      <span className="rotulo">{label}</span>
      <span className="relative block">
        <input
          {...props}
          id={id}
          type={visivel ? "text" : "password"}
          className={`campo pr-12${className ? ` ${className}` : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-suave transition hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            {visivel ? (
              <>
                <path d="M3 3l18 18" strokeLinecap="round" />
                <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" strokeLinecap="round" />
                <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.2 0 8.4 4 9.5 6a11.8 11.8 0 0 1-3.1 3.7M6.2 6.2C4.1 7.5 2.9 9.4 2.5 10c1.1 2 4.3 6 9.5 6 1 0 1.9-.1 2.7-.4" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <>
                <path d="M2.5 10s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="10" r="2.3" />
              </>
            )}
          </svg>
        </button>
      </span>
    </label>
  );
}
