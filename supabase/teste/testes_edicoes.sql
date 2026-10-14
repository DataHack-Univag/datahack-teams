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

-- ---------------------------------------------------------------- 012 · mentoria
-- A organização cadastra um mentor; ele vê equipes e alunos, registra presença e nada mais.
select pg_temp.como('p56@teste.local');
do $$
declare v_ed uuid := (select id from edicoes where numero = 1);
begin
  insert into pessoas (email, nome) values ('mentor@teste.local', 'Mentora Teste');
  insert into participacoes (edicao_id, email, papel) values (v_ed, 'mentor@teste.local', 'mentor');
end $$;

select pg_temp.como('mentor@teste.local');
do $$
declare v_ed uuid := (select id from edicoes where numero = 1);
begin
  assert (select count(*) from equipes where edicao_id = v_ed) > 0, 'mentor vê as equipes';
  assert (select count(*) from participacoes where edicao_id = v_ed and papel = 'aluno') > 0, 'mentor vê os alunos';
  assert (select count(*) from notas) = 0, 'mentor não vê notas';
  assert (select count(*) from fichas) = 0, 'mentor não vê fichas';
  perform registrar_presenca(v_ed, 'p2@teste.local', 'presente');
  assert (select presenca from participacoes where edicao_id = v_ed and email = 'p2@teste.local') = 'presente', 'mentor registra presença';
  assert (select presenca_por from participacoes where edicao_id = v_ed and email = 'p2@teste.local') = 'mentor@teste.local', 'fica registrado quem marcou';
  perform registrar_presenca(v_ed, 'p2@teste.local', null);
  assert (select presenca from participacoes where edicao_id = v_ed and email = 'p2@teste.local') is null, 'desfazer limpa o registro';
  update participacoes set curso = 'X' where edicao_id = v_ed and email = 'p2@teste.local';
  assert (select curso from participacoes where edicao_id = v_ed and email = 'p2@teste.local') is distinct from 'X',
    'mentor não altera a participação por fora da função';
end $$;
select pg_temp.falha($q$select registrar_presenca((select id from edicoes where numero = 1), 'p56@teste.local', 'presente')$q$, 'não é aluna');
select pg_temp.falha($q$select registrar_presenca((select id from edicoes where numero = 1), 'p2@teste.local', 'talvez')$q$, 'Presença inválida');

select pg_temp.como('p1@teste.local');
select pg_temp.falha($q$select registrar_presenca((select id from edicoes where numero = 1), 'p2@teste.local', 'presente')$q$, 'Só a organização e a mentoria');
select pg_temp.como('p62@teste.local');
select pg_temp.falha($q$select registrar_presenca((select id from edicoes where numero = 1), 'p2@teste.local', 'presente')$q$, 'Só a organização e a mentoria');

-- ---------------------------------------------------------------- 013 · mapa
select pg_temp.como('p56@teste.local');
do $$
declare v_ed uuid := (select id from edicoes where numero = 1); r jsonb;
begin
  r := importar_mapa(v_ed, '{"pisos":[{"nome":"Térreo","salas":[{"nome":"Lab 1","largura_m":8,"profundidade_m":6,"elementos":[{"tipo":"bancada","rotulo":"B1","x_m":1,"y_m":1,"largura_m":3.2,"profundidade_m":0.8,"lugares":2}]}]}]}'::jsonb);
  assert r = '{"pisos": 1, "salas": 1, "elementos": 1}'::jsonb, 'importa piso, sala e bancada';
  assert (exportar_mapa(v_ed) #>> '{pisos,0,salas,0,elementos,0,largura_m}')::numeric = 3.2, 'exporta em metros';
end $$;
select pg_temp.falha($q$select importar_mapa((select id from edicoes where numero = 1), '{"pisos":[{"nome":"Térreo","salas":[{"nome":"Lab 1","largura_m":8,"profundidade_m":6}]}]}'::jsonb)$q$, 'já existe');
select pg_temp.como('p1@teste.local');
do $$ begin
  assert (select count(*) from mapa_elementos) = 1, 'aluno vê o mapa da edição';
  update mapa_elementos set x_cm = 0;
  assert (select x_cm from mapa_elementos limit 1) = 100, 'aluno não mexe no mapa';
end $$;
select pg_temp.falha($q$select importar_mapa((select id from edicoes where numero = 1), '{"pisos":[{"nome":"X","salas":[]}]}'::jsonb)$q$, 'Só a organização');
select pg_temp.falha($q$delete from mapa_elementos$q$, 'permission denied');

-- ---------------------------------------------------------------- 014 · equipes no mapa
-- (usa a sala Lab 1 importada no bloco 013: uma bancada B1 com 2 lugares)
select pg_temp.como('p56@teste.local');
do $$
declare
  v_ed uuid := (select id from edicoes where numero = 1);
  v_b1 uuid := (select id from mapa_elementos where rotulo = 'B1' and removido_em is null);
  v_e1 uuid; v_e2 uuid; r jsonb;
begin
  select id into v_e1 from equipes where edicao_id = v_ed and situacao = 'aprovada' and removido_em is null order by nome limit 1;
  select id into v_e2 from equipes where edicao_id = v_ed and situacao = 'aprovada' and removido_em is null and id <> v_e1 order by nome limit 1;
  perform set_config('dh.e1', v_e1::text, false);
  perform alocar_equipe(v_e1, v_b1, 1);
  perform alocar_equipe(v_e2, v_b1, 2);
  r := alocar_equipe(v_e1, v_b1, 2);
  assert r ->> 'trocou_com' is not null, 'lugar ocupado: as duas trocam';
  assert (select lugar from alocacoes where equipe_id = v_e2 and ate is null) = 1, 'a outra foi para o lugar antigo';
  assert (select count(*) from alocacoes where equipe_id = v_e1) = 2, 'o lugar anterior fica no histórico';
  perform desalocar_equipe(v_e2);
  assert not exists (select 1 from alocacoes where equipe_id = v_e2 and ate is null), 'tirar do lugar';
  update equipes set icone = '🐼' where id = v_e1;
end $$;
select pg_temp.falha($q$select alocar_equipe(current_setting('dh.e1')::uuid, (select id from mapa_elementos where rotulo = 'B1'), 3)$q$, '2 lugar');

select pg_temp.como('p1@teste.local');
select pg_temp.falha($q$select alocar_equipe(current_setting('dh.e1')::uuid, (select id from mapa_elementos where rotulo = 'B1'), 1)$q$, 'Só a organização');
do $$ begin
  assert (select count(*) from alocacoes where ate is null) = 1, 'aluno vê onde as equipes estão';
end $$;

-- ---------------------------------------------------------------- 015 · chamados
-- (a edição 1 volta a ser a atual; quem pede ajuda é um integrante de uma equipe aprovada dela)
reset role;
update edicoes set atual = false;
update edicoes set atual = true where numero = 1;
select set_config('dh.aluno', (select m.email from membros m join equipes e on e.id = m.equipe_id
                               join edicoes ed on ed.id = e.edicao_id and ed.numero = 1
                              where m.saiu_em is null and m.situacao = 'confirmado' and e.situacao = 'aprovada' and e.removido_em is null
                              order by m.email limit 1), false);
set role authenticated;
select pg_temp.como(current_setting('dh.aluno'));
do $$
declare v_id uuid;
begin
  v_id := abrir_chamado('duvida', 'Como junto as bases?');
  perform set_config('dh.chamado', v_id::text, false);
  assert (select situacao from chamados where id = v_id) = 'aberto', 'equipe abre o chamado';
end $$;
select pg_temp.falha($q$select abrir_chamado('problema')$q$, 'já tem um pedido');
select pg_temp.falha($q$select atender_chamado(current_setting('dh.chamado')::uuid)$q$, 'Só a mentoria e a organização');

-- outra equipe não vê o chamado
select pg_temp.como((select m.email from membros m join equipes e on e.id = m.equipe_id
                      where m.saiu_em is null and m.situacao = 'confirmado' and e.situacao = 'aprovada' and e.removido_em is null
                        and m.equipe_id <> (select equipe_id from chamados where id = current_setting('dh.chamado')::uuid) limit 1));
do $$ begin assert (select count(*) from chamados) = 0, 'outra equipe não vê o chamado'; end $$;

select pg_temp.como('mentor@teste.local');
do $$
declare v_id uuid := current_setting('dh.chamado')::uuid;
begin
  assert (select count(*) from chamados) = 1, 'mentoria vê o chamado';
  perform atender_chamado(v_id);
  assert (select atendido_por from chamados where id = v_id) = 'mentor@teste.local', 'vou atender';
  perform atender_chamado(v_id, true);
  assert (select situacao from chamados where id = v_id) = 'resolvido', 'resolvido';
  perform reabrir_chamado(v_id);
  assert (select situacao from chamados where id = v_id) = 'aberto', 'desfazer reabre';
end $$;

select pg_temp.como(current_setting('dh.aluno'));
select fechar_chamado_da_equipe(current_setting('dh.chamado')::uuid, true);
do $$ begin assert (select situacao from chamados where id = current_setting('dh.chamado')::uuid) = 'resolvido', 'a equipe avisa que resolveu'; end $$;

reset role;
rollback;
\echo 'OK: todas as regras das migrações 010 a 015 conferem.'
