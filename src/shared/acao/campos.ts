import { z } from "zod";

// Campos comuns dos formulários, já com as mensagens em português (heurística 9).
// Todos recebem string do FormData e devolvem o valor limpo.

const str = z.preprocess((v) => (v == null ? "" : String(v).trim()), z.string());

export const texto = (rotulo: string, { min = 1, max = 200 }: { min?: number; max?: number } = {}) =>
  str.pipe(
    z
      .string()
      .min(min, min <= 1 ? `Informe ${rotulo}.` : `${rotulo[0].toUpperCase() + rotulo.slice(1)} precisa de pelo menos ${min} caracteres.`)
      .max(max, `${rotulo[0].toUpperCase() + rotulo.slice(1)} pode ter no máximo ${max} caracteres.`),
  );

/** Texto livre opcional: vazio vira null. */
export const textoOpcional = (max = 500) =>
  str.pipe(z.string().max(max, `Use no máximo ${max} caracteres.`)).transform((v) => v || null);

export const email = str.pipe(
  z
    .string()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Informe um e-mail válido, por exemplo nome@gmail.com."),
);

/** URL http(s); sem "https://" o campo completa sozinho. */
export const url = str
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .pipe(z.url({ error: "Informe um link válido, começando com https://" }));

/** Identificador (uuid) vindo de campo oculto. */
export const id = str.pipe(z.string().min(1, "Registro não informado. Recarregue a página e tente de novo."));

export const inteiroOpcional = (rotulo: string, min: number, max: number) =>
  str
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(
      z
        .number({ error: `${rotulo} precisa ser um número.` })
        .int(`${rotulo} precisa ser um número inteiro.`)
        .min(min, `${rotulo} deve ficar entre ${min} e ${max}.`)
        .max(max, `${rotulo} deve ficar entre ${min} e ${max}.`)
        .nullable(),
    );

/** Número decimal opcional aceitando vírgula ("8,5"). */
export const decimalOpcional = (rotulo: string, min: number, max: number) =>
  str
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .pipe(
      z
        .number({ error: `${rotulo} precisa ser um número, por exemplo 8,5.` })
        .min(min, `${rotulo} deve ficar entre ${min} e ${max}.`)
        .max(max, `${rotulo} deve ficar entre ${min} e ${max}.`)
        .nullable(),
    );

/** Caixa de seleção: marcada = "on". */
export const caixa = z.preprocess((v) => v === "on" || v === "1" || v === "true", z.boolean());

/** "1" / "0" vindo de campo oculto. */
export const sim = z.preprocess((v) => v === "1", z.boolean());

/** Valor que precisa ser um dos itens de uma lista conhecida. */
export const umDe = <T extends string>(valores: readonly T[], mensagem: string) =>
  str.pipe(z.enum(valores as [T, ...T[]], { error: mensagem }));
