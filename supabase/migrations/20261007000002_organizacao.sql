-- =============================================================================
-- DataHack Univag 2026 — Migração 002: área da organização
-- Rodar no SQL Editor DEPOIS do schema.sql (pode rodar de novo sem problema).
--
--   notas           nota média (coeficiente) de cada participante — SÓ organizadores
--   materiais       links publicados pela organização (desafios, dados, dicionários...)
--   equipes         repo_github passa a ser opcional na criação: equipes geradas pelo
--                   sorteio nascem sem repositório e os alunos cadastram depois
--   aplicar_equipes RPC que grava no banco as equipes montadas pelo gerador
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Equipes geradas pelo sorteio nascem sem repositório
-- -----------------------------------------------------------------------------
alter table public.equipes alter column repo_github drop not null;

-- -----------------------------------------------------------------------------
-- Nota média (dado sensível: tabela separada, só organizadores leem)
-- -----------------------------------------------------------------------------
create table if not exists public.notas (
  email  text primary key references public.inscritos (email) on delete cascade on update cascade,
  nota   numeric(4,2) check (nota is null or (nota >= 0 and nota <= 10))
);

alter table public.notas enable row level security;
drop policy if exists notas_organizador on public.notas;
create policy notas_organizador on public.notas for all to authenticated
  using (eh_organizador()) with check (eh_organizador());

revoke all on public.notas from anon;
grant select, insert, update, delete on public.notas to authenticated;

-- -----------------------------------------------------------------------------
-- Materiais do evento (organização publica, todos os inscritos veem)
-- -----------------------------------------------------------------------------
create table if not exists public.materiais (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null check (char_length(btrim(titulo)) between 2 and 120),
  descricao   text check (descricao is null or char_length(descricao) <= 500),
  categoria   text not null check (categoria in
                ('desafio', 'dados', 'dicionario', 'documentacao', 'github', 'regulamento', 'apresentacao', 'outro')),
  url         text not null check (url ~ '^https?://[^\s]+$' and char_length(url) <= 500),
  destaque    boolean not null default false,
  criado_por  text references public.inscritos (email) on delete set null,
  criado_em   timestamptz not null default now()
);

alter table public.materiais enable row level security;
drop policy if exists materiais_select on public.materiais;
create policy materiais_select on public.materiais for select to authenticated using (eh_inscrito());
drop policy if exists materiais_write on public.materiais;
create policy materiais_write on public.materiais for all to authenticated
  using (eh_organizador()) with check (eh_organizador());

revoke all on public.materiais from anon;
grant select, insert, update, delete on public.materiais to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: grava as equipes montadas pelo gerador
--   p_equipes: [{"nome": "Equipe 01", "emails": ["a@x.com", ...]}, ...]
--   p_substituir: true apaga TODAS as equipes atuais antes (com links e membros)
-- Alunos que já estão em equipe são movidos para a nova. Tudo numa transação.
-- -----------------------------------------------------------------------------
create or replace function public.aplicar_equipes(p_equipes jsonb, p_substituir boolean default false)
returns int language plpgsql security definer set search_path = public
as $$
declare
  v_eq     jsonb;
  v_nome   text;
  v_base   text;
  v_n      int;
  v_id     uuid;
  v_maior  int;
  v_total  int := 0;
begin
  if not eh_organizador() then
    raise exception 'Apenas organizadores podem aplicar equipes.';
  end if;
  if jsonb_typeof(p_equipes) <> 'array' or jsonb_array_length(p_equipes) = 0 then
    raise exception 'Nenhuma equipe para aplicar.';
  end if;

  if p_substituir then
    delete from equipes where id is not null;  -- WHERE explícito (alguns ambientes barram DELETE sem WHERE)
  end if;

  -- Garante que o limite comporta a maior equipe gerada.
  select max(jsonb_array_length(e -> 'emails')) into v_maior from jsonb_array_elements(p_equipes) e;
  update configuracao set max_membros = greatest(max_membros, v_maior) where id = 1;

  for v_eq in select * from jsonb_array_elements(p_equipes) loop
    -- Nome único: acrescenta (2), (3)... se já existir.
    v_base := btrim(coalesce(v_eq ->> 'nome', 'Equipe'));
    v_nome := v_base;
    v_n := 1;
    while exists (select 1 from equipes where lower(btrim(nome)) = lower(v_nome)) loop
      v_n := v_n + 1;
      v_nome := v_base || ' (' || v_n || ')';
    end loop;

    insert into equipes (nome, repo_github, criado_por)
    values (v_nome, null, email_atual())
    returning id into v_id;

    insert into membros (email, equipe_id)
    select lower(x), v_id from jsonb_array_elements_text(v_eq -> 'emails') x
    on conflict (email) do update set equipe_id = excluded.equipe_id, entrou_em = now();

    v_total := v_total + 1;
  end loop;

  -- Equipes antigas que ficaram vazias depois das mudanças são removidas.
  delete from equipes e
   where not exists (select 1 from membros m where m.equipe_id = e.id)
     and e.repo_github is null
     and not exists (select 1 from links l where l.equipe_id = e.id);

  return v_total;
end $$;

revoke execute on function public.aplicar_equipes(jsonb, boolean) from public, anon;
grant execute on function public.aplicar_equipes(jsonb, boolean) to authenticated;
