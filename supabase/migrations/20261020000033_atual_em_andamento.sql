-- =============================================================================
-- 033 · Edição atual = em andamento
-- -----------------------------------------------------------------------------
-- Virar a edição atual (por qualquer caminho, não só por "Tornar a edição atual") já
-- põe a edição em andamento, e a edição atual não volta para "em planejamento": para
-- isso, ela deixa de ser a atual antes. Quem já era atual e planejada (feita atual antes
-- da 031) continua como está até a organização decidir — nada muda sozinho aqui.
-- =============================================================================

create or replace function public.preparar_situacao_edicao()
returns trigger language plpgsql set search_path = public
as $$
declare
  virou_atual boolean := new.atual and (tg_op = 'INSERT' or not old.atual);
begin
  if new.situacao = 'cancelada' and new.atual then
    raise exception 'A edição atual não pode ser cancelada. Torne outra edição a atual antes.';
  end if;
  if virou_atual and new.situacao in ('planejada', 'inscricoes') then
    new.situacao := 'em_andamento';
  elsif new.atual and tg_op = 'UPDATE' and new.situacao = 'planejada' and old.situacao <> 'planejada' then
    raise exception 'A edição atual está acontecendo. Para voltar ao planejamento, deixe-a de ser a atual antes.';
  end if;
  if new.situacao = 'cancelada' and (tg_op = 'INSERT' or old.situacao is distinct from 'cancelada') then
    new.cancelada_em := now();
    new.motivo_cancelamento := btrim(new.motivo_cancelamento);
  elsif new.situacao <> 'cancelada' then
    new.motivo_cancelamento := null;
    new.cancelada_em := null;
  end if;
  return new;
end $$;
