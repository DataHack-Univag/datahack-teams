-- =============================================================================
-- 019 · Logo da edição (correção da 017 em produção)
-- A produção rodou a primeira versão da 017, de antes da logo por edição. Esta migração deixa
-- a produção igual à versão final da 017 (e não muda nada onde ela já está certa):
--   - a marca da edição aceita só logo de imagem (PNG/JPG/WEBP/SVG ou arquivo do sistema) e cor #RRGGBB;
--   - edição nova começa sem marca (não copia a logo da anterior);
--   - a Edição 1 fica com a logo oficial de sempre (placa azul-marinho).
-- =============================================================================

alter table public.edicoes drop constraint if exists edicoes_marca_check;
alter table public.edicoes add constraint edicoes_marca_check check (
  jsonb_typeof(marca) = 'object'
  and octet_length(marca::text) <= 1000000
  and (marca ->> 'cor' is null or marca ->> 'cor' ~ '^#[0-9a-fA-F]{6}$')
  and (marca ->> 'logo' is null or marca ->> 'logo' ~ '^(data:image/(png|jpeg|webp|svg\+xml)[;,]|/[A-Za-z0-9_./-]+$)')
);

create or replace function public.criar_edicao(p_dados jsonb, p_copiar_de uuid default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_id   uuid;
  v_base edicoes%rowtype;
begin
  if not eh_organizador() then
    raise exception 'Só a organização cria edições.';
  end if;
  if p_copiar_de is not null then
    select * into v_base from edicoes where id = p_copiar_de;
  end if;
  insert into edicoes (numero, slug, nome, descricao, formato, local, data_inicio, data_fim, modo_formacao,
                       permite_trocas, min_membros, max_membros, metadados, criado_por, acesso, aprovacao, marca)
  values ((select coalesce(max(numero), 0) + 1 from edicoes),
          p_dados ->> 'slug', p_dados ->> 'nome', p_dados ->> 'descricao', p_dados ->> 'formato', p_dados ->> 'local',
          nullif(p_dados ->> 'data_inicio', '')::date, nullif(p_dados ->> 'data_fim', '')::date,
          coalesce(p_dados ->> 'modo_formacao', 'gerador'), coalesce((p_dados ->> 'permite_trocas')::boolean, false),
          coalesce((p_dados ->> 'min_membros')::int, 2), coalesce((p_dados ->> 'max_membros')::int, 5),
          coalesce(p_dados -> 'metadados', '{}'::jsonb), email_atual(),
          coalesce(p_dados ->> 'acesso', v_base.acesso, 'lista'),
          coalesce(v_base.aprovacao, 'automatica'),
          -- A marca (nome público, cor, logo) é de cada edição: a nova começa sem.
          '{}'::jsonb)
  returning id into v_id;

  if p_copiar_de is not null then
    perform importar_regulamento(v_id, exportar_regulamento(p_copiar_de));
    insert into edicao_instituicoes (edicao_id, instituicao_id, ordem)
    select v_id, instituicao_id, ordem from edicao_instituicoes where edicao_id = p_copiar_de and removido_em is null;
  end if;

  -- Copiando de outra edição, os organizadores dela continuam organizando; quem cria sempre organiza.
  if p_copiar_de is not null then
    insert into participacoes (edicao_id, email, papel, banca_id)
    select v_id, p.email, 'organizador', (select id from bancas where edicao_id = v_id and da_organizacao limit 1)
      from participacoes p
     where p.edicao_id = p_copiar_de and p.papel = 'organizador' and p.removido_em is null
    on conflict do nothing;
  end if;
  insert into participacoes (edicao_id, email, papel, banca_id)
  values (v_id, email_atual(), 'organizador', (select id from bancas where edicao_id = v_id and da_organizacao limit 1))
  on conflict do nothing;
  return v_id;
end $$;

-- Só se a Edição 1 ainda não tiver logo (quem já trocou a logo não perde a escolha).
-- Sem mexer no "atualizado_em" da edição (a data de mudança dela continua a de verdade).
alter table public.edicoes disable trigger edicoes_atualizado_em;
update public.edicoes set marca = marca || '{"logo": "/logo-datahack.png", "cor": "#000b38"}'::jsonb
 where numero = 1 and marca ->> 'logo' is null;
alter table public.edicoes enable trigger edicoes_atualizado_em;
