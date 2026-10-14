-- =============================================================================
-- Testes das regras do banco depois da migração 010 (rodar no Postgres LOCAL com o
-- shim_supabase.sql e os dados sintéticos). Tudo roda numa transação desfeita no fim.
--   psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -f supabase/teste/testes_edicoes.sql
-- Cada bloco falha com uma mensagem clara se a regra não for respeitada.
-- =============================================================================
\set QUIET on
begin;
set lc_messages to 'C';

create or replace function pg_temp.como(p_email text) returns void language sql
as $$ select set_config('request.jwt.claims', json_build_object('email', p_email)::text, false) $$;

create or replace function pg_temp.falha(p_sql text, p_trecho text) returns void language plpgsql
as $$
begin
  execute p_sql;
  raise exception 'ERA PARA FALHAR: %', p_sql;
exception when others then
  if sqlerrm like 'ERA PARA FALHAR%' or position(p_trecho in sqlerrm) = 0 then
    raise exception 'Falhou com a mensagem errada (%): %', p_trecho, sqlerrm;
  end if;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set role authenticated;

-- ---------------------------------------------------------------- aluno
select pg_temp.como('p1@teste.local');
do $$ begin
  assert eh_inscrito(), 'aluno deveria ser inscrito';
  assert not eh_organizador(), 'aluno não é organizador';
  assert (select count(*) from equipes) = 8, 'aluno vê as 8 equipes da edição';
  assert (select count(*) from fichas) = 0, 'aluno não vê fichas';
  assert (select count(*) from notas) = 0, 'aluno não vê notas';
  assert minha_equipe() is not null, 'aluno tem equipe';
  assert (select count(*) from historico) = 0, 'aluno não vê histórico';
end $$;
select pg_temp.falha('delete from links', 'permission denied');
select pg_temp.falha($q$select propor_equipe('Nova', array['p2@teste.local'])$q$, 'formadas pela organização');

-- ---------------------------------------------------------------- banca de professores
select pg_temp.como('p62@teste.local');
do $$
declare v_eq uuid := (select id from equipes order by nome limit 1);
begin
  assert papel_atual() = 'avaliador', 'p62 é avaliador';
  -- avaliação encerrada nos dados sintéticos: a banca não lança.
  assert not pode_avaliar((select id from rubricas where codigo = 'F1_PITCH')), 'avaliação encerrada trava a banca';
end $$;

-- ---------------------------------------------------------------- organização
select pg_temp.como('p56@teste.local');
do $$
declare
  v_ed1 uuid := edicao_atual();
  v_eq  uuid := (select id from equipes order by nome limit 1);
  v_n   int;
begin
  assert eh_organizador_de(v_ed1), 'p56 organiza a edição 1';
  assert (select count(*) from fichas) = 104, 'organização vê todas as fichas';
  -- regulamento protegido: já há fichas
  begin
    update rubricas set peso_final = 10 where codigo = 'NEG';
    raise exception 'ERA PARA FALHAR (peso)';
  exception when others then
    assert sqlerrm like '%já tem fichas%', 'mensagem de regulamento protegido: ' || sqlerrm;
  end;
  update rubricas set nome = nome || ' ' where codigo = 'NEG';  -- texto pode mudar

  -- reabre a avaliação e a banca de professores consegue lançar F1_PITCH, mas não NEG
  update edicoes set avaliacao_encerrada = false where id = v_ed1;

  -- arquivar equipe: integrantes saem, nada é apagado
  select count(*) into v_n from membros where equipe_id = v_eq and saiu_em is null;
  perform arquivar_equipe(v_eq);
  assert (select count(*) from membros where equipe_id = v_eq and saiu_em is null) = 0, 'integrantes saem';
  assert (select count(*) from membros where equipe_id = v_eq) = v_n, 'passagens continuam guardadas';
  assert (select removido_em is not null from equipes where id = v_eq), 'equipe arquivada';
  assert (select count(*) from historico where tabela = 'membros' and operacao = 'UPDATE') >= v_n, 'histórico registrou';
end $$;
select pg_temp.falha('delete from equipes', 'permission denied');

select pg_temp.como('p62@teste.local');
do $$
declare v_eq uuid := (select id from equipes where removido_em is null order by nome limit 1);
        v_f  uuid;
begin
  v_f := salvar_ficha(v_eq, (select id from rubricas where codigo = 'F1_PITCH'), '{"problema": 0.8}'::jsonb, 'ok');
  assert (select n.fator from notas_criterio nc join niveis n on n.id = nc.nivel_id
           where nc.ficha_id = v_f and nc.criterio_id = (select id from criterios where codigo = 'problema'
             and rubrica_id = (select id from rubricas where codigo = 'F1_PITCH'))) = 0.8, 'nota gravada';
  begin
    perform salvar_ficha(v_eq, (select id from rubricas where codigo = 'NEG'), '{}'::jsonb);
    raise exception 'ERA PARA FALHAR (banca errada)';
  exception when others then
    assert sqlerrm like '%não é da sua banca%', 'banca errada: ' || sqlerrm;
  end;
  begin
    perform salvar_ficha(v_eq, (select id from rubricas where codigo = 'F1_PITCH'), '{"problema": 0.7}'::jsonb);
    raise exception 'ERA PARA FALHAR (nível)';
  exception when others then
    assert sqlerrm like '%Nível inválido%', 'nível inválido: ' || sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------- nova edição com proposta dos alunos
select pg_temp.como('p56@teste.local');
do $$
declare
  v_ed1 uuid := edicao_atual();
  v_ed2 uuid;
begin
  v_ed2 := criar_edicao('{"slug":"datahack-2027","nome":"DATAHack Univag 2027","modo_formacao":"alunos_propoem","min_membros":2,"max_membros":4,"data_inicio":"2027-10-08","data_fim":"2027-10-09"}'::jsonb, v_ed1);
  assert (select count(*) from rubricas where edicao_id = v_ed2) = 6, 'regulamento copiado';
  assert (select count(*) from criterio_niveis cn join criterios c on c.id = cn.criterio_id where c.edicao_id = v_ed2) = 116, 'níveis copiados';
  assert (select count(*) from participacoes where edicao_id = v_ed2 and papel = 'organizador') = 6, 'organizadores copiados';
  assert (select count(*) from participacoes where edicao_id = v_ed2 and banca_id is not null) = 6, 'organizadores com banca';
  perform definir_edicao_atual(v_ed2);
  insert into participacoes (edicao_id, email, papel) values (v_ed2, 'p1@teste.local', 'aluno'),
    (v_ed2, 'p2@teste.local', 'aluno'), (v_ed2, 'p3@teste.local', 'aluno'), (v_ed2, 'p4@teste.local', 'aluno');
  assert (select count(*) from equipes where edicao_id = v_ed2) = 0, 'edição nova sem equipes';
end $$;

select pg_temp.como('p1@teste.local');
do $$
declare v_eq uuid;
begin
  assert (select count(*) from equipes where edicao_id = edicao_atual()) = 0, 'edição nova começa sem equipes';
  v_eq := propor_equipe('Os Dados', array['p2@teste.local', 'p3@teste.local']);
  assert (select situacao from equipes where id = v_eq) = 'formando', 'aguardando colegas';
  assert (select lider_email from equipes where id = v_eq) = 'p1@teste.local', 'quem propõe é o líder';
  perform set_config('dh.equipe', v_eq::text, false);
end $$;
select pg_temp.falha($q$select propor_equipe('Outra', array[]::text[])$q$, 'já está numa equipe');

select pg_temp.como('p2@teste.local');
select responder_convite(current_setting('dh.equipe')::uuid, true);
select pg_temp.como('p3@teste.local');
select responder_convite(current_setting('dh.equipe')::uuid, false);
do $$ begin
  assert (select situacao from equipes where id = current_setting('dh.equipe')::uuid) = 'aguardando_aprovacao',
    'com 2 confirmados e nenhum convite pendente, vai para aprovação';
  assert minha_equipe() is null, 'quem recusou não está na equipe';
end $$;
select pg_temp.falha($q$select analisar_equipe(current_setting('dh.equipe')::uuid, true)$q$, 'Só a organização');

select pg_temp.como('p56@teste.local');
select analisar_equipe(current_setting('dh.equipe')::uuid, true);
do $$ begin
  assert (select situacao from equipes where id = current_setting('dh.equipe')::uuid) = 'aprovada', 'aprovada';
  assert (select count(*) from membros where equipe_id = current_setting('dh.equipe')::uuid and saiu_em is null) = 2, 'dois integrantes';
end $$;

-- Trocas: a edição 2 não permite.
select pg_temp.como('p1@teste.local');
select pg_temp.falha($q$select pedir_troca(current_setting('dh.equipe')::uuid)$q$, 'não há troca');

-- ---------------------------------------------------------------- 011 · presença
-- Só a organização registra presença; aluno não se marca presente.
select pg_temp.como('p1@teste.local');
do $$ begin
  update participacoes set presenca = 'presente' where email = 'p1@teste.local';
  assert not exists (select 1 from participacoes where email = 'p1@teste.local' and presenca is not null),
    'aluno não pode registrar a própria presença';
end $$;
select pg_temp.como('p56@teste.local');
do $$
declare v_ed uuid := (select id from edicoes where numero = 1);
begin
  update participacoes set presenca = 'ausente', presenca_em = now(), presenca_por = 'p56@teste.local'
   where edicao_id = v_ed and email = 'p4@teste.local';
  assert (select presenca from participacoes where edicao_id = v_ed and email = 'p4@teste.local') = 'ausente', 'organização marca ausência';
  update membros set saiu_em = now(), motivo_saida = 'ausente' where edicao_id = v_ed and email = 'p4@teste.local' and saiu_em is null;
  assert exists (select 1 from participacoes where edicao_id = v_ed and email = 'p4@teste.local' and removido_em is null),
    'ausente continua inscrito na edição';
end $$;
select pg_temp.falha($q$update participacoes set presenca = 'talvez' where email = 'p4@teste.local'$q$, 'presenca_check');

reset role;
rollback;
\echo 'OK: todas as regras das migrações 010 e 011 conferem.'
