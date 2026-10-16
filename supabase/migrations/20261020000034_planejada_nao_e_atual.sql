-- =============================================================================
-- 034 · Edição em planejamento (ou cancelada) nunca é a atual
-- -----------------------------------------------------------------------------
-- A atual é a que está acontecendo. Uma edição planejada que tinha virado atual (antes da
-- 031/033) deixa de ser: sem atual, o login e o sistema mostram a última encerrada (032).
-- Daqui em diante o banco não aceita "atual + planejada/cancelada": tornar atual já põe
-- em andamento (033), e a atual não volta ao planejamento.
-- =============================================================================

update public.edicoes set atual = false where atual and situacao in ('planejada', 'inscricoes', 'cancelada');

alter table public.edicoes drop constraint if exists edicoes_atual_acontecendo;
alter table public.edicoes add constraint edicoes_atual_acontecendo
  check (not atual or situacao in ('em_andamento', 'encerrada'));
