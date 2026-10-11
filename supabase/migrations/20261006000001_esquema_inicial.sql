-- =============================================================================
-- DataHack Univag 2026 — Gestão de Equipes
-- Schema do Supabase (Postgres). Rodar UMA vez no SQL Editor do projeto.
-- Depois rodar supabase/seed.sql para carregar a lista de inscritos.
--
-- Modelo:
--   inscritos   lista fechada de e-mails autorizados (alunos e organizadores)
--   equipes     nome + repositório GitHub público (obrigatório)
--   membros     aluno → equipe (cada aluno em no máximo UMA equipe)
--   links       links extras da equipe, com categoria (drive, figma, vídeo...)
--   configuracao  linha única: limite de integrantes e trava de edição
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------

create table if not exists public.inscritos (
  email      text primary key check (email = lower(btrim(email)) and email like '%@%'),
  nome       text not null,
  curso      text,
  semestre   int,
  papel      text not null default 'aluno' check (papel in ('aluno', 'organizador')),
  criado_em  timestamptz not null default now()
);

create table if not exists public.equipes (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null check (char_length(btrim(nome)) between 2 and 60),
  -- Repositório público onde a equipe entrega o código. Obrigatório.
  repo_github         text not null
                      check (repo_github ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  -- Resultado da última checagem na API do GitHub (null = não verificado).
  repo_publico        boolean,
  repo_verificado_em  timestamptz,
  criado_por          text references public.inscritos (email) on delete set null,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

-- Nome de equipe único, sem diferenciar maiúsculas/minúsculas.
create unique index if not exists equipes_nome_unico on public.equipes (lower(btrim(nome)));

create table if not exists public.membros (
  -- PK no e-mail garante que cada aluno está em no máximo uma equipe.
  email      text primary key references public.inscritos (email) on delete cascade on update cascade,
  equipe_id  uuid not null references public.equipes (id) on delete cascade,
  entrou_em  timestamptz not null default now()
);
create index if not exists membros_equipe_idx on public.membros (equipe_id);

create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  equipe_id   uuid not null references public.equipes (id) on delete cascade,
  categoria   text not null check (categoria in
                ('github', 'drive', 'figma', 'video', 'apresentacao', 'site', 'dashboard', 'outro')),
  titulo      text check (titulo is null or char_length(titulo) <= 80),
  url         text not null check (url ~ '^https?://[^\s]+$' and char_length(url) <= 500),
  criado_por  text references public.inscritos (email) on delete set null,
  criado_em   timestamptz not null default now()
);
create index if not exists links_equipe_idx on public.links (equipe_id);

create table if not exists public.configuracao (
  id                int primary key default 1 check (id = 1),
  max_membros       int not null default 5 check (max_membros between 1 and 20),
  -- Quando true, só organizadores alteram equipes/membros/links (ex.: após o prazo de entrega).
  edicao_bloqueada  boolean not null default false
);
insert into public.configuracao (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Funções auxiliares (security definer para evitar recursão de RLS)
-- -----------------------------------------------------------------------------

-- Gmail ignora pontos e o sufixo "+algo" no usuário: "joao.silva@gmail.com" e
-- "joaosilva@gmail.com" são a mesma conta. Normalizamos para comparar.
create or replace function public.normalizar_email(p text)
returns text language sql immutable
as $$
  select case
    when split_part(lower(btrim(p)), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(btrim(p)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else lower(btrim(p))
  end
$$;

create index if not exists inscritos_email_norm_idx on public.inscritos (public.normalizar_email(email));

-- E-mail do usuário logado, já mapeado para o e-mail como está na lista de inscritos.
create or replace function public.email_atual()
returns text language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select email from inscritos
      where normalizar_email(email) = normalizar_email(auth.jwt() ->> 'email') limit 1),
    lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

create or replace function public.eh_inscrito()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from inscritos where email = email_atual()) $$;

create or replace function public.eh_organizador()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from inscritos where email = email_atual() and papel = 'organizador') $$;

create or replace function public.minha_equipe()
returns uuid language sql stable security definer set search_path = public
as $$ select equipe_id from membros where email = email_atual() $$;

-- Organizador sempre pode editar; aluno só enquanto a edição não estiver travada.
create or replace function public.edicao_liberada()
returns boolean language sql stable security definer set search_path = public
as $$ select eh_organizador() or not coalesce((select edicao_bloqueada from configuracao where id = 1), false) $$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Bloqueia o cadastro (inclusive via Google) de quem não está na lista de inscritos.
create or replace function public.bloquear_nao_inscritos()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.inscritos
                 where public.normalizar_email(email) = public.normalizar_email(new.email)) then
    raise exception 'E-mail % não está na lista de inscritos do DataHack', new.email;
  end if;
  return new;
end $$;

drop trigger if exists antes_criar_usuario on auth.users;
create trigger antes_criar_usuario
  before insert on auth.users
  for each row execute function public.bloquear_nao_inscritos();

-- Limite de integrantes por equipe (configurável em public.configuracao).
create or replace function public.checar_limite_membros()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  limite int;
  atual  int;
begin
  select max_membros into limite from configuracao where id = 1;
  select count(*) into atual from membros where equipe_id = new.equipe_id and email <> new.email;
  if atual >= limite then
    raise exception 'A equipe já atingiu o limite de % integrantes.', limite;
  end if;
  return new;
end $$;

drop trigger if exists limite_membros on public.membros;
create trigger limite_membros
  before insert or update of equipe_id on public.membros
  for each row execute function public.checar_limite_membros();

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql
as $$ begin new.atualizado_em := now(); return new; end $$;

drop trigger if exists equipes_atualizado_em on public.equipes;
create trigger equipes_atualizado_em
  before update on public.equipes
  for each row execute function public.tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- RPC: criar equipe (cria a equipe e já coloca o aluno nela, de forma atômica)
-- -----------------------------------------------------------------------------

create or replace function public.criar_equipe(p_nome text, p_repo text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_email text := email_atual();
  v_id    uuid;
begin
  if not eh_inscrito() then
    raise exception 'Acesso restrito a inscritos.';
  end if;
  if not edicao_liberada() then
    raise exception 'A edição das equipes está bloqueada pela organização.';
  end if;
  if not eh_organizador() and exists (select 1 from membros where email = v_email) then
    raise exception 'Você já faz parte de uma equipe.';
  end if;

  insert into equipes (nome, repo_github, criado_por)
  values (btrim(p_nome), p_repo, v_email)
  returning id into v_id;

  -- Organizadores criam equipes para os outros; não entram nelas.
  if not eh_organizador() then
    insert into membros (email, equipe_id) values (v_email, v_id);
  end if;

  return v_id;
end $$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.inscritos    enable row level security;
alter table public.equipes      enable row level security;
alter table public.membros      enable row level security;
alter table public.links        enable row level security;
alter table public.configuracao enable row level security;

-- inscritos: qualquer inscrito vê a lista (para montar equipes); só organizador altera.
drop policy if exists inscritos_select on public.inscritos;
create policy inscritos_select on public.inscritos for select to authenticated using (eh_inscrito());
drop policy if exists inscritos_write on public.inscritos;
create policy inscritos_write on public.inscritos for all to authenticated
  using (eh_organizador()) with check (eh_organizador());

-- equipes: todos os inscritos veem; membros da equipe e organizadores editam.
drop policy if exists equipes_select on public.equipes;
create policy equipes_select on public.equipes for select to authenticated using (eh_inscrito());
drop policy if exists equipes_update on public.equipes;
create policy equipes_update on public.equipes for update to authenticated
  using ((id = minha_equipe() or eh_organizador()) and edicao_liberada())
  with check ((id = minha_equipe() or eh_organizador()) and edicao_liberada());
drop policy if exists equipes_delete on public.equipes;
create policy equipes_delete on public.equipes for delete to authenticated using (eh_organizador());
-- insert de equipe só via RPC criar_equipe.

-- membros: todos veem; integrante adiciona/remove na própria equipe; qualquer um pode sair.
drop policy if exists membros_select on public.membros;
create policy membros_select on public.membros for select to authenticated using (eh_inscrito());
drop policy if exists membros_insert on public.membros;
create policy membros_insert on public.membros for insert to authenticated
  with check (
    edicao_liberada()
    and (eh_organizador() or equipe_id = minha_equipe())
    and exists (select 1 from inscritos i where i.email = membros.email and i.papel = 'aluno')
  );
drop policy if exists membros_update on public.membros;
create policy membros_update on public.membros for update to authenticated
  using (eh_organizador()) with check (eh_organizador());
drop policy if exists membros_delete on public.membros;
create policy membros_delete on public.membros for delete to authenticated
  using (edicao_liberada() and (eh_organizador() or equipe_id = minha_equipe() or email = email_atual()));

-- links: todos veem; integrantes e organizadores gerenciam.
drop policy if exists links_select on public.links;
create policy links_select on public.links for select to authenticated using (eh_inscrito());
drop policy if exists links_write on public.links;
create policy links_write on public.links for all to authenticated
  using ((equipe_id = minha_equipe() or eh_organizador()) and edicao_liberada())
  with check ((equipe_id = minha_equipe() or eh_organizador()) and edicao_liberada());

-- configuracao: todos leem; só organizador altera.
drop policy if exists configuracao_select on public.configuracao;
create policy configuracao_select on public.configuracao for select to authenticated using (eh_inscrito());
drop policy if exists configuracao_update on public.configuracao;
create policy configuracao_update on public.configuracao for update to authenticated
  using (eh_organizador()) with check (eh_organizador());

-- -----------------------------------------------------------------------------
-- Permissões explícitas (anon não acessa nada)
-- -----------------------------------------------------------------------------

revoke all on public.inscritos, public.equipes, public.membros, public.links, public.configuracao from anon;
grant select, insert, update, delete on public.inscritos, public.equipes, public.membros, public.links
  to authenticated;
grant select, update on public.configuracao to authenticated;

revoke execute on function public.criar_equipe(text, text) from public, anon;
grant execute on function public.criar_equipe(text, text) to authenticated;
grant execute on function
  public.normalizar_email(text), public.email_atual(), public.eh_inscrito(), public.eh_organizador(),
  public.minha_equipe(), public.edicao_liberada()
  to authenticated;
