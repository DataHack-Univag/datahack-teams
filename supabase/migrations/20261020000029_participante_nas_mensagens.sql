-- =============================================================================
-- 029 · "Participante" no lugar de "aluno" nas mensagens do banco
-- -----------------------------------------------------------------------------
-- Edições abertas não têm só alunos: as telas passaram a dizer "participante". Aqui as
-- mensagens de erro que o banco mostra na tela seguem o mesmo nome. Só o texto muda: cada
-- função é recriada a partir da definição atual (pg_get_functiondef), com as mesmas regras
-- e permissões. O papel continua gravado como 'aluno' (é o valor interno).
-- =============================================================================

do $$
declare
  r record;
  d text;
begin
  for r in
    select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosrc ~ '(Só alunos desta edição|não é aluna desta edição|cadastre-a como aluno)'
  loop
    d := pg_get_functiondef(r.oid);
    d := replace(d, 'Só alunos desta edição podem fazer parte de uma equipe.', 'Só participantes desta edição podem fazer parte de uma equipe.');
    d := replace(d, 'Só alunos desta edição propõem equipes.', 'Só participantes desta edição propõem equipes.');
    d := replace(d, 'Essa pessoa não é aluna desta edição.', 'Essa pessoa não é participante desta edição.');
    d := replace(d, 'cadastre-a como aluno primeiro', 'cadastre-a como participante primeiro');
    execute d;
    raise notice 'mensagens atualizadas em %', r.proname;
  end loop;
end $$;
