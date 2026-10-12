// Monta o ranking e os resumos por equipe a partir das fichas (regra pura, sem banco).

import { nomeNivel } from "./bancas";
import { compararRanking, consolidarEquipe, notaFicha, type ResultadoEquipe } from "./nota";
import type { Regulamento } from "./regulamento";
import type { EquipeAvaliada, Ficha } from "./tipos";

export type LinhaRanking = {
  posicao: number;
  equipe: EquipeAvaliada;
  fichas: Ficha[];
  /** ids das penalidades aplicadas */
  penalidades: string[];
  resultado: ResultadoEquipe;
};

/** Classifica as equipes (nota final + desempate do regulamento). */
export function montarRanking(
  reg: Regulamento,
  equipes: EquipeAvaliada[],
  fichas: Ficha[],
  penalidades: Map<string, string[]>,
): LinhaRanking[] {
  return equipes
    .map((equipe) => {
      const daEquipe = fichas.filter((f) => f.equipe_id === equipe.id);
      const pens = penalidades.get(equipe.id) ?? [];
      return { equipe, fichas: daEquipe, penalidades: pens, resultado: consolidarEquipe(reg, daEquipe, pens), posicao: 0 };
    })
    .sort((a, b) => compararRanking(a.resultado, b.resultado))
    .map((l, i) => ({ ...l, posicao: i + 1 }));
}

// ---------------------------------------------------------------- resumo para o quadro geral (tela da organização)

export type FichaResumo = { avaliador: string; nota: number; niveis: Record<string, string> };

/** Uma rubrica dentro da fase: ex.: pitch (professores) ou mesa (organização). */
export type ParteResumo = {
  id: string;
  curto: string;
  nome: string;
  bancaTexto: string;
  peso: number;
  media: number | null;
  pontos: number | null;
  completa: boolean;
  criterios: { id: string; nome: string; peso: number; media: number | null }[];
  fichas: FichaResumo[];
};

export type FaseResumo = {
  id: string;
  nome: string;
  peso: number;
  /** 0–100, juntando as partes pelos pesos (null = nenhuma parte avaliada). */
  nota: number | null;
  pontos: number;
  completa: boolean;
  partes: ParteResumo[];
};

export type EquipeResumoNota = {
  id: string;
  nome: string;
  posicao: number;
  final: number;
  completa: boolean;
  penalidades: { texto: string; pontos: number }[];
  fases: FaseResumo[];
};

export function resumirParaQuadro(reg: Regulamento, linhas: LinhaRanking[]): EquipeResumoNota[] {
  return linhas.map(({ equipe, fichas, penalidades, resultado: r, posicao }) => ({
    id: equipe.id,
    nome: equipe.nome,
    posicao,
    final: r.final,
    completa: r.completa,
    penalidades: penalidades.map((id) => {
      const p = reg.penalidades.find((x) => x.id === id);
      return { texto: p?.texto ?? id, pontos: p?.pontos ?? 0 };
    }),
    fases: reg.fases.map((fa) => ({
      id: fa.id,
      nome: fa.nome,
      peso: fa.peso,
      nota: r.fases[fa.id].nota,
      pontos: r.fases[fa.id].pontos,
      completa: r.fases[fa.id].completa,
      partes: reg.rubricas.filter((rb) => fa.partes.includes(rb.id)).map((rb) => {
        const x = r.rubricas[rb.id];
        return {
          id: rb.id,
          curto: rb.curto,
          nome: rb.nome,
          bancaTexto: rb.bancaTexto,
          peso: rb.pesoFinal,
          media: x.nota,
          pontos: x.nota === null ? null : (rb.pesoFinal * x.nota) / 100,
          completa: x.completa,
          criterios: rb.criterios.map((c) => ({ id: c.id, nome: c.nome, peso: c.peso, media: x.mediaCriterio[c.id] })),
          fichas: fichas
            .filter((f) => f.rubrica === rb.id)
            .map((f) => ({
              avaliador: f.quem?.nome ?? f.avaliador,
              nota: notaFicha(rb, f.notas ?? {}),
              niveis: Object.fromEntries(rb.criterios.map((c) => [c.id, nomeNivel(reg, f.notas?.[c.id])])),
            })),
        };
      }),
    })),
  }));
}

// ---------------------------------------------------------------- andamento: quem já avaliou o quê

export type Andamento = {
  rubrica: string;
  curto: string;
  bancaTexto: string;
  /** equipes com pelo menos uma ficha completa nesta rubrica */
  completas: number;
  /** equipes com ficha começada mas incompleta */
  incompletas: number;
  total: number;
  avaliadores: number;
};

export function andamentoPorRubrica(reg: Regulamento, equipes: EquipeAvaliada[], fichas: Ficha[]): Andamento[] {
  return reg.rubricas.map((rb) => {
    const daRubrica = fichas.filter((f) => f.rubrica === rb.id);
    let completas = 0;
    let incompletas = 0;
    for (const e of equipes) {
      const fs = daRubrica.filter((f) => f.equipe_id === e.id);
      if (fs.some((f) => rb.criterios.every((c) => typeof f.notas?.[c.id] === "number"))) completas++;
      else if (fs.length) incompletas++;
    }
    return {
      rubrica: rb.id,
      curto: rb.curto,
      bancaTexto: rb.bancaTexto,
      completas,
      incompletas,
      total: equipes.length,
      avaliadores: new Set(daRubrica.map((f) => f.avaliador)).size,
    };
  });
}
