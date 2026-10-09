-- =============================================================================
-- DataHack Univag 2026 — Migração 004: trava na troca de líder
-- Rodar no SQL Editor DEPOIS do 003_lider_e_permissoes.sql (pode rodar de novo).
--
--   - Equipe sem líder: qualquer integrante pode definir o líder.
--   - Equipe com líder: só o próprio líder pode passar a liderança para outra pessoa.
--   - Organizadores podem sempre definir, trocar ou tirar o líder.
-- =============================================================================

create or replace function public.checar_lider()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- O líder precisa ser integrante da própria equipe.
  if new.lider_email is not null and not exists (
    select 1 from membros where email = new.lider_email and equipe_id = new.id
  ) then
    raise exception 'O líder precisa ser integrante da equipe.';
  end if;

  -- Trava: depois de definido, só o líder atual (ou a organização) troca o líder.
  if tg_op = 'UPDATE'
     and new.lider_email is distinct from old.lider_email
     and old.lider_email is not null
     and not eh_organizador()
     and old.lider_email <> email_atual() then
    raise exception 'Só o líder atual pode passar a liderança para outra pessoa.';
  end if;

  return new;
end $$;

-- O trigger lider_e_integrante (migração 003) já usa esta função; recria por garantia.
drop trigger if exists lider_e_integrante on public.equipes;
create trigger lider_e_integrante
  before insert or update of lider_email on public.equipes
  for each row execute function public.checar_lider();
