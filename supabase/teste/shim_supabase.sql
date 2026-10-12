-- =============================================================================
-- SÓ PARA TESTE LOCAL (Postgres puro). Imita o mínimo do Supabase que as migrações usam:
--   schema auth com auth.users, auth.jwt() e auth.uid(), e os papéis anon/authenticated.
-- Para agir como alguém num teste:
--   set role authenticated;
--   select set_config('request.jwt.claims', '{"email":"fulano@x.com"}', false);
-- NUNCA rodar no Supabase (lá tudo isso já existe).
-- =============================================================================

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

create table if not exists auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  created_at timestamptz not null default now()
);

create or replace function auth.jwt() returns jsonb language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;

create or replace function auth.uid() returns uuid language sql stable
as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;

grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
