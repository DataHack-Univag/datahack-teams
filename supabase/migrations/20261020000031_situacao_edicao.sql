-- =============================================================================
-- 031 · Situação da edição: planejada → em andamento → encerrada (ou cancelada)
-- -----------------------------------------------------------------------------
--   · planejada ...... em preparação
--   · em_andamento ... acontecendo ("Tornar a edição atual" já põe aqui)
--   · encerrada ...... concluída: a página de inscrição diz que a edição foi concluída
--   · cancelada ...... não vai acontecer, com o motivo. O link de inscrição deixa de existir
--                      (a página pública não acha a edição) e ela não pode ser a atual.
-- "inscricoes" (das primeiras migrações) continua aceito, mas as telas não oferecem mais.
-- =============================================================================

alter table public.edicoes drop constraint if exists edicoes_situacao_check;
alter table public.edicoes add constraint edicoes_situacao_check
  check (situacao in ('planejada', 'inscricoes', 'em_andamento', 'encerrada', 'cancelada'));

alter table public.edicoes add column if not exists motivo_cancelamento text;
alter table public.edicoes add column if not exists cancelada_em timestamptz;
alter table public.edicoes drop constraint if exists edicoes_motivo_cancelamento_check;
alter table public.edicoes add constraint edicoes_motivo_cancelamento_check
  check (situacao <> 'cancelada' or char_length(btrim(coalesce(motivo_cancelamento, ''))) between 5 and 500);

-- Cancelar exige que ela não seja a atual; sair de "cancelada" limpa o motivo (fica no histórico).
create or replace function public.preparar_situacao_edicao()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.situacao = 'cancelada' and new.atual then
    raise exception 'A edição atual não pode ser cancelada. Torne outra edição a atual antes.';
  end if;
  if new.situacao = 'cancelada' and (tg_op = 'INSERT' or old.situacao is distinct from 'cancelada') then
    new.cancelada_em := now();
    new.motivo_cancelamento := btrim(new.motivo_cancelamento);
  elsif new.situacao <> 'cancelada' then
    new.motivo_cancelamento := null;
    new.cancelada_em := null;
  end if;
  return new;
end $$;
drop trigger if exists edicoes_situacao on public.edicoes;
create trigger edicoes_situacao before insert or update of situacao, atual, motivo_cancelamento on public.edicoes
  for each row execute function public.preparar_situacao_edicao();

-- Tornar atual: a edição passa a "em andamento" (se estava planejada); cancelada não pode.
create or replace function public.definir_edicao_atual(p_edicao uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição faz dela a atual.';
  end if;
  if (select situacao from edicoes where id = p_edicao) = 'cancelada' then
    raise exception 'Esta edição foi cancelada. Mude a situação dela antes de torná-la a atual.';
  end if;
  update edicoes set atual = false where atual and id <> p_edicao;
  update edicoes set atual = true,
         situacao = case when situacao in ('planejada', 'inscricoes') then 'em_andamento' else situacao end
   where id = p_edicao;
end $$;

-- Situação das inscrições (027/028) + cancelada: fechada de vez.
create or replace function public.situacao_inscricao(p_edicao uuid)
returns text language sql stable security definer set search_path = public
as $$
  select case
    when e.acesso = 'lista' or e.situacao = 'cancelada' then 'fechada'
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

-- Página pública: edição cancelada não existe; as outras dizem também a situação da edição.
create or replace function public.edicao_publica(p_slug text)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', e.id, 'numero', e.numero, 'slug', e.slug, 'nome', e.nome, 'marca', e.marca,
    'descricao', e.descricao, 'local', e.local, 'data_inicio', e.data_inicio, 'data_fim', e.data_fim,
    'acesso', e.acesso, 'aprovacao', e.aprovacao, 'vagas', e.vagas,
    'inscricao_abre_em', e.inscricao_abre_em, 'inscricao_fecha_em', e.inscricao_fecha_em,
    'situacao', situacao_inscricao(e.id),
    'situacao_edicao', e.situacao,
    'aprovadas', aprovadas_na_edicao(e.id),
    'campos', coalesce((select jsonb_agg(jsonb_build_object(
                 'chave', c.chave, 'rotulo', c.rotulo, 'ajuda', c.ajuda, 'tipo', c.tipo, 'opcoes', c.opcoes,
                 'condicao', c.condicao, 'obrigatorio', c.obrigatorio, 'sensivel', c.sensivel) order by c.ordem)
               from campos_inscricao c where c.edicao_id = e.id and c.removido_em is null), '[]'::jsonb),
    'instituicoes', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'nome', coalesce(i.sigla || ' · ', '') || i.nome) order by coalesce(i.sigla, i.nome))
               from instituicoes i
              where i.removido_em is null
                and (e.acesso <> 'instituicoes' or exists (select 1 from edicao_instituicoes x
                       where x.edicao_id = e.id and x.instituicao_id = i.id and x.removido_em is null))), '[]'::jsonb),
    'termo', (select jsonb_build_object('versao', t.versao, 'texto', t.texto) from termos t
               where t.edicao_id = e.id order by t.versao desc limit 1)
  )
  from edicoes e where e.slug = lower(btrim(p_slug)) and e.acesso <> 'lista' and e.situacao <> 'cancelada'
$$;
revoke all on function public.edicao_publica(text) from public;
grant execute on function public.edicao_publica(text) to anon, authenticated;
