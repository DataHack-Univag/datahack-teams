-- =============================================================================
-- DataHack Univag 2026 — Migração 003: líder da equipe e composição só pela organização
-- Rodar no SQL Editor DEPOIS do 002_organizacao.sql (pode rodar de novo sem problema).
--
--   - Aluno NÃO adiciona nem remove integrantes (nem sai da equipe): só vê.
--     Quem monta as equipes é a organização (gerador ou manualmente).
--   - Aluno sem equipe não cria equipe: aguarda a organização.
--   - Cada equipe pode ter um líder, escolhido por qualquer integrante (ou organizador).
--   - Nome, repositório e links continuam editáveis pelos integrantes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Líder da equipe
-- -----------------------------------------------------------------------------
alter table public.equipes
  add column if not exists lider_email text
  references public.inscritos (email) on delete set null on update cascade;

-- O líder precisa ser integrante da própria equipe.
create or replace function public.checar_lider()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.lider_email is not null and not exists (
    select 1 from membros where email = new.lider_email and equipe_id = new.id
  ) then
    raise exception 'O líder precisa ser integrante da equipe.';
  end if;
  return new;
end $$;

drop trigger if exists lider_e_integrante on public.equipes;
create trigger lider_e_integrante
  before insert or update of lider_email on public.equipes
  for each row execute function public.checar_lider();

-- Se o líder sai (ou é movido de equipe), a equipe fica sem líder.
create or replace function public.limpar_lider()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update equipes set lider_email = null
   where id = old.equipe_id and lider_email = old.email;
  return null;
end $$;

drop trigger if exists limpa_lider on public.membros;
create trigger limpa_lider
  after delete or update of equipe_id on public.membros
  for each row execute function public.limpar_lider();

-- -----------------------------------------------------------------------------
-- Composição das equipes: só organizadores adicionam ou removem integrantes
-- -----------------------------------------------------------------------------
drop policy if exists membros_insert on public.membros;
create policy membros_insert on public.membros for insert to authenticated
  with check (
    eh_organizador()
    and exists (select 1 from inscritos i where i.email = membros.email and i.papel = 'aluno')
  );

drop policy if exists membros_delete on public.membros;
create policy membros_delete on public.membros for delete to authenticated
  using (eh_organizador());

-- Criar equipe passa a ser só da organização (organizador não entra na equipe criada).
create or replace function public.criar_equipe(p_nome text, p_repo text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not eh_organizador() then
    raise exception 'A formação das equipes é feita pela organização.';
  end if;

  insert into equipes (nome, repo_github, criado_por)
  values (btrim(p_nome), nullif(btrim(coalesce(p_repo, '')), ''), email_atual())
  returning id into v_id;

  return v_id;
end $$;
