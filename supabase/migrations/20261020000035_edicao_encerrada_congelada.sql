-- =============================================================================
-- 035 · Edição encerrada fica congelada
-- -----------------------------------------------------------------------------
-- Com a edição "encerrada", nada dela muda: notas, fichas, presença, equipes, membros,
-- links, trocas, chamados, inscrições, perguntas, regulamento, mapa, materiais… nem pela
-- tela, nem por função do banco, nem pela organização. A única coisa que muda é a própria
-- situação da edição (para reabrir, a organização volta ela para "em andamento") e se ela
-- é a atual.
--
-- Como funciona: um gatilho em cada tabela da edição recusa inserir, alterar ou apagar
-- quando a edição da linha está encerrada. Mudanças em cascata vindas de fora (ex.: o
-- e-mail de uma pessoa corrigido em pessoas) passam, porque não alteram o que aconteceu.
-- Scripts de manutenção podem liberar de propósito, na própria transação:
--     set local dh.permitir_encerrada = 'sim';
-- =============================================================================

-- Edição da linha: direto (edicao_id) ou pela tabela-mãe.
create or replace function public.edicao_da_linha(p_tabela text, p_linha jsonb)
returns uuid language sql stable security definer set search_path = public
as $$
  select case
    when p_linha ? 'edicao_id' then (p_linha ->> 'edicao_id')::uuid
    when p_tabela = 'links' then (select edicao_id from equipes where id = (p_linha ->> 'equipe_id')::uuid)
    when p_tabela = 'notas_criterio' then (select edicao_id from fichas where id = (p_linha ->> 'ficha_id')::uuid)
    when p_tabela = 'criterio_niveis' then (select edicao_id from criterios where id = (p_linha ->> 'criterio_id')::uuid)
  end
$$;

create or replace function public.impedir_se_encerrada()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_linha jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_ed    uuid;
  v_num   int;
begin
  -- Cascata de fora (pg_trigger_depth > 1) ou manutenção liberada: passa.
  if pg_trigger_depth() > 1 or coalesce(current_setting('dh.permitir_encerrada', true), '') = 'sim' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  v_ed := edicao_da_linha(tg_table_name, v_linha);
  -- Mudou de edição (raro): vale também a edição de antes.
  if v_ed is not null and exists (select 1 from edicoes where id = v_ed and situacao = 'encerrada')
     or (tg_op = 'UPDATE' and exists (select 1 from edicoes where id = edicao_da_linha(tg_table_name, to_jsonb(old)) and situacao = 'encerrada')) then
    select numero into v_num from edicoes where id = coalesce(v_ed, edicao_da_linha(tg_table_name, to_jsonb(old)));
    raise exception 'A Edição % está encerrada: nada dela pode ser alterado. Para corrigir algo, a organização reabre a edição em Edições → Situação.', v_num;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- A própria edição: encerrada, só muda a situação (reabrir/cancelar) e se é a atual.
create or replace function public.impedir_edicao_encerrada()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  livres text[] := array['situacao', 'atual', 'motivo_cancelamento', 'cancelada_em', 'atualizado_em'];
begin
  if old.situacao = 'encerrada' and new.situacao = 'encerrada'
     and coalesce(current_setting('dh.permitir_encerrada', true), '') <> 'sim'
     and (to_jsonb(new) - livres) is distinct from (to_jsonb(old) - livres) then
    raise exception 'A Edição % está encerrada: nada dela pode ser alterado. Para corrigir algo, reabra a edição em Edições → Situação.', old.numero;
  end if;
  return new;
end $$;
drop trigger if exists edicoes_congelada on public.edicoes;
create trigger edicoes_congelada before update on public.edicoes
  for each row execute function public.impedir_edicao_encerrada();

do $$
declare t text;
begin
  foreach t in array array[
    'alocacoes', 'bancas', 'campos_inscricao', 'chamados', 'checkin_codigos', 'criterios', 'criterio_niveis',
    'edicao_instituicoes', 'equipes', 'fases', 'fichas', 'inscricoes', 'links', 'mapa_elementos', 'materiais',
    'membros', 'niveis', 'notas', 'notas_criterio', 'participacoes', 'penalidades', 'penalidades_equipe', 'pisos',
    'regras_desempate', 'rubricas', 'salas', 'termos', 'trocas'] loop
    execute format('drop trigger if exists %I on public.%I', 'a_' || t || '_congelada', t);
    -- "a_" no nome: roda antes dos outros gatilhos (a ordem é alfabética), sem efeito colateral.
    execute format('create trigger %I before insert or update or delete on public.%I for each row execute function public.impedir_se_encerrada()',
                   'a_' || t || '_congelada', t);
  end loop;
end $$;
