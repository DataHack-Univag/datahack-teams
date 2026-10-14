-- =============================================================================
-- 015 · Chamados: a equipe pede ajuda (dúvida ou problema) e a mentoria/organização atende.
-- Um chamado ativo por equipe. Quem vê: a própria equipe, a mentoria e a organização da edição.
-- Nada é apagado: cancelar e resolver são situações, com quem e quando.
-- =============================================================================

create table public.chamados (
  id            uuid primary key default gen_random_uuid(),
  edicao_id     uuid not null references public.edicoes (id),
  equipe_id     uuid not null references public.equipes (id),
  tipo          text not null check (tipo in ('duvida', 'problema')),
  mensagem      text check (mensagem is null or char_length(mensagem) <= 300),
  -- aberto: esperando alguém · em_atendimento: alguém está indo · resolvido · cancelado (pela equipe)
  situacao      text not null default 'aberto' check (situacao in ('aberto', 'em_atendimento', 'resolvido', 'cancelado')),
  aberto_por    text references public.pessoas (email) on update cascade,
  aberto_em     timestamptz not null default now(),
  atendido_por  text references public.pessoas (email) on update cascade,
  atendido_em   timestamptz,
  fechado_por   text references public.pessoas (email) on update cascade,
  fechado_em    timestamptz
);
create unique index chamados_um_ativo on public.chamados (equipe_id) where situacao in ('aberto', 'em_atendimento');
create index chamados_edicao_ativos on public.chamados (edicao_id) where situacao in ('aberto', 'em_atendimento');

create trigger chamados_historico after insert or update on public.chamados
  for each row execute function public.registrar_historico();
create trigger chamados_nao_apagar before delete on public.chamados
  for each row execute function public.impedir_apagar();

-- Quem atende: organização ou mentoria da edição.
create or replace function public.atende_chamados(p_edicao uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select eh_organizador_de(p_edicao) or papel_em(p_edicao) = 'mentor' $$;

alter table public.chamados enable row level security;
revoke all on public.chamados from anon;
create policy chamados_select on public.chamados for select to authenticated
  using (atende_chamados(edicao_id) or equipe_id = minha_equipe(edicao_id));
-- Escrita só pelas funções abaixo.
grant select on public.chamados to authenticated;

/** A equipe de quem age abre um chamado (no "ver como", a organização abre pelo aluno). */
create or replace function public.abrir_chamado(p_tipo text, p_mensagem text default null, p_como text default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_email  text := quem_age(p_como);
  v_edicao uuid := edicao_atual();
  v_equipe uuid := equipe_ativa_de(quem_age(p_como), edicao_atual());
  v_id     uuid;
begin
  if v_equipe is null or not exists (select 1 from equipes where id = v_equipe and situacao = 'aprovada' and removido_em is null) then
    raise exception 'Só quem está numa equipe aprovada da edição atual pode pedir ajuda.';
  end if;
  if p_tipo not in ('duvida', 'problema') then raise exception 'Escolha dúvida ou problema.'; end if;
  if exists (select 1 from chamados where equipe_id = v_equipe and situacao in ('aberto', 'em_atendimento')) then
    raise exception 'A equipe já tem um pedido de ajuda aberto. Espere o atendimento ou cancele o anterior.';
  end if;
  insert into chamados (edicao_id, equipe_id, tipo, mensagem, aberto_por)
  values (v_edicao, v_equipe, p_tipo, nullif(btrim(coalesce(p_mensagem, '')), ''), v_email)
  returning id into v_id;
  return v_id;
end $$;

/** A equipe cancela ou avisa que resolveu sozinha (p_resolvido). */
create or replace function public.fechar_chamado_da_equipe(p_chamado uuid, p_resolvido boolean, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare v_email text := quem_age(p_como);
begin
  update chamados
     set situacao = case when p_resolvido then 'resolvido' else 'cancelado' end, fechado_por = v_email, fechado_em = now()
   where id = p_chamado and situacao in ('aberto', 'em_atendimento')
     and equipe_id = equipe_ativa_de(v_email, edicao_id);
  if not found then raise exception 'Esse pedido de ajuda não está mais aberto (ou não é da sua equipe).'; end if;
end $$;

/** Mentoria ou organização: "vou atender" (em_atendimento) ou "resolvido". */
create or replace function public.atender_chamado(p_chamado uuid, p_resolver boolean default false)
returns void language plpgsql security definer set search_path = public
as $$
declare v_edicao uuid := (select edicao_id from chamados where id = p_chamado);
begin
  if v_edicao is null or not atende_chamados(v_edicao) then
    raise exception 'Só a mentoria e a organização atendem os pedidos de ajuda.' using errcode = '42501';
  end if;
  if p_resolver then
    update chamados set situacao = 'resolvido', fechado_por = email_atual(), fechado_em = now(),
                        atendido_por = coalesce(atendido_por, email_atual()), atendido_em = coalesce(atendido_em, now())
     where id = p_chamado and situacao in ('aberto', 'em_atendimento');
  else
    update chamados set situacao = 'em_atendimento', atendido_por = email_atual(), atendido_em = now()
     where id = p_chamado and situacao = 'aberto';
  end if;
  if not found then raise exception 'Esse pedido de ajuda já foi atendido ou fechado. A lista vai se atualizar.'; end if;
end $$;

/** Desfazer de quem atende: volta o chamado para "aberto" (ex.: marcou o errado). */
create or replace function public.reabrir_chamado(p_chamado uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_edicao uuid := (select edicao_id from chamados where id = p_chamado);
begin
  if v_edicao is null or not atende_chamados(v_edicao) then
    raise exception 'Só a mentoria e a organização atendem os pedidos de ajuda.' using errcode = '42501';
  end if;
  update chamados set situacao = 'aberto', atendido_por = null, atendido_em = null, fechado_por = null, fechado_em = null
   where id = p_chamado and situacao in ('em_atendimento', 'resolvido')
     and not exists (select 1 from chamados c2 where c2.equipe_id = chamados.equipe_id and c2.id <> chamados.id
                     and c2.situacao in ('aberto', 'em_atendimento'));
  if not found then raise exception 'Não deu para reabrir: a equipe já abriu outro pedido.'; end if;
end $$;

revoke all on function public.abrir_chamado(text, text, text), public.fechar_chamado_da_equipe(uuid, boolean, text),
                       public.atender_chamado(uuid, boolean), public.reabrir_chamado(uuid), public.atende_chamados(uuid)
  from public, anon;
grant execute on function public.abrir_chamado(text, text, text), public.fechar_chamado_da_equipe(uuid, boolean, text),
                          public.atender_chamado(uuid, boolean), public.reabrir_chamado(uuid), public.atende_chamados(uuid)
  to authenticated;
