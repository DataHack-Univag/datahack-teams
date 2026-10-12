// Paridade da migração 010: o ranking calculado a partir do banco NOVO (regulamento e notas por
// critério nas tabelas) tem que ser idêntico ao calculado pelo código antigo sobre o banco antigo
// (gabarito em supabase/teste/gabarito_ranking.json).
// Só roda com o Postgres local de teste: PARIDADE_DB=datahack_teams_teste PSQL=<caminho do psql>.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { montarRanking } from "./consolidacao";
import { regulamentoDoCanonico, type RegulamentoCanonico } from "./regulamento";
import type { Ficha, Notas } from "./tipos";

const banco = process.env.PARIDADE_DB;

function consultar<T>(sql: string): T {
  const saida = execFileSync(process.env.PSQL ?? "psql", ["-d", banco!, "-At", "-c", `select coalesce(json_agg(t), '[]') from (${sql}) t`], {
    encoding: "utf8",
  });
  return JSON.parse(saida) as T;
}

describe.skipIf(!banco)("paridade com o cálculo anterior às edições", () => {
  it("mesma nota final, posição, rubricas, fases e desempate em todas as equipes", () => {
    const edicao = consultar<{ id: string }[]>("select id from edicoes where numero = 1")[0].id;
    const [{ reg: canonico }] = consultar<{ reg: RegulamentoCanonico }[]>(`select exportar_regulamento('${edicao}') as reg`);
    const reg = regulamentoDoCanonico(canonico);

    const equipes = consultar<{ id: string; nome: string }[]>(`select id, nome from equipes where edicao_id = '${edicao}' order by nome`);
    const linhasFicha = consultar<{ id: string; equipe_id: string; avaliador: string; rubrica: string; atualizado_em: string; criterio: string | null; fator: number | null }[]>(
      `select f.id, f.equipe_id, f.avaliador, r.codigo as rubrica, f.atualizado_em::text, c.codigo as criterio, n.fator
         from fichas f join rubricas r on r.id = f.rubrica_id
         left join notas_criterio nc on nc.ficha_id = f.id left join criterios c on c.id = nc.criterio_id
         left join niveis n on n.id = nc.nivel_id
        where f.edicao_id = '${edicao}' and f.removido_em is null`,
    );
    const fichas = new Map<string, Ficha>();
    for (const l of linhasFicha) {
      const f = fichas.get(l.id) ?? { id: l.id, equipe_id: l.equipe_id, avaliador: l.avaliador, rubrica: l.rubrica, notas: {} as Notas, comentario: null, atualizado_em: l.atualizado_em };
      if (l.criterio && l.fator !== null) f.notas[l.criterio] = Number(l.fator);
      fichas.set(l.id, f);
    }
    const pens = consultar<{ equipe_id: string; codigo: string }[]>(
      `select pe.equipe_id, p.codigo from penalidades_equipe pe join penalidades p on p.id = pe.penalidade_id where pe.removido_em is null`,
    );
    const mapa = new Map<string, string[]>();
    for (const p of pens) mapa.set(p.equipe_id, [...(mapa.get(p.equipe_id) ?? []), p.codigo]);

    const linhas = montarRanking(reg, equipes.map((e) => ({ ...e, integrantes: [] })), [...fichas.values()], mapa);
    const gabarito = JSON.parse(readFileSync("supabase/teste/gabarito_ranking.json", "utf8")) as {
      posicao: number;
      equipe: string;
      final: number;
      penalidades: number;
      completa: boolean;
      desempate: number[];
      rubricas: Record<string, { nota: number | null; avaliadores: number; completa: boolean; mediaCriterio: Record<string, number | null> }>;
      fases: Record<string, { nota: number | null; pontos: number; completa: boolean }>;
    }[];

    expect(linhas).toHaveLength(gabarito.length);
    linhas.forEach((l, i) => {
      const g = gabarito[i];
      expect(l.equipe.id).toBe(g.equipe);
      expect(l.posicao).toBe(g.posicao);
      expect(l.resultado.final).toBeCloseTo(g.final, 9);
      expect(l.resultado.penalidades).toBe(g.penalidades);
      expect(l.resultado.completa).toBe(g.completa);
      l.resultado.desempate.forEach((v, k) => expect(v).toBeCloseTo(g.desempate[k], 9));
      for (const [rid, r] of Object.entries(g.rubricas)) {
        const n = l.resultado.rubricas[rid];
        expect(n.avaliadores).toBe(r.avaliadores);
        expect(n.completa).toBe(r.completa);
        if (r.nota === null) expect(n.nota).toBeNull();
        else expect(n.nota).toBeCloseTo(r.nota, 9);
        for (const [cid, m] of Object.entries(r.mediaCriterio)) {
          if (m === null) expect(n.mediaCriterio[cid]).toBeNull();
          else expect(n.mediaCriterio[cid]).toBeCloseTo(m, 9);
        }
      }
      for (const [fid, f] of Object.entries(g.fases)) {
        expect(l.resultado.fases[fid].pontos).toBeCloseTo(f.pontos, 9);
        expect(l.resultado.fases[fid].completa).toBe(f.completa);
      }
    });
  });
});
