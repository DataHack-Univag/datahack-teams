import { caixa, type Elemento, type Sala } from "./tipos";

// Equipes no mapa: cada equipe ocupa um lugar (1..lugares) de uma bancada ou mesa.

export type Alocacao = { equipe_id: string; elemento_id: string; lugar: number };
export type EquipeNoMapa = { id: string; nome: string; icone: string | null };
/** Por elemento, quem está em cada lugar (índice 0 = lugar 1; null = livre). */
export type Ocupacao = Record<string, (EquipeNoMapa | null)[]>;

/** Divide a bancada em lugares iguais ao longo do lado mais comprido (como ela aparece). */
export function lugaresDoElemento(e: Elemento) {
  const c = caixa(e);
  const n = e.lugares ?? 0;
  const deitado = c.largura >= c.profundidade;
  return Array.from({ length: n }, (_, i) => ({
    lugar: i + 1,
    x: deitado ? c.x + (c.largura / n) * i : c.x,
    y: deitado ? c.y : c.y + (c.profundidade / n) * i,
    largura: deitado ? c.largura / n : c.largura,
    profundidade: deitado ? c.profundidade : c.profundidade / n,
  }));
}

/** Quem está em cada lugar de cada bancada (só elementos ativos com lugares). */
export function ocupacao(elementos: Elemento[], alocacoes: Alocacao[], equipes: EquipeNoMapa[]): Ocupacao {
  const porId = new Map(equipes.map((e) => [e.id, e]));
  const mapa: Ocupacao = {};
  for (const e of elementos) if (e.lugares) mapa[e.id] = Array.from({ length: e.lugares }, () => null);
  for (const a of alocacoes) {
    const lugares = mapa[a.elemento_id];
    const equipe = porId.get(a.equipe_id);
    if (lugares && equipe && a.lugar <= lugares.length) lugares[a.lugar - 1] = equipe;
  }
  return mapa;
}

/** Onde cada equipe está: "Lab 1 · B2" (e o lugar, quando a bancada tem mais de um). */
export function locaisDasEquipes(salas: Pick<Sala, "id" | "nome">[], elementos: Elemento[], alocacoes: Alocacao[]): Record<string, string> {
  const sala = new Map(salas.map((s) => [s.id, s.nome]));
  const el = new Map(elementos.map((e) => [e.id, e]));
  const locais: Record<string, string> = {};
  for (const a of alocacoes) {
    const e = el.get(a.elemento_id);
    if (!e || !sala.has(e.sala_id)) continue;
    locais[a.equipe_id] = `${sala.get(e.sala_id)} · ${e.rotulo ?? "bancada"}${(e.lugares ?? 1) > 1 ? ` (lugar ${a.lugar})` : ""}`;
  }
  return locais;
}
