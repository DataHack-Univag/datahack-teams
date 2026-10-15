-- =============================================================================
-- 017 · Instituições, tipo de acesso e marca de cada edição
-- O mesmo sistema atende um evento fechado de uma instituição (como a Univag), um evento de
-- várias instituições e um evento aberto a todos. Isso passa a ser configuração da edição:
--   acesso        lista (a organização importa quem participa) | instituicoes | aberto
--   instituições  quais participam (edicao_instituicoes)
--   marca         nome público, cor e a logo que aparece no topo das telas
-- As edições que já existem viram "lista" + Univag: nada muda para quem usa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Instituições (referência global, vale para todas as edições)
-- -----------------------------------------------------------------------------
create table public.instituicoes (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (char_length(btrim(nome)) between 3 and 160),
  sigla        text check (sigla is null or char_length(btrim(sigla)) between 1 and 20),
  cidade       text check (cidade is null or char_length(cidade) <= 80),
  uf           char(2) check (uf is null or uf ~ '^[A-Z]{2}$'),
  tipo         text not null default 'universidade'
               check (tipo in ('universidade', 'instituto', 'escola', 'empresa', 'outra')),
  site         text check (site is null or char_length(site) <= 300),
  -- Logo em SVG (texto). Mostrada sempre como imagem (<img>), que não executa nada; mesmo assim
  -- o banco recusa SVG com script, eventos, javascript: ou foreignObject.
  logo_svg     text check (logo_svg is null or (
                 char_length(logo_svg) <= 200000
                 and logo_svg ~* '<svg[\s>]'
                 and logo_svg !~* '<script|javascript:|<foreignobject|\son[a-z]+\s*='
               )),
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  removido_em  timestamptz
);
create unique index instituicoes_nome_unico on public.instituicoes (lower(btrim(nome))) where removido_em is null;

create trigger instituicoes_atualizado_em before update on public.instituicoes
  for each row execute function public.tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- 2. Como cada edição funciona
-- -----------------------------------------------------------------------------
alter table public.edicoes
  add column acesso text not null default 'lista' check (acesso in ('lista', 'instituicoes', 'aberto')),
  add column aprovacao text not null default 'automatica' check (aprovacao in ('automatica', 'manual')),
  add column vagas int check (vagas is null or vagas between 1 and 100000),
  add column inscricao_abre_em timestamptz,
  add column inscricao_fecha_em timestamptz,
  -- {"nome_publico": "...", "cor": "#000b38", "logo": "data:image/png;base64,…" | "/logo.png"} (tudo opcional).
  -- A logo é sempre mostrada como imagem (<img>), que não executa nada (nem num SVG).
  add column marca jsonb not null default '{}'::jsonb check (
    jsonb_typeof(marca) = 'object'
    and octet_length(marca::text) <= 1000000
    and (marca ->> 'cor' is null or marca ->> 'cor' ~ '^#[0-9a-fA-F]{6}$')
    and (marca ->> 'logo' is null or marca ->> 'logo' ~ '^(data:image/(png|jpeg|webp|svg\+xml)[;,]|/[A-Za-z0-9_./-]+$)')
  ),
  add constraint edicoes_inscricao_periodo check (inscricao_fecha_em is null or inscricao_abre_em is null or inscricao_fecha_em > inscricao_abre_em);

-- Quais instituições participam da edição. Tirar uma = removido_em (nada é apagado).
create table public.edicao_instituicoes (
  edicao_id       uuid not null references public.edicoes (id),
  instituicao_id  uuid not null references public.instituicoes (id),
  ordem           int not null default 0,
  criado_em       timestamptz not null default now(),
  removido_em     timestamptz,
  primary key (edicao_id, instituicao_id)
);
create index edicao_instituicoes_instituicao_idx on public.edicao_instituicoes (instituicao_id);

-- -----------------------------------------------------------------------------
-- 3. Histórico, "nada é apagado" e permissões
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['instituicoes', 'edicao_instituicoes'] loop
    execute format('create trigger %I_historico after insert or update on public.%I
                    for each row execute function public.registrar_historico()', t, t);
    execute format('create trigger %I_nao_apagar before delete on public.%I
                    for each row execute function public.impedir_apagar()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Instituições e quem participa de cada edição não são dados pessoais: qualquer pessoa logada lê
-- (o cabeçalho mostra a logo). Cadastrar e editar: a organização.
create policy instituicoes_select on public.instituicoes for select to authenticated using (true);
create policy instituicoes_insert on public.instituicoes for insert to authenticated with check (eh_organizador());
create policy instituicoes_update on public.instituicoes for update to authenticated using (eh_organizador()) with check (eh_organizador());

create policy edicao_instituicoes_select on public.edicao_instituicoes for select to authenticated using (true);
create policy edicao_instituicoes_insert on public.edicao_instituicoes for insert to authenticated with check (eh_organizador_de(edicao_id));
create policy edicao_instituicoes_update on public.edicao_instituicoes for update to authenticated
  using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id));

grant select, insert, update on public.instituicoes, public.edicao_instituicoes to authenticated;
revoke delete, truncate on public.instituicoes, public.edicao_instituicoes from authenticated;

-- -----------------------------------------------------------------------------
-- 4. Acesso da edição de uma vez só (dados + instituições), conferindo as regras
-- -----------------------------------------------------------------------------
create or replace function public.definir_acesso_edicao(p_edicao uuid, p_dados jsonb, p_instituicoes uuid[])
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_acesso text := coalesce(p_dados ->> 'acesso', 'lista');
  v_lista  uuid[] := coalesce(p_instituicoes, '{}');
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição define o acesso.' using errcode = '42501';
  end if;
  if v_acesso = 'instituicoes' and cardinality(v_lista) = 0 then
    raise exception 'Escolha ao menos uma instituição para um evento restrito a instituições.';
  end if;
  if exists (select 1 from unnest(v_lista) i where not exists (select 1 from instituicoes where id = i and removido_em is null)) then
    raise exception 'Uma das instituições escolhidas não existe mais. Recarregue a página.';
  end if;

  update edicoes set
    acesso             = v_acesso,
    aprovacao          = coalesce(p_dados ->> 'aprovacao', aprovacao),
    vagas              = nullif(p_dados ->> 'vagas', '')::int,
    inscricao_abre_em  = nullif(p_dados ->> 'inscricao_abre_em', '')::timestamptz,
    inscricao_fecha_em = nullif(p_dados ->> 'inscricao_fecha_em', '')::timestamptz,
    marca              = coalesce(p_dados -> 'marca', marca)
  where id = p_edicao;

  -- Sai quem não está mais na lista; entra (ou volta) quem está, na ordem escolhida.
  update edicao_instituicoes set removido_em = now()
   where edicao_id = p_edicao and removido_em is null and not (instituicao_id = any (v_lista));
  insert into edicao_instituicoes (edicao_id, instituicao_id, ordem)
  select p_edicao, i, n from unnest(v_lista) with ordinality as x(i, n)
  on conflict (edicao_id, instituicao_id) do update set removido_em = null, ordem = excluded.ordem;
end $$;

revoke all on function public.definir_acesso_edicao(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.definir_acesso_edicao(uuid, jsonb, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Edição nova copia também o acesso e as instituições
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 6. As edições de hoje: evento fechado (lista) da Univag
-- -----------------------------------------------------------------------------
insert into public.instituicoes (nome, sigla, cidade, uf, tipo, site)
values ('Centro Universitário de Várzea Grande', 'UNIVAG', 'Várzea Grande', 'MT', 'universidade', 'https://www.univag.com.br');

insert into public.edicao_instituicoes (edicao_id, instituicao_id)
select e.id, i.id from public.edicoes e cross join public.instituicoes i where i.sigla = 'UNIVAG';

-- A logo de sempre (placa azul-marinho) fica com a Edição 1, a do DATAHack Univag 2026.
-- Sem mexer no "atualizado_em" da edição (a data de mudança dela continua a de verdade).
alter table public.edicoes disable trigger edicoes_atualizado_em;
update public.edicoes set marca = '{"logo": "/logo-datahack.png", "cor": "#000b38"}'::jsonb where numero = 1;
alter table public.edicoes enable trigger edicoes_atualizado_em;
