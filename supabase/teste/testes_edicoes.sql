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
grant execute on all functions in schema pg_temp to authenticated, anon;

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

-- ---------------------------------------------------------------- 016 · substituir o regulamento
select pg_temp.como('p56@teste.local');
select pg_temp.falha($q$select substituir_regulamento((select id from edicoes where numero = 1), exportar_regulamento((select id from edicoes where numero = 1)))$q$, 'já tem fichas');
do $$
declare
  v_ed1 uuid := (select id from edicoes where numero = 1);
  v_ed uuid;
  v_reg jsonb;
  r jsonb;
begin
  v_ed := criar_edicao('{"slug":"datahack-teste-reg","nome":"Edição de teste do regulamento"}'::jsonb, v_ed1);
  insert into participacoes (edicao_id, email, papel, banca_id)
  values (v_ed, 'p62@teste.local', 'avaliador', (select id from bancas where edicao_id = v_ed and codigo = 'professores'));
  -- novo regulamento: só uma rubrica de negócio valendo 100%
  v_reg := jsonb_set(exportar_regulamento(v_ed1), '{fases}', '[{"codigo":"NEG","nome":"Negócio","peso":100}]'::jsonb);
  v_reg := jsonb_set(v_reg, '{rubricas}', (select jsonb_agg(jsonb_set(x, '{peso_final}', '100')) from jsonb_array_elements(v_reg -> 'rubricas') x where x ->> 'codigo' = 'NEG'));
  v_reg := jsonb_set(v_reg, '{desempate}', '[{"descricao":"Decisão das bancas","tipo":"manual"}]'::jsonb);
  r := substituir_regulamento(v_ed, v_reg);
  assert (select count(*) from rubricas where edicao_id = v_ed) = 1, 'regulamento trocado';
  assert (select count(*) from historico where tabela = 'regulamento' and operacao = 'SUBSTITUIR') = 1, 'o anterior fica no histórico';
  assert (select b.codigo from participacoes p join bancas b on b.id = p.banca_id where p.edicao_id = v_ed and p.email = 'p62@teste.local') = 'professores', 'a banca da pessoa é religada pelo código';
  assert (r ->> 'avaliadores_sem_banca')::int = 0, 'ninguém ficou sem banca';
end $$;
select pg_temp.falha($q$delete from bancas where codigo = 'professores'$q$, 'permission denied');

-- ---------------------------------------------------------------- 017 · instituições, acesso e marca
select pg_temp.como('p56@teste.local');
do $$
declare
  v_ed1 uuid := (select id from edicoes where numero = 1);
  v_uv  uuid := (select id from instituicoes where sigla = 'UNIVAG');
  v_uf  uuid;
  v_ed  uuid;
begin
  assert (select acesso from edicoes where id = v_ed1) = 'lista', 'edições de antes viram lista';
  assert exists (select 1 from edicao_instituicoes where edicao_id = v_ed1 and instituicao_id = v_uv), 'e ficam ligadas à Univag';
  insert into instituicoes (nome, sigla, uf) values ('Universidade Federal de Mato Grosso', 'UFMT', 'MT') returning id into v_uf;
  -- edição nova copiando a 1: herda acesso e instituições
  v_ed := criar_edicao('{"slug":"datahack-teste-acesso","nome":"Edição de teste do acesso"}'::jsonb, v_ed1);
  assert (select acesso from edicoes where id = v_ed) = 'lista', 'acesso copiado';
  assert (select count(*) from edicao_instituicoes where edicao_id = v_ed and removido_em is null) = 1, 'instituições copiadas';
  assert (select marca ->> 'logo' from edicoes where id = v_ed1) = '/logo-datahack.png', 'a Edição 1 fica com a logo de sempre';
  assert (select marca from edicoes where id = v_ed) = '{}'::jsonb, 'a edição nova começa sem logo';
  -- vira evento de várias instituições, com marca própria
  perform definir_acesso_edicao(v_ed, '{"acesso":"instituicoes","aprovacao":"manual","vagas":"120","marca":{"nome_publico":"DATAHack Cuiabá","cor":"#0f8a5f"}}'::jsonb, array[v_uf, v_uv]);
  assert (select vagas from edicoes where id = v_ed) = 120, 'vagas gravadas';
  assert (select marca ->> 'nome_publico' from edicoes where id = v_ed) = 'DATAHack Cuiabá', 'marca gravada';
  assert (select array_agg(instituicao_id order by ordem) from edicao_instituicoes where edicao_id = v_ed and removido_em is null) = array[v_uf, v_uv], 'instituições na ordem escolhida';
  -- tirar a Univag: fica arquivada, não apagada; e volta se escolher de novo
  perform definir_acesso_edicao(v_ed, '{"acesso":"instituicoes"}'::jsonb, array[v_uf]);
  assert (select removido_em is not null from edicao_instituicoes where edicao_id = v_ed and instituicao_id = v_uv), 'Univag arquivada';
  perform definir_acesso_edicao(v_ed, '{"acesso":"aberto"}'::jsonb, array[v_uf, v_uv]);
  assert (select removido_em is null from edicao_instituicoes where edicao_id = v_ed and instituicao_id = v_uv), 'Univag de volta';
  assert (select vagas from edicoes where id = v_ed) is null, 'sem vagas = sem limite';
  perform set_config('dh.ed_acesso', v_ed::text, false);
end $$;
select pg_temp.falha($q$select definir_acesso_edicao(current_setting('dh.ed_acesso')::uuid, '{"acesso":"instituicoes"}'::jsonb, '{}')$q$, 'ao menos uma instituição');
select pg_temp.falha($q$select definir_acesso_edicao(current_setting('dh.ed_acesso')::uuid, '{"acesso":"aberto","marca":{"logo":"javascript:alert(1)"}}'::jsonb, '{}')$q$, 'edicoes_marca_check');
select pg_temp.falha($q$insert into instituicoes (nome, logo_svg) values ('Logo perigosa', '<svg onload="alert(1)"></svg>')$q$, 'instituicoes_logo_svg_check');
select pg_temp.falha($q$insert into instituicoes (nome, logo_svg) values ('Logo com script', '<svg><script>alert(1)</script></svg>')$q$, 'instituicoes_logo_svg_check');
insert into instituicoes (nome, logo_svg) values ('Logo boa', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
select pg_temp.falha($q$delete from instituicoes where nome = 'Logo boa'$q$, 'permission denied');

-- aluno lê as instituições (para a logo), mas não cadastra nem muda o acesso
select pg_temp.como('p1@teste.local');
do $$ begin assert (select count(*) from instituicoes) >= 2, 'aluno vê as instituições'; end $$;
select pg_temp.falha($q$insert into instituicoes (nome) values ('Fake')$q$, 'row-level security');
select pg_temp.falha($q$select definir_acesso_edicao(current_setting('dh.ed_acesso')::uuid, '{"acesso":"aberto"}'::jsonb, '{}')$q$, 'Só a organização');

-- ---------------------------------------------------------------- 018 · formulário de inscrição
select pg_temp.como('p56@teste.local');
do $$
declare
  v_ed   uuid := current_setting('dh.ed_acesso')::uuid;   -- a edição aberta do bloco 017
  v_ed1  uuid := (select id from edicoes where numero = 1);
  v_uf   uuid := (select id from instituicoes where sigla = 'UFMT');
  v_err  text[];
begin
  assert (select count(*) from campos_inscricao where edicao_id = v_ed1 and removido_em is null) = 2, 'edição 1 pergunta curso e semestre';
  assert (select count(*) from inscricoes where edicao_id = v_ed1 and situacao = 'aprovada') > 0, 'alunos da edição 1 viraram inscrições';
  assert (select instituicao_id from inscricoes where edicao_id = v_ed1 limit 1) = (select id from instituicoes where sigla = 'UNIVAG'), 'evento fechado: instituição do evento';

  perform definir_campos_inscricao(v_ed, $j$[
    {"chave":"cidade","rotulo":"Cidade","tipo":"texto","obrigatorio":true},
    {"chave":"instituicao","rotulo":"Instituição","tipo":"instituicao","obrigatorio":true},
    {"chave":"trabalha","rotulo":"Está trabalhando?","tipo":"sim_nao","obrigatorio":true},
    {"chave":"cargo","rotulo":"Cargo","tipo":"escolha","opcoes":["Estagiário","Outro"],"condicao":{"campo":"trabalha","igual":true},"obrigatorio":true},
    {"chave":"cargo_outro","rotulo":"Qual o seu cargo?","tipo":"texto","condicao":{"campo":"cargo","igual":"Outro"},"obrigatorio":true},
    {"chave":"camiseta","rotulo":"Camiseta","tipo":"escolha","opcoes":["P","M","G"],"obrigatorio":false},
    {"chave":"termo","rotulo":"Aceito","tipo":"aceite","obrigatorio":true}
  ]$j$::jsonb);
  assert (select count(*) from campos_inscricao where edicao_id = v_ed and removido_em is null) = 7, 'formulário salvo';
  assert (select catalogo_id is not null from campos_inscricao where edicao_id = v_ed and chave = 'cargo'), 'pergunta do catálogo ligada a ele';

  v_err := validar_respostas(v_ed, '{}'::jsonb);
  assert cardinality(v_err) = 4, 'faltam cidade, instituição, trabalha e o termo (camiseta é opcional): ' || array_to_string(v_err, ' | ');
  v_err := validar_respostas(v_ed, jsonb_build_object('cidade', 'Sinop', 'instituicao', v_uf, 'trabalha', false, 'termo', true));
  assert cardinality(v_err) = 0, 'quem não trabalha não responde cargo: ' || array_to_string(v_err, ' | ');
  v_err := validar_respostas(v_ed, jsonb_build_object('cidade', 'Sinop', 'instituicao', 'outra', 'trabalha', true, 'cargo', 'Outro', 'termo', true));
  assert v_err = array['Responda: Qual o seu cargo?'], 'cargo Outro pede o texto: ' || array_to_string(v_err, ' | ');
  v_err := validar_respostas(v_ed, jsonb_build_object('cidade', 'Sinop', 'instituicao', 'outra', 'trabalha', false, 'cargo', 'Estagiário', 'camiseta', 'XXL', 'cpf', '1', 'termo', true));
  assert cardinality(v_err) = 3, 'cargo que não se aplica, opção fora da lista e pergunta inexistente: ' || array_to_string(v_err, ' | ');

  -- inscrição pelo formulário: respostas conferidas e instituição na coluna própria
  insert into inscricoes (edicao_id, email, respostas, origem)
  values (v_ed, 'p20@teste.local', jsonb_build_object('cidade', 'Sinop', 'instituicao', v_uf, 'trabalha', false, 'termo', true), 'formulario');
  assert (select instituicao_id from inscricoes where edicao_id = v_ed and email = 'p20@teste.local') = v_uf, 'instituição gravada';
  assert (select situacao from inscricoes where edicao_id = v_ed and email = 'p20@teste.local') = 'pendente', 'formulário começa pendente';

  -- tirar uma pergunta arquiva; pôr de volta reativa
  perform definir_campos_inscricao(v_ed, '[{"chave":"cidade","rotulo":"Cidade","tipo":"texto"}]'::jsonb);
  assert (select count(*) from campos_inscricao where edicao_id = v_ed and removido_em is not null) = 6, 'perguntas tiradas ficam arquivadas';
  perform set_config('dh.ed_form', v_ed::text, false);
end $$;
select pg_temp.falha($q$insert into inscricoes (edicao_id, email, respostas, origem) values (current_setting('dh.ed_form')::uuid, 'p21@teste.local', '{}', 'formulario')$q$, 'Responda: Cidade');
select pg_temp.falha($q$select definir_campos_inscricao(current_setting('dh.ed_form')::uuid, '[{"chave":"cargo","rotulo":"Cargo","tipo":"escolha","opcoes":["A"],"condicao":{"campo":"trabalha","igual":true}}]')$q$, 'precisa vir antes');
select pg_temp.falha($q$select definir_campos_inscricao(current_setting('dh.ed_form')::uuid, '[{"chave":"x","rotulo":"X","tipo":"escolha","opcoes":[]}]')$q$, 'pelo menos uma opção');
select pg_temp.falha($q$delete from inscricoes$q$, 'permission denied');

-- aluno cadastrado em Pessoas vira inscrição aprovada, e acompanha as mudanças
do $$
declare v_ed1 uuid := (select id from edicoes where numero = 1);
begin
  insert into pessoas (email, nome) values ('novo@teste.local', 'Aluno Novo') on conflict do nothing;
  insert into participacoes (edicao_id, email, papel, curso, semestre) values (v_ed1, 'novo@teste.local', 'aluno', 'SI', 3);
  assert (select respostas from inscricoes where edicao_id = v_ed1 and email = 'novo@teste.local') = '{"curso":"SI","semestre":3}'::jsonb, 'inscrição criada com curso e semestre';
  update participacoes set semestre = 4 where edicao_id = v_ed1 and email = 'novo@teste.local';
  assert (select respostas ->> 'semestre' from inscricoes where edicao_id = v_ed1 and email = 'novo@teste.local') = '4', 'semestre acompanha';
  update participacoes set removido_em = now() where edicao_id = v_ed1 and email = 'novo@teste.local';
  assert (select situacao from inscricoes where edicao_id = v_ed1 and email = 'novo@teste.local') = 'cancelada', 'removido = inscrição cancelada';
end $$;

-- aluno vê só a própria inscrição e não muda o formulário
select pg_temp.como('p1@teste.local');
do $$ begin
  assert (select count(*) from inscricoes where email <> 'p1@teste.local') = 0, 'aluno vê só as suas inscrições';
  assert (select count(*) from perguntas_catalogo) >= 10, 'aluno lê o catálogo';
end $$;
select pg_temp.falha($q$select definir_campos_inscricao(current_setting('dh.ed_form')::uuid, '[]')$q$, 'Só a organização');
do $$
declare n int;
begin
  update inscricoes set situacao = 'aprovada' where situacao = 'aprovada';
  get diagnostics n = row_count;
  assert n = 0, 'aluno não muda inscrição (nem a própria)';
end $$;

-- ---------------------------------------------------------------- 020 · inscrição pública
select pg_temp.como('p56@teste.local');
do $$
declare v_ed uuid := current_setting('dh.ed_form')::uuid;   -- edição aberta, pergunta só "Cidade"
begin
  perform definir_acesso_edicao(v_ed, '{"acesso":"aberto","aprovacao":"automatica","vagas":"1"}'::jsonb, '{}');
  assert definir_termo(v_ed, 'Os dados servem só para organizar o evento e não são repassados a ninguém.') = 1, 'termo versão 1';
  assert definir_termo(v_ed, 'Os dados servem só para organizar o evento e não são repassados a ninguém.') = 1, 'mesmo texto, mesma versão';
  -- quem já tinha inscrição (do bloco 018) sai, para começar a contagem de vagas do zero
  update inscricoes set situacao = 'cancelada' where edicao_id = v_ed;
  perform set_config('dh.slug1', (select slug from edicoes where numero = 1), false);
end $$;

-- sem login: vê a edição e se inscreve
reset role;
set role anon;
select pg_temp.como('');
do $$
declare
  j jsonb := edicao_publica('datahack-teste-acesso');
  r jsonb;
begin
  assert j ->> 'situacao' = 'aberta', 'inscrições abertas';
  assert jsonb_array_length(j -> 'campos') = 1 and (j -> 'termo' ->> 'versao')::int = 1, 'perguntas e termo na página pública';
  assert edicao_publica(current_setting('dh.slug1')) is null, 'evento fechado não aparece';
  r := inscrever_publico('datahack-teste-acesso', 'Maria Pública', 'Maria.Publica@Gmail.com', '{"cidade":"Sinop"}', 1);
  assert r ->> 'situacao' = 'aprovada', 'primeira vaga: aprovada na hora';
  r := inscrever_publico('datahack-teste-acesso', 'João Espera', 'joao.espera@teste.local', '{"cidade":"Cuiabá"}', 1);
  assert r ->> 'situacao' = 'espera', 'lotou: lista de espera';
  r := inscrever_publico('datahack-teste-acesso', 'Maria Pública', 'mariapublica@gmail.com', '{"cidade":"Sinop"}', 1);
  assert (r ->> 'ja_inscrito')::boolean and r ->> 'email' = 'maria.publica@gmail.com', 'mesmo Gmail sem pontos: já inscrita';
end $$;
select pg_temp.falha($q$select inscrever_publico('datahack-teste-acesso', 'Sem Termo', 'semtermo@teste.local', '{"cidade":"X"}', null)$q$, 'aceite o termo');
select pg_temp.falha($q$select inscrever_publico('datahack-teste-acesso', 'Sem Cidade', 'semcidade@teste.local', '{}', 1)$q$, 'Responda: Cidade');
select pg_temp.falha($q$select inscrever_publico('datahack-teste-acesso', 'Fulano', 'x@teste.local', '{"cidade":"X"}', 1)$q$, 'nome completo');
select pg_temp.falha($q$select inscrever_publico(current_setting('dh.slug1'), 'Ana Lista', 'ana@teste.local', '{}', null)$q$, 'não recebe inscrições');
select pg_temp.falha($q$select decidir_inscricao((select id from inscricoes limit 1), 'aprovada')$q$, 'permission denied');
select pg_temp.falha($q$select * from inscricoes$q$, 'permission denied');
reset role;
set role authenticated;
select pg_temp.como('p56@teste.local');

do $$
declare v_ed uuid := current_setting('dh.ed_form')::uuid;
begin
  assert exists (select 1 from participacoes where edicao_id = v_ed and email = 'maria.publica@gmail.com' and papel = 'aluno' and removido_em is null), 'aprovada = participa da edição';
  assert not exists (select 1 from participacoes where edicao_id = v_ed and email = 'joao.espera@teste.local'), 'na espera ainda não participa';
end $$;

-- quem está na espera acompanha, mas não entra no sistema da edição
select pg_temp.como('joao.espera@teste.local');
do $$ begin
  assert (minhas_inscricoes() -> 0 ->> 'situacao') = 'espera' and (minhas_inscricoes() -> 0 ->> 'posicao')::int = 1, 'primeiro da fila';
  assert not participa_de(current_setting('dh.ed_form')::uuid), 'sem acesso à edição';
end $$;

-- a organização cancela a aprovada: a vaga vai para o primeiro da espera
select pg_temp.como('p56@teste.local');
do $$
declare
  v_ed uuid := current_setting('dh.ed_form')::uuid;
  r jsonb;
begin
  r := decidir_inscricao((select id from inscricoes where edicao_id = v_ed and email = 'maria.publica@gmail.com'), 'cancelada');
  assert (r ->> 'promovidas')::int = 1, 'um da espera entrou';
  assert (select situacao from inscricoes where edicao_id = v_ed and email = 'joao.espera@teste.local') = 'aprovada', 'João aprovado';
  assert exists (select 1 from participacoes where edicao_id = v_ed and email = 'joao.espera@teste.local' and removido_em is null), 'João participa';
  assert (select removido_em is not null from participacoes where edicao_id = v_ed and email = 'maria.publica@gmail.com'), 'Maria saiu da edição';
  assert (select situacao from inscricoes where edicao_id = v_ed and email = 'maria.publica@gmail.com') = 'cancelada', 'e a decisão ficou';
  -- aprovação manual: quem se inscreve espera a organização
  perform definir_acesso_edicao(v_ed, '{"acesso":"aberto","aprovacao":"manual"}'::jsonb, '{}');
end $$;
reset role;
set role anon;
do $$ begin
  assert inscrever_publico('datahack-teste-acesso', 'Pedro Manual', 'pedro@teste.local', '{"cidade":"Sorriso"}', 1) ->> 'situacao' = 'pendente', 'manual: pendente';
end $$;
reset role;
set role authenticated;
select pg_temp.como('p56@teste.local');
do $$
declare v_ed uuid := current_setting('dh.ed_form')::uuid;
begin
  perform decidir_inscricao((select id from inscricoes where edicao_id = v_ed and email = 'pedro@teste.local'), 'aprovada');
  assert exists (select 1 from participacoes where edicao_id = v_ed and email = 'pedro@teste.local' and removido_em is null), 'aprovado pela organização = participa';
end $$;

reset role;
rollback;
\echo 'OK: todas as regras das migrações 010 a 020 conferem.'
