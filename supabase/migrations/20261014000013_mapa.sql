-- =============================================================================
-- 013 · Mapa do evento: pisos > salas > elementos (bancadas, mesas, portas...)
-- Tudo é dado (posição e tamanho em centímetros), não desenho: dá para arrastar, perguntar
-- "o que tem nesta sala" e gerar o croqui em escala. Por edição, sem apagar nada.
-- Ler: quem participa da edição. Escrever: a organização da edição.
-- =============================================================================

create table public.pisos (
  id          uuid primary key default gen_random_uuid(),
  edicao_id   uuid not null references public.edicoes (id),
  nome        text not null check (char_length(btrim(nome)) between 1 and 60),
  ordem       int not null default 0,
  criado_em   timestamptz not null default now(),
  removido_em timestamptz
);
create unique index pisos_nome_unico on public.pisos (edicao_id, lower(btrim(nome))) where removido_em is null;

create table public.salas (
  id               uuid primary key default gen_random_uuid(),
  edicao_id        uuid not null references public.edicoes (id),
  piso_id          uuid not null references public.pisos (id),
  nome             text not null check (char_length(btrim(nome)) between 1 and 60),
  -- Medidas reais da sala: o croqui sai em escala.
  largura_cm       int not null check (largura_cm between 100 and 10000),
  profundidade_cm  int not null check (profundidade_cm between 100 and 10000),
  -- Planta, foto ou rascunho de fundo (imagem já reduzida pelo navegador), só como referência.
  fundo            text check (fundo is null or (fundo like 'data:image/%' and char_length(fundo) <= 2000000)),
  ordem            int not null default 0,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  removido_em      timestamptz
);
create unique index salas_nome_unico on public.salas (piso_id, lower(btrim(nome))) where removido_em is null;
create index salas_edicao_idx on public.salas (edicao_id);

-- O que está desenhado na sala. "lugares" = quantas equipes cabem (bancada e mesa).
create table public.mapa_elementos (
  id               uuid primary key default gen_random_uuid(),
  edicao_id        uuid not null references public.edicoes (id),
  sala_id          uuid not null references public.salas (id),
  tipo             text not null check (tipo in ('bancada', 'mesa', 'cadeira', 'mesa_organizacao', 'porta', 'janela',
                                                 'parede', 'coluna', 'quadro', 'palco', 'area', 'texto')),
  rotulo           text check (rotulo is null or char_length(rotulo) <= 60),
  x_cm             int not null,
  y_cm             int not null,
  largura_cm       int not null check (largura_cm between 5 and 10000),
  profundidade_cm  int not null check (profundidade_cm between 5 and 10000),
  rotacao          int not null default 0 check (rotacao between 0 and 359),
  lugares          int check (lugares is null or lugares between 1 and 20),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  removido_em      timestamptz
);
create index mapa_elementos_sala_idx on public.mapa_elementos (sala_id) where removido_em is null;

-- O elemento é da mesma edição da sala (e a sala, do mesmo piso/edição).
create or replace function public.checar_mapa()
returns trigger language plpgsql
as $$
begin
  if tg_table_name = 'salas' then
    if not exists (select 1 from pisos where id = new.piso_id and edicao_id = new.edicao_id) then
      raise exception 'O piso não é desta edição.';
    end if;
  else
    if not exists (select 1 from salas where id = new.sala_id and edicao_id = new.edicao_id) then
      raise exception 'A sala não é desta edição.';
    end if;
  end if;
  return new;
end $$;
create trigger salas_mesma_edicao before insert or update of piso_id, edicao_id on public.salas
  for each row execute function public.checar_mapa();
create trigger mapa_elementos_mesma_edicao before insert or update of sala_id, edicao_id on public.mapa_elementos
  for each row execute function public.checar_mapa();

create trigger salas_atualizado_em before update on public.salas
  for each row execute function public.tocar_atualizado_em();
create trigger mapa_elementos_atualizado_em before update on public.mapa_elementos
  for each row execute function public.tocar_atualizado_em();

-- Histórico e "nada é apagado", como nas outras tabelas.
do $$
declare t text;
begin
  foreach t in array array['pisos', 'salas', 'mapa_elementos'] loop
    execute format('create trigger %I_historico after insert or update on public.%I
                    for each row execute function public.registrar_historico()', t, t);
    execute format('create trigger %I_nao_apagar before delete on public.%I
                    for each row execute function public.impedir_apagar()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy %I_select on public.%I for select to authenticated
                    using (eh_organizador_de(edicao_id) or (participa_de(edicao_id) and removido_em is null))', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated
                    with check (eh_organizador_de(edicao_id))', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated
                    using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id))', t, t);
  end loop;
end $$;

grant select, insert, update on public.pisos, public.salas, public.mapa_elementos to authenticated;
revoke delete, truncate on public.pisos, public.salas, public.mapa_elementos from authenticated;

-- -----------------------------------------------------------------------------
-- Importar / exportar o mapa (formato canônico em metros, para pessoas e IAs escreverem):
-- { "pisos": [ { "nome": "Térreo", "salas": [ { "nome": "Lab 1", "largura_m": 8, "profundidade_m": 6,
--   "elementos": [ { "tipo": "bancada", "rotulo": "B1", "x_m": 1, "y_m": 1, "largura_m": 3.2,
--                    "profundidade_m": 0.8, "rotacao": 0, "lugares": 2 } ] } ] } ] }
-- x/y = canto de cima à esquerda do elemento, medido do canto de cima à esquerda da sala.
-- -----------------------------------------------------------------------------
create or replace function public.importar_mapa(p_edicao uuid, p_mapa jsonb, p_substituir boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  vp jsonb; vs jsonb; ve jsonb;
  v_piso uuid; v_sala uuid;
  n_pisos int := 0; n_salas int := 0; n_elem int := 0;
  v_larg int; v_prof int;
  cm constant numeric := 100;
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição importa o mapa.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_mapa -> 'pisos') <> 'array' or jsonb_array_length(p_mapa -> 'pisos') = 0 then
    raise exception 'O mapa precisa de uma lista "pisos" com pelo menos um piso.';
  end if;

  for vp in select * from jsonb_array_elements(p_mapa -> 'pisos') loop
    if coalesce(btrim(vp ->> 'nome'), '') = '' then raise exception 'Todo piso precisa de "nome".'; end if;
    select id into v_piso from pisos where edicao_id = p_edicao and lower(btrim(nome)) = lower(btrim(vp ->> 'nome')) and removido_em is null;
    if v_piso is null then
      insert into pisos (edicao_id, nome, ordem)
      values (p_edicao, btrim(vp ->> 'nome'), (select coalesce(max(ordem), 0) + 1 from pisos where edicao_id = p_edicao))
      returning id into v_piso;
      n_pisos := n_pisos + 1;
    end if;

    for vs in select * from jsonb_array_elements(coalesce(vp -> 'salas', '[]'::jsonb)) loop
      if coalesce(btrim(vs ->> 'nome'), '') = '' then raise exception 'Toda sala precisa de "nome".'; end if;
      v_larg := round((vs ->> 'largura_m')::numeric * cm);
      v_prof := round((vs ->> 'profundidade_m')::numeric * cm);
      if v_larg is null or v_prof is null then
        raise exception 'A sala "%" precisa de "largura_m" e "profundidade_m".', vs ->> 'nome';
      end if;
      select id into v_sala from salas where piso_id = v_piso and lower(btrim(nome)) = lower(btrim(vs ->> 'nome')) and removido_em is null;
      if v_sala is not null and not p_substituir then
        raise exception 'A sala "%" já existe no piso "%". Marque "substituir" para trocar o desenho dela.', vs ->> 'nome', vp ->> 'nome';
      elsif v_sala is not null then
        update mapa_elementos set removido_em = now() where sala_id = v_sala and removido_em is null;
        update salas set largura_cm = v_larg, profundidade_cm = v_prof where id = v_sala;
      else
        insert into salas (edicao_id, piso_id, nome, largura_cm, profundidade_cm, ordem)
        values (p_edicao, v_piso, btrim(vs ->> 'nome'), v_larg, v_prof,
                (select coalesce(max(ordem), 0) + 1 from salas where piso_id = v_piso))
        returning id into v_sala;
      end if;
      n_salas := n_salas + 1;

      for ve in select * from jsonb_array_elements(coalesce(vs -> 'elementos', '[]'::jsonb)) loop
        insert into mapa_elementos (edicao_id, sala_id, tipo, rotulo, x_cm, y_cm, largura_cm, profundidade_cm, rotacao, lugares)
        values (p_edicao, v_sala, ve ->> 'tipo', nullif(btrim(ve ->> 'rotulo'), ''),
                round((ve ->> 'x_m')::numeric * cm), round((ve ->> 'y_m')::numeric * cm),
                round((ve ->> 'largura_m')::numeric * cm), round((ve ->> 'profundidade_m')::numeric * cm),
                coalesce((ve ->> 'rotacao')::int, 0) % 360, (ve ->> 'lugares')::int);
        n_elem := n_elem + 1;
      end loop;
    end loop;
  end loop;

  return jsonb_build_object('pisos', n_pisos, 'salas', n_salas, 'elementos', n_elem);
end $$;

create or replace function public.exportar_mapa(p_edicao uuid)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('pisos', coalesce(jsonb_agg(p.j order by p.ordem), '[]'::jsonb))
    from (
      select pi.ordem, jsonb_build_object('nome', pi.nome, 'salas', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'nome', s.nome, 'largura_m', (s.largura_cm / 100.0)::float8, 'profundidade_m', (s.profundidade_cm / 100.0)::float8,
                 'elementos', coalesce((
                   select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                            'tipo', e.tipo, 'rotulo', e.rotulo, 'x_m', (e.x_cm / 100.0)::float8, 'y_m', (e.y_cm / 100.0)::float8,
                            'largura_m', (e.largura_cm / 100.0)::float8, 'profundidade_m', (e.profundidade_cm / 100.0)::float8,
                            'rotacao', nullif(e.rotacao, 0), 'lugares', e.lugares)) order by e.criado_em)
                     from mapa_elementos e where e.sala_id = s.id and e.removido_em is null), '[]'::jsonb))
               order by s.ordem)
          from salas s where s.piso_id = pi.id and s.removido_em is null), '[]'::jsonb)) as j
        from pisos pi
       where pi.edicao_id = p_edicao and pi.removido_em is null and participa_de(p_edicao)
    ) p
$$;

revoke all on function public.importar_mapa(uuid, jsonb, boolean), public.exportar_mapa(uuid) from public, anon;
grant execute on function public.importar_mapa(uuid, jsonb, boolean), public.exportar_mapa(uuid) to authenticated;
