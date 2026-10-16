-- =============================================================================
-- 028 · "Ainda não abriram" × "encerradas"
-- -----------------------------------------------------------------------------
-- A 027 fechou as inscrições de quem não é a edição atual, mas dizia "encerradas" também
-- para a edição planejada, que ainda nem começou. Agora:
--   · edição encerrada ou prazo vencido ............ encerrada
--   · prazo ainda não começou ....................... em_breve
--   · não é a atual e está planejada ................ em_breve  ("ainda não abriram")
--   · não é a atual e já passou (em andamento) ...... encerrada
--   · é a atual e está no prazo ..................... aberta
-- A regra de abrir continua a mesma: só a edição atual, dentro do prazo.
-- =============================================================================

create or replace function public.situacao_inscricao(p_edicao uuid)
returns text language sql stable security definer set search_path = public
as $$
  select case
    when e.acesso = 'lista' then 'fechada'
    when e.situacao = 'encerrada' or (e.inscricao_fecha_em is not null and now() >= e.inscricao_fecha_em) then 'encerrada'
    when e.inscricao_abre_em is not null and now() < e.inscricao_abre_em then 'em_breve'
    when not e.atual and e.situacao = 'planejada' then 'em_breve'
    when not e.atual then 'encerrada'
    else 'aberta'
  end
  from edicoes e where e.id = p_edicao
$$;

revoke all on function public.situacao_inscricao(uuid) from public, anon;
grant execute on function public.situacao_inscricao(uuid) to authenticated;
