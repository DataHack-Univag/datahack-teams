-- =============================================================================
-- 027 · Inscrições abertas só na edição atual e dentro do prazo
-- -----------------------------------------------------------------------------
-- Antes, uma edição que não era a atual continuava recebendo inscrições pelo site.
-- Agora a inscrição pelo site só está aberta quando as duas coisas valem:
--   1. a edição é a atual;
--   2. está dentro do prazo (abrem em / fecham em, quando definidos).
-- Edição que não é a atual: "em_breve" se o prazo ainda vai abrir, senão "encerrada".
-- Quem já se inscreveu não é afetado; muda só o que a página pública aceita.
-- =============================================================================

create or replace function public.situacao_inscricao(p_edicao uuid)
returns text language sql stable security definer set search_path = public
as $$
  select case
    when e.acesso = 'lista' then 'fechada'
    when e.situacao = 'encerrada' or (e.inscricao_fecha_em is not null and now() >= e.inscricao_fecha_em) then 'encerrada'
    when e.inscricao_abre_em is not null and now() < e.inscricao_abre_em then 'em_breve'
    when not e.atual then 'encerrada'
    else 'aberta'
  end
  from edicoes e where e.id = p_edicao
$$;

revoke all on function public.situacao_inscricao(uuid) from public, anon;
grant execute on function public.situacao_inscricao(uuid) to authenticated;
