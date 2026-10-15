-- =============================================================================
-- 016 · Substituir o regulamento enquanto a edição não tem nenhuma ficha
-- Para planejar uma edição indo e voltando (ex.: com uma IA): importar, ajustar, importar de
-- novo. Só é permitido antes da primeira ficha (com fichas, mudar pesos mudaria notas dadas).
-- Nada se perde: o regulamento anterior inteiro fica no histórico (tabela "regulamento").
-- =============================================================================

-- "Nada é apagado" continua valendo, com uma única exceção: as tabelas do regulamento,
-- de dentro de substituir_regulamento (que marca a transação com dh.trocar_regulamento).
create or replace function public.impedir_apagar()
returns trigger language plpgsql
as $$
begin
  if current_setting('dh.trocar_regulamento', true) = '1'
     and tg_table_name in ('bancas', 'fases', 'rubricas', 'criterios', 'niveis', 'criterio_niveis', 'penalidades', 'regras_desempate') then
    return old;
  end if;
  raise exception 'Os dados do DataHack não são apagados (%). Use o arquivamento.', tg_table_name;
end $$;

create or replace function public.substituir_regulamento(p_edicao uuid, p_json jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_antigo   jsonb;
  v_sem_banca int;
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição define o regulamento.' using errcode = '42501';
  end if;
  if exists (select 1 from fichas where edicao_id = p_edicao) then
    raise exception 'Esta edição já tem fichas lançadas: o regulamento não pode mais ser trocado (só os textos podem ser corrigidos).';
  end if;
  if exists (select 1 from penalidades_equipe where edicao_id = p_edicao) then
    raise exception 'Esta edição já tem penalidades aplicadas: o regulamento não pode mais ser trocado.';
  end if;

  v_antigo := exportar_regulamento(p_edicao);

  -- Banca de cada pessoa, pelo código, para religar depois da troca.
  create temp table _bancas_pessoas on commit drop as
    select p.email, b.codigo from participacoes p join bancas b on b.id = p.banca_id where p.edicao_id = p_edicao;
  update participacoes set banca_id = null where edicao_id = p_edicao and banca_id is not null;

  perform set_config('dh.trocar_regulamento', '1', true);
  delete from regras_desempate where edicao_id = p_edicao;
  delete from criterio_niveis where criterio_id in (select id from criterios where edicao_id = p_edicao);
  delete from criterios where edicao_id = p_edicao;
  delete from rubricas where edicao_id = p_edicao;
  delete from penalidades where edicao_id = p_edicao;
  delete from fases where edicao_id = p_edicao;
  delete from niveis where edicao_id = p_edicao;
  delete from bancas where edicao_id = p_edicao;
  perform set_config('dh.trocar_regulamento', '0', true);

  perform importar_regulamento(p_edicao, p_json);

  -- Religa as bancas pelo código; a organização vai para a banca da organização.
  update participacoes p set banca_id = b.id
    from _bancas_pessoas x join bancas b on b.codigo = x.codigo and b.edicao_id = p_edicao
   where p.edicao_id = p_edicao and p.email = x.email;
  update participacoes set banca_id = (select id from bancas where edicao_id = p_edicao and da_organizacao limit 1)
   where edicao_id = p_edicao and papel = 'organizador' and banca_id is null;
  select count(*) into v_sem_banca from participacoes where edicao_id = p_edicao and papel = 'avaliador' and banca_id is null and removido_em is null;

  insert into historico (tabela, operacao, antes, depois, por)
  values ('regulamento', 'SUBSTITUIR', v_antigo, p_json, nullif(email_atual(), ''));

  return jsonb_build_object('avaliadores_sem_banca', v_sem_banca);
end $$;

revoke all on function public.substituir_regulamento(uuid, jsonb) from public, anon;
grant execute on function public.substituir_regulamento(uuid, jsonb) to authenticated;
