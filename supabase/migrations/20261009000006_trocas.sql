-- =============================================================================
-- DataHack Univag 2026 — Migração 006: pedidos de troca de equipe
-- Rodar no SQL Editor DEPOIS do 005_lider_edita_dados.sql (pode rodar de novo).
--
-- Fluxo:
--   1. Aluno da equipe X pede para ir para a equipe Y (um pedido aguardando por vez).
--   2. Os integrantes de Y veem o pedido. Qualquer um deles pode:
--        - aceitar: os dois TROCAM de lugar (quem pediu vai para Y, quem aceitou vai para X);
--        - recusar.
--   3. Quem pediu pode cancelar enquanto estiver aguardando.
-- A troca é atômica (as duas pessoas mudam juntas) e mantém o tamanho das equipes.
-- Organizadores veem tudo e podem agir em nome de um aluno (tela "ver como aluno").
-- =============================================================================

create table if not exists public.trocas (
  id              uuid primary key default gen_random_uuid(),
  solicitante     text not null references public.inscritos (email) on delete cascade on update cascade,
  equipe_origem   uuid not null references public.equipes (id) on delete cascade,
  equipe_destino  uuid not null references public.equipes (id) on delete cascade,
  status          text not null default 'pendente'
                  check (status in ('pendente', 'aceita', 'recusada', 'cancelada')),
  mensagem        text check (mensagem is null or char_length(mensagem) <= 200),
  respondido_por  text references public.inscritos (email) on delete set null on update cascade,
  criado_em       timestamptz not null default now(),
  respondido_em   timestamptz,
  check (equipe_origem <> equipe_destino)
);

-- No máximo um pedido aguardando por aluno.
create unique index if not exists trocas_um_pendente on public.trocas (solicitante) where status = 'pendente';
create index if not exists trocas_destino_idx on public.trocas (equipe_destino) where status = 'pendente';

alter table public.trocas enable row level security;
drop policy if exists trocas_select on public.trocas;
create policy trocas_select on public.trocas for select to authenticated
  using (
    eh_organizador()
    or solicitante = email_atual()
    or equipe_origem = minha_equipe()
    or equipe_destino = minha_equipe()
  );
-- Escrita só pelas funções abaixo.
revoke all on public.trocas from anon;
revoke insert, update, delete on public.trocas from authenticated;
grant select on public.trocas to authenticated;

-- -----------------------------------------------------------------------------
-- Ajustes nos triggers existentes para a troca funcionar
-- -----------------------------------------------------------------------------

-- Limite de integrantes: a troca não altera o tamanho das equipes, então durante ela
-- (flag dh.troca da transação) o limite não é checado a cada passo.
create or replace function public.checar_limite_membros()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  limite int;
  atual  int;
begin
  if current_setting('dh.troca', true) = '1' then
    return new;
  end if;
  select max_membros into limite from configuracao where id = 1;
  select count(*) into atual from membros where equipe_id = new.equipe_id and email <> new.email;
  if atual >= limite then
    raise exception 'A equipe já atingiu o limite de % integrantes.', limite;
  end if;
  return new;
end $$;

-- Trava do líder: só vale enquanto o líder ainda está na equipe. Se ele saiu
-- (troca, remoção), a equipe pode ficar sem líder automaticamente.
create or replace function public.checar_lider()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.lider_email is not null and not exists (
    select 1 from membros where email = new.lider_email and equipe_id = new.id
  ) then
    raise exception 'O líder precisa ser integrante da equipe.';
  end if;

  if tg_op = 'UPDATE'
     and new.lider_email is distinct from old.lider_email
     and old.lider_email is not null
     and exists (select 1 from membros where email = old.lider_email and equipe_id = old.id)
     and not eh_organizador()
     and old.lider_email <> email_atual() then
    raise exception 'Só o líder atual pode passar a liderança para outra pessoa.';
  end if;

  return new;
end $$;

-- -----------------------------------------------------------------------------
-- RPCs
-- p_como: e-mail do aluno em nome de quem o ORGANIZADOR age ("ver como aluno").
--         Para alunos é ignorado (vale sempre o e-mail do login).
-- -----------------------------------------------------------------------------

create or replace function public.quem_age(p_como text)
returns text language sql stable security definer set search_path = public
as $$
  select case when eh_organizador() and nullif(btrim(coalesce(p_como, '')), '') is not null
              then lower(btrim(p_como)) else email_atual() end
$$;

create or replace function public.pedir_troca(p_destino uuid, p_mensagem text default null, p_como text default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_email  text := quem_age(p_como);
  v_origem uuid;
  v_id     uuid;
begin
  if not eh_inscrito() then
    raise exception 'Acesso restrito a inscritos.';
  end if;
  if not edicao_liberada() then
    raise exception 'A edição das equipes está bloqueada pela organização.';
  end if;
  select equipe_id into v_origem from membros where email = v_email;
  if v_origem is null then
    raise exception 'Você não está em nenhuma equipe.';
  end if;
  if v_origem = p_destino then
    raise exception 'Você já está nessa equipe.';
  end if;
  if not exists (select 1 from equipes where id = p_destino) then
    raise exception 'Equipe não encontrada.';
  end if;
  if exists (select 1 from trocas where solicitante = v_email and status = 'pendente') then
    raise exception 'Você já tem um pedido de troca aguardando. Cancele-o antes de pedir outro.';
  end if;

  insert into trocas (solicitante, equipe_origem, equipe_destino, mensagem)
  values (v_email, v_origem, p_destino, nullif(btrim(coalesce(p_mensagem, '')), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.cancelar_troca(p_pedido uuid, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update trocas set status = 'cancelada', respondido_em = now()
   where id = p_pedido and status = 'pendente'
     and (solicitante = quem_age(p_como) or eh_organizador());
  if not found then
    raise exception 'Esse pedido não está mais aguardando.';
  end if;
end $$;

create or replace function public.recusar_troca(p_pedido uuid, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_email text := quem_age(p_como);
begin
  update trocas t set status = 'recusada', respondido_por = v_email, respondido_em = now()
   where t.id = p_pedido and t.status = 'pendente'
     and (eh_organizador()
          or exists (select 1 from membros m where m.email = v_email and m.equipe_id = t.equipe_destino));
  if not found then
    raise exception 'Esse pedido não está mais aguardando (ou não é para a sua equipe).';
  end if;
end $$;

-- Retorna 'ok' ou uma mensagem explicando por que não deu (sem raise, para gravar o cancelamento).
create or replace function public.aceitar_troca(p_pedido uuid, p_como text default null)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_email text := quem_age(p_como);
  t       trocas%rowtype;
begin
  select * into t from trocas where id = p_pedido for update;
  if not found or t.status <> 'pendente' then
    return 'Esse pedido não está mais aguardando.';
  end if;
  if not edicao_liberada() then
    return 'A edição das equipes está bloqueada pela organização.';
  end if;
  if not exists (select 1 from membros where email = v_email and equipe_id = t.equipe_destino) then
    return 'Só um integrante da equipe pedida pode aceitar a troca.';
  end if;
  if not exists (select 1 from membros where email = t.solicitante and equipe_id = t.equipe_origem) then
    update trocas set status = 'cancelada', respondido_em = now() where id = t.id;
    return 'Quem pediu já mudou de equipe; o pedido foi cancelado.';
  end if;

  -- Troca de lugar (o limite de integrantes não é checado no meio da troca).
  perform set_config('dh.troca', '1', true);
  update membros set equipe_id = t.equipe_destino, entrou_em = now() where email = t.solicitante;
  update membros set equipe_id = t.equipe_origem,  entrou_em = now() where email = v_email;
  perform set_config('dh.troca', '0', true);

  update trocas set status = 'aceita', respondido_por = v_email, respondido_em = now() where id = t.id;
  -- Outros pedidos aguardando das duas pessoas perdem o sentido.
  update trocas set status = 'cancelada', respondido_em = now()
   where status = 'pendente' and solicitante in (t.solicitante, v_email);
  return 'ok';
end $$;

revoke execute on function public.quem_age(text) from public, anon;
revoke execute on function public.pedir_troca(uuid, text, text) from public, anon;
revoke execute on function public.cancelar_troca(uuid, text) from public, anon;
revoke execute on function public.recusar_troca(uuid, text) from public, anon;
revoke execute on function public.aceitar_troca(uuid, text) from public, anon;
grant execute on function
  public.quem_age(text), public.pedir_troca(uuid, text, text), public.cancelar_troca(uuid, text),
  public.recusar_troca(uuid, text), public.aceitar_troca(uuid, text)
  to authenticated;
