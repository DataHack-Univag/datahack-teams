-- =============================================================================
-- 025 · Quem participou de uma edição anterior vê a edição atual
-- -----------------------------------------------------------------------------
-- Quem tem login entra sempre e vê só as edições de que participou. Para oferecer a
-- inscrição na edição que está acontecendo, a vitrine (a mesma do login) passa a dizer
-- também o número da edição atual, se ela recebe inscrição pelo site (com o link) e a
-- situação das inscrições. O link só aparece quando a edição não é de lista fechada.
-- Nada de dados de pessoas: são só os dados públicos da edição.
-- =============================================================================

create or replace function public.vitrine()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'atual', (select jsonb_build_object('nome', nome, 'marca', marca, 'local', local, 'data_inicio', data_inicio, 'data_fim', data_fim,
                                        'numero', numero,
                                        'slug', case when acesso <> 'lista' then slug end,
                                        'inscricao', situacao_inscricao(id))
                from edicoes where atual),
    'inscricoes', coalesce((select jsonb_agg(jsonb_build_object(
                     'slug', slug, 'nome', coalesce(marca ->> 'nome_publico', nome), 'situacao', situacao_inscricao(id),
                     'data_inicio', data_inicio, 'local', local) order by data_inicio nulls last)
                   from edicoes where acesso <> 'lista' and situacao_inscricao(id) in ('aberta', 'em_breve')), '[]'::jsonb)
  )
$$;

revoke all on function public.vitrine() from public;
grant execute on function public.vitrine() to anon, authenticated;
