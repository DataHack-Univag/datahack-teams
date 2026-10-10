-- =============================================================================
-- DataHack Univag 2026 — Migração 007: auditoria das trocas
-- Rodar no SQL Editor DEPOIS do 006_trocas.sql (pode rodar de novo).
--
--   - O histórico de trocas NÃO é mais apagado quando uma equipe é excluída (ex.: o
--     "substituir tudo" do gerador) ou quando um participante sai da lista.
--   - Cada pedido guarda uma cópia dos nomes (quem pediu, equipes, quem respondeu),
--     para o histórico continuar legível mesmo depois de algo ser apagado.
--   - O cancelamento registra quem cancelou.
-- =============================================================================

-- Cópia dos nomes no momento do pedido/resposta.
alter table public.trocas add column if not exists solicitante_nome text;
alter table public.trocas add column if not exists origem_nome text;
alter table public.trocas add column if not exists destino_nome text;
alter table public.trocas add column if not exists respondido_nome text;

-- Preenche os pedidos que já existem.
update public.trocas t set solicitante_nome = i.nome
  from public.inscritos i where i.email = t.solicitante and t.solicitante_nome is null;
update public.trocas t set origem_nome = e.nome
  from public.equipes e where e.id = t.equipe_origem and t.origem_nome is null;
update public.trocas t set destino_nome = e.nome
  from public.equipes e where e.id = t.equipe_destino and t.destino_nome is null;
update public.trocas t set respondido_nome = i.nome
  from public.inscritos i where i.email = t.respondido_por and t.respondido_nome is null;

-- Apagar equipe/participante não apaga mais o histórico: as referências viram null.
alter table public.trocas alter column solicitante drop not null;
alter table public.trocas alter column equipe_origem drop not null;
alter table public.trocas alter column equipe_destino drop not null;

alter table public.trocas drop constraint if exists trocas_solicitante_fkey;
alter table public.trocas add constraint trocas_solicitante_fkey
  foreign key (solicitante) references public.inscritos (email) on delete set null on update cascade;
alter table public.trocas drop constraint if exists trocas_equipe_origem_fkey;
alter table public.trocas add constraint trocas_equipe_origem_fkey
  foreign key (equipe_origem) references public.equipes (id) on delete set null;
alter table public.trocas drop constraint if exists trocas_equipe_destino_fkey;
alter table public.trocas add constraint trocas_equipe_destino_fkey
  foreign key (equipe_destino) references public.equipes (id) on delete set null;

-- Pedido aguardando cuja equipe foi apagada não faz mais sentido: vira cancelado.
create or replace function public.cancelar_trocas_orfas()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'pendente' and (new.equipe_origem is null or new.equipe_destino is null) then
    new.status := 'cancelada';
    new.respondido_em := now();
    new.respondido_nome := 'automático (equipe excluída)';
  end if;
  return new;
end $$;

drop trigger if exists trocas_orfas on public.trocas;
create trigger trocas_orfas
  before update of equipe_origem, equipe_destino on public.trocas
  for each row execute function public.cancelar_trocas_orfas();

-- -----------------------------------------------------------------------------
-- RPCs (mesma lógica do 006, agora gravando os nomes e quem cancelou)
-- -----------------------------------------------------------------------------

create or replace function public.nome_de(p_email text)
returns text language sql stable security definer set search_path = public
as $$ select nome from inscritos where email = p_email $$;

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

  insert into trocas (solicitante, solicitante_nome, equipe_origem, origem_nome, equipe_destino, destino_nome, mensagem)
  values (
    v_email, nome_de(v_email),
    v_origem, (select nome from equipes where id = v_origem),
    p_destino, (select nome from equipes where id = p_destino),
    nullif(btrim(coalesce(p_mensagem, '')), '')
  )
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.cancelar_troca(p_pedido uuid, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_email text := case when eh_organizador() and nullif(btrim(coalesce(p_como, '')), '') is null
                       then email_atual() else quem_age(p_como) end;
begin
  update trocas set status = 'cancelada', respondido_em = now(),
         respondido_por = v_email,
         respondido_nome = coalesce(nome_de(v_email), v_email) || case when eh_organizador() then ' (organização)' else '' end
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
  update trocas t set status = 'recusada', respondido_por = v_email, respondido_nome = nome_de(v_email),
         respondido_em = now()
   where t.id = p_pedido and t.status = 'pendente'
     and (eh_organizador()
          or exists (select 1 from membros m where m.email = v_email and m.equipe_id = t.equipe_destino));
  if not found then
    raise exception 'Esse pedido não está mais aguardando (ou não é para a sua equipe).';
  end if;
end $$;

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
    update trocas set status = 'cancelada', respondido_em = now(),
           respondido_nome = 'automático (quem pediu já mudou de equipe)'
     where id = t.id;
    return 'Quem pediu já mudou de equipe; o pedido foi cancelado.';
  end if;

  perform set_config('dh.troca', '1', true);
  update membros set equipe_id = t.equipe_destino, entrou_em = now() where email = t.solicitante;
  update membros set equipe_id = t.equipe_origem,  entrou_em = now() where email = v_email;
  perform set_config('dh.troca', '0', true);

  update trocas set status = 'aceita', respondido_por = v_email, respondido_nome = nome_de(v_email),
         respondido_em = now()
   where id = t.id;
  update trocas set status = 'cancelada', respondido_em = now(),
         respondido_nome = 'automático (houve outra troca)'
   where status = 'pendente' and solicitante in (t.solicitante, v_email);
  return 'ok';
end $$;

revoke execute on function public.nome_de(text) from public, anon;
grant execute on function public.nome_de(text) to authenticated;
