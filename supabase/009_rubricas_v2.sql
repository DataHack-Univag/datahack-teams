-- =============================================================================
-- DataHack Univag 2026 — Migração 009: rubricas v2 (docs/cronograma_rubrica_v2.html)
-- Rodar no SQL Editor DEPOIS do 008_avaliacao.sql (pode rodar de novo).
--
--   Fase 1 = F1_PITCH (6%, banca de professores) + F1_MESA (9%, organizadores)
--   Fase 2 = F2_PITCH (8%, banca de professores) + F2_MESA (12%, organizadores)
--   Fase 3 = F3_REPO (25%, organizadores)
--   Negócio = NEG (40%, jurados de negócio)
--
--   Papéis: avaliador_tecnico = banca de professores (pitches F1/F2, visão macro);
--           avaliador_negocio = jurados do pitch final; organizador = mesa F1/F2 e F3
--           (e pode lançar qualquer rubrica).
--
-- ATENÇÃO: apaga as fichas das rubricas antigas TEC_F1/TEC_F2/TEC_F3 (v1), que não
-- existem mais na v2. As fichas NEG continuam (mesma rubrica).
-- =============================================================================

delete from public.avaliacoes where rubrica in ('TEC_F1', 'TEC_F2', 'TEC_F3');

alter table public.avaliacoes drop constraint if exists avaliacoes_rubrica_check;
alter table public.avaliacoes add constraint avaliacoes_rubrica_check
  check (rubrica in ('F1_PITCH', 'F1_MESA', 'F2_PITCH', 'F2_MESA', 'F3_REPO', 'NEG'));

create or replace function public.pode_avaliar(p_rubrica text)
returns boolean language sql stable security definer set search_path = public
as $$
  select eh_organizador()
      or (
        not coalesce((select avaliacao_encerrada from configuracao where id = 1), false)
        and (
          (papel_atual() = 'avaliador_tecnico' and p_rubrica in ('F1_PITCH', 'F2_PITCH'))
          or (papel_atual() = 'avaliador_negocio' and p_rubrica = 'NEG')
        )
      )
$$;
