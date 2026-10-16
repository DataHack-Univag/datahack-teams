-- =============================================================================
-- 032 · Pode não haver edição atual
-- -----------------------------------------------------------------------------
-- Entre uma edição e outra (a última já encerrada, a próxima ainda em planejamento), a
-- organização pode deixar o sistema sem edição atual:
--   · a tela de login mostra a última edição encerrada (com a logo e a cor dela);
--   · nenhuma inscrição pelo site abre (só abre na edição atual, 027);
--   · cada pessoa continua entrando e vendo as edições de que participou.
-- E corrige a leitura dos nomes: antes só quem estava na edição ATUAL via a tabela de
-- pessoas (quem consultava uma edição anterior ficava sem os nomes dos colegas). Agora cada
-- pessoa vê quem dividiu alguma edição com ela; a organização vê todos.
-- =============================================================================

-- Organização: deixar o sistema sem edição atual.
create or replace function public.limpar_edicao_atual()
returns void language plpgsql security definer set search_path = public
as $$
declare v_atual uuid := (select id from edicoes where atual);
begin
  if v_atual is null then
    return;
  end if;
  if not eh_organizador_de(v_atual) then
    raise exception 'Só a organização da edição atual pode deixar o sistema sem edição atual.';
  end if;
  update edicoes set atual = false where id = v_atual;
end $$;
revoke all on function public.limpar_edicao_atual() from public, anon;
grant execute on function public.limpar_edicao_atual() to authenticated;

-- Login: a edição atual ou, sem ela, a última encerrada. "eh_atual" diz qual dos dois é.
create or replace function public.vitrine()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'atual', (select jsonb_build_object('nome', nome, 'marca', marca, 'local', local, 'data_inicio', data_inicio, 'data_fim', data_fim,
                                        'numero', numero,
                                        'slug', case when acesso <> 'lista' then slug end,
                                        'inscricao', situacao_inscricao(id),
                                        'situacao', situacao,
                                        'eh_atual', atual)
                from edicoes
               where atual or (situacao = 'encerrada' and not exists (select 1 from edicoes x where x.atual))
               order by atual desc, data_inicio desc nulls last, numero desc
               limit 1),
    'inscricoes', coalesce((select jsonb_agg(jsonb_build_object(
                     'slug', slug, 'nome', coalesce(marca ->> 'nome_publico', nome), 'situacao', situacao_inscricao(id),
                     'data_inicio', data_inicio, 'local', local) order by data_inicio nulls last)
                   from edicoes where acesso <> 'lista' and situacao_inscricao(id) in ('aberta', 'em_breve')), '[]'::jsonb)
  )
$$;
revoke all on function public.vitrine() from public;
grant execute on function public.vitrine() to anon, authenticated;

-- Nomes: a própria pessoa, quem dividiu alguma edição com ela, e a organização.
create or replace function public.pode_ver_pessoa(p_email text)
returns boolean language sql stable security definer set search_path = public
as $$
  select eh_organizador()
      or p_email = email_atual()
      or exists (select 1 from participacoes eu
                   join participacoes ela on ela.edicao_id = eu.edicao_id and ela.email = p_email
                  where eu.email = email_atual() and eu.removido_em is null)
$$;
revoke all on function public.pode_ver_pessoa(text) from public, anon;
grant execute on function public.pode_ver_pessoa(text) to authenticated;

drop policy if exists pessoas_select on public.pessoas;
create policy pessoas_select on public.pessoas for select to authenticated using (pode_ver_pessoa(email));
