-- =============================================================================
-- 014 · Equipes no mapa
-- Cada equipe tem um ícone (escolhido pelo líder ou pela organização) e ocupa um lugar
-- de uma bancada/mesa do mapa. A organização distribui; mudar de lugar fecha a alocação
-- anterior (ate) e abre outra: o histórico de onde cada equipe esteve fica guardado.
-- =============================================================================

alter table public.equipes add column icone text check (icone is null or char_length(icone) between 1 and 16);

-- O ícone segue a regra do nome e do repositório: só o líder ou a organização.
create or replace function public.checar_dados_equipe()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (new.nome is distinct from old.nome or new.repo_github is distinct from old.repo_github or new.icone is distinct from old.icone)
     and not eh_organizador_de(old.edicao_id)
     and (old.lider_email is null or old.lider_email <> email_atual()) then
    raise exception 'Só o líder da equipe pode alterar o nome, o ícone e o repositório.';
  end if;
  -- Situação, origem, edição e arquivamento só mudam pela organização ou pelas funções do fluxo.
  if (new.situacao is distinct from old.situacao or new.edicao_id is distinct from old.edicao_id
      or new.origem is distinct from old.origem or new.removido_em is distinct from old.removido_em)
     and not eh_organizador_de(old.edicao_id) and current_setting('dh.fluxo', true) is distinct from '1' then
    raise exception 'Só a organização altera a situação da equipe.';
  end if;
  return new;
end $$;

drop trigger if exists lider_edita_dados on public.equipes;
create trigger lider_edita_dados
  before update of nome, repo_github, icone, situacao, edicao_id, origem, removido_em on public.equipes
  for each row execute function public.checar_dados_equipe();

-- -----------------------------------------------------------------------------
-- Alocações: equipe → lugar (1..lugares) de um elemento do mapa. Ativa = ate is null.
-- -----------------------------------------------------------------------------
create table public.alocacoes (
  id           uuid primary key default gen_random_uuid(),
  edicao_id    uuid not null references public.edicoes (id),
  equipe_id    uuid not null references public.equipes (id),
  elemento_id  uuid not null references public.mapa_elementos (id),
  lugar        int not null check (lugar between 1 and 20),
  desde        timestamptz not null default now(),
  ate          timestamptz,
  por          text references public.pessoas (email) on update cascade
);
create unique index alocacoes_equipe_ativa on public.alocacoes (equipe_id) where ate is null;
create unique index alocacoes_lugar_ativo on public.alocacoes (elemento_id, lugar) where ate is null;
create index alocacoes_edicao_idx on public.alocacoes (edicao_id) where ate is null;

create trigger alocacoes_historico after insert or update on public.alocacoes
  for each row execute function public.registrar_historico();
create trigger alocacoes_nao_apagar before delete on public.alocacoes
  for each row execute function public.impedir_apagar();

alter table public.alocacoes enable row level security;
revoke all on public.alocacoes from anon;
create policy alocacoes_select on public.alocacoes for select to authenticated
  using (eh_organizador_de(edicao_id) or participa_de(edicao_id));
-- Escrita só pelas funções abaixo (que conferem tudo).
grant select on public.alocacoes to authenticated;

/**
 * Põe a equipe num lugar. Se o lugar estiver ocupado, as duas equipes trocam
 * (a outra vai para o lugar antigo desta; sem lugar antigo, fica sem lugar).
 */
create or replace function public.alocar_equipe(p_equipe uuid, p_elemento uuid, p_lugar int)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_edicao  uuid;
  v_lugares int;
  v_atual   alocacoes%rowtype;
  v_alvo    alocacoes%rowtype;
  v_outra   text;
begin
  select edicao_id into v_edicao from equipes where id = p_equipe and removido_em is null and situacao = 'aprovada';
  if v_edicao is null then raise exception 'Equipe não encontrada (ou ainda não aprovada).'; end if;
  if not eh_organizador_de(v_edicao) then
    raise exception 'Só a organização distribui as equipes no mapa.' using errcode = '42501';
  end if;
  select lugares into v_lugares from mapa_elementos
   where id = p_elemento and edicao_id = v_edicao and removido_em is null and lugares is not null;
  if v_lugares is null then raise exception 'Esse lugar não existe no mapa desta edição (só bancadas e mesas recebem equipes).'; end if;
  if p_lugar < 1 or p_lugar > v_lugares then raise exception 'Essa bancada tem % lugar(es).', v_lugares; end if;

  select * into v_atual from alocacoes where equipe_id = p_equipe and ate is null;
  if v_atual.elemento_id = p_elemento and v_atual.lugar = p_lugar then
    return jsonb_build_object('mudou', false);
  end if;
  select * into v_alvo from alocacoes where elemento_id = p_elemento and lugar = p_lugar and ate is null;

  update alocacoes set ate = now() where id in (v_atual.id, v_alvo.id);
  insert into alocacoes (edicao_id, equipe_id, elemento_id, lugar, por)
  values (v_edicao, p_equipe, p_elemento, p_lugar, nullif(email_atual(), ''));

  if v_alvo.id is not null then
    select nome into v_outra from equipes where id = v_alvo.equipe_id;
    if v_atual.id is not null then
      insert into alocacoes (edicao_id, equipe_id, elemento_id, lugar, por)
      values (v_edicao, v_alvo.equipe_id, v_atual.elemento_id, v_atual.lugar, nullif(email_atual(), ''));
      return jsonb_build_object('mudou', true, 'trocou_com', v_outra);
    end if;
    return jsonb_build_object('mudou', true, 'sem_lugar', v_outra);
  end if;
  return jsonb_build_object('mudou', true);
end $$;

create or replace function public.desalocar_equipe(p_equipe uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not eh_organizador_de((select edicao_id from equipes where id = p_equipe)) then
    raise exception 'Só a organização distribui as equipes no mapa.' using errcode = '42501';
  end if;
  update alocacoes set ate = now() where equipe_id = p_equipe and ate is null;
end $$;

revoke all on function public.alocar_equipe(uuid, uuid, int), public.desalocar_equipe(uuid) from public, anon;
grant execute on function public.alocar_equipe(uuid, uuid, int), public.desalocar_equipe(uuid) to authenticated;
