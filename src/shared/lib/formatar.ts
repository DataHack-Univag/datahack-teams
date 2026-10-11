// Formatação para a tela, sempre no fuso do evento (Cuiabá) e em português (heurística 2).

const FUSO = "America/Cuiaba";

/** "sáb, 14:32" — para registros do dia do evento. */
export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso)
    .toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: FUSO })
    .replace(".", "");
}

/** "10/10 às 14:32" — quando o dia importa. */
export function dataCompleta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
  return `${dia} às ${hora}`;
}

/** "14:32" */
export function hora(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
}

/** Nota com vírgula ("78,5"); null vira "—". */
export function nota(v: number | null | undefined, casas = 1): string {
  return v === null || v === undefined || Number.isNaN(v) ? "—" : v.toFixed(casas).replace(".", ",");
}

/** "1 integrante" / "3 integrantes". */
export function plural(n: number, singular: string, pluralForma = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}
