-- =============================================================================
-- 018 · Formulário de inscrição de cada edição (perguntas parametrizáveis)
-- Cada edição escolhe as próprias perguntas, e cada uma pode ser obrigatória ou opcional:
--   perguntas_catalogo  banco de perguntas prontas (global): curso, semestre, cargo, camiseta…
--   campos_inscricao    as perguntas DESTA edição (uma linha = uma pergunta), copiadas do
--                       catálogo ou criadas na hora; mudar aqui não muda as outras edições
--   inscricoes          o pedido de cada pessoa em cada edição, com as respostas num pacote
--                       JSONB ({"curso": "SI", "semestre": 5}) conferido contra as perguntas
-- As edições de antes ganham as perguntas "curso" e "semestre", e cada aluno delas vira uma
-- inscrição aprovada (origem "importacao"). Cadastrar aluno em Pessoas continua igual: um
-- gatilho mantém a inscrição dele em dia.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Banco de perguntas prontas
-- -----------------------------------------------------------------------------
create table public.perguntas_catalogo (
  id          uuid primary key default gen_random_uuid(),
  grupo       text not null,
  chave       text not null unique check (chave ~ '^[a-z][a-z0-9_]{0,39}$'),
  rotulo      text not null check (char_length(btrim(rotulo)) between 1 and 200),
  ajuda       text check (ajuda is null or char_length(ajuda) <= 500),
  tipo        text not null check (tipo in ('texto', 'texto_longo', 'numero', 'escolha', 'multipla', 'sim_nao', 'data', 'instituicao', 'aceite')),
  -- escolha/multipla: ["A", "B"]; numero: {"min": 1, "max": 12}
  opcoes      jsonb,
  -- Só aparece se outra pergunta tiver tal resposta: {"campo": "trabalha", "igual": true}
  condicao    jsonb,
  sensivel    boolean not null default false,
  -- Perguntas que vêm junto (marcar "cargo" traz "trabalha" e "cargo_outro").
  traz        text[] not null default '{}',
  ordem       int not null default 0,
  removido_em timestamptz
);

-- -----------------------------------------------------------------------------
-- 2. As perguntas de cada edição
-- -----------------------------------------------------------------------------
create table public.campos_inscricao (
  id            uuid primary key default gen_random_uuid(),
  edicao_id     uuid not null references public.edicoes (id),
  chave         text not null check (chave ~ '^[a-z][a-z0-9_]{0,39}$'),
  rotulo        text not null check (char_length(btrim(rotulo)) between 1 and 200),
  ajuda         text check (ajuda is null or char_length(ajuda) <= 500),
  tipo          text not null check (tipo in ('texto', 'texto_longo', 'numero', 'escolha', 'multipla', 'sim_nao', 'data', 'instituicao', 'aceite')),
  opcoes        jsonb check (opcoes is null or jsonb_typeof(opcoes) in ('array', 'object')),
  condicao      jsonb check (condicao is null or (jsonb_typeof(condicao) = 'object' and condicao ? 'campo' and condicao ? 'igual')),
  obrigatorio   boolean not null default true,
  -- LGPD: resposta sensível não aparece para mentoria nem bancas.
  sensivel      boolean not null default false,
  ordem         int not null default 0,
  catalogo_id   uuid references public.perguntas_catalogo (id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Tirar a pergunta = arquivar; as respostas antigas continuam guardadas nas inscrições.
  removido_em   timestamptz,
  unique (edicao_id, chave)
);

create trigger campos_inscricao_atualizado_em before update on public.campos_inscricao
  for each row execute function public.tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- 3. Inscrições
-- -----------------------------------------------------------------------------
create table public.inscricoes (
  id              uuid primary key default gen_random_uuid(),
  edicao_id       uuid not null references public.edicoes (id),
  email           text not null references public.pessoas (email) on update cascade,
  instituicao_id  uuid references public.instituicoes (id),
  respostas       jsonb not null default '{}'::jsonb check (jsonb_typeof(respostas) = 'object' and octet_length(respostas::text) <= 20000),
  situacao        text not null default 'pendente' check (situacao in ('pendente', 'aprovada', 'espera', 'recusada', 'cancelada')),
  -- importacao: a organização cadastrou (planilha ou Pessoas); formulario: a pessoa se inscreveu.
  origem          text not null check (origem in ('importacao', 'formulario')),
  termo_versao    int,
  termo_aceito_em timestamptz,
  decidido_por    text,
  decidido_em     timestamptz,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (edicao_id, email)
);
create index inscricoes_email_idx on public.inscricoes (email);
create index inscricoes_respostas_idx on public.inscricoes using gin (respostas);

create trigger inscricoes_atualizado_em before update on public.inscricoes
  for each row execute function public.tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- 4. Conferir as respostas contra as perguntas da edição
-- -----------------------------------------------------------------------------
-- Devolve a lista de problemas (vazia = tudo certo). A mesma regra roda na tela
-- (modules/inscricoes/domain/campos.ts) e aqui, que é quem decide.
create or replace function public.validar_respostas(p_edicao uuid, p_respostas jsonb)
returns text[] language plpgsql stable security definer set search_path = public
as $$
declare
  c         record;
  v         jsonb;
  t         text;
  v_acesso  text;
  visiveis  text[] := '{}';
  erros     text[] := '{}';
  k         text;
begin
  if p_respostas is null or jsonb_typeof(p_respostas) <> 'object' then
    return array['As respostas não vieram no formato certo.'];
  end if;
  select acesso into v_acesso from edicoes where id = p_edicao;

  for c in select * from campos_inscricao where edicao_id = p_edicao and removido_em is null order by ordem, criado_em loop
    -- Pergunta que depende de outra: só vale se a outra estiver à vista e com a resposta esperada.
    if c.condicao is not null and not (
         (c.condicao ->> 'campo') = any (visiveis)
         and coalesce(p_respostas -> (c.condicao ->> 'campo') = c.condicao -> 'igual', false)) then
      if p_respostas ? c.chave then
        erros := erros || format('“%s” não se aplica às outras respostas.', c.rotulo);
      end if;
      continue;
    end if;
    visiveis := visiveis || c.chave;

    v := p_respostas -> c.chave;
    if v is null or v = 'null'::jsonb or v = '""'::jsonb or (c.tipo = 'multipla' and v = '[]'::jsonb)
       or (c.tipo = 'aceite' and v <> 'true'::jsonb) then
      if c.obrigatorio then
        erros := erros || format('Responda: %s', c.rotulo);
      end if;
      continue;
    end if;

    t := jsonb_typeof(v);
    if c.tipo = 'texto' and (t <> 'string' or char_length(v #>> '{}') > 300) then
      erros := erros || format('%s: use até 300 caracteres.', c.rotulo);
    elsif c.tipo = 'texto_longo' and (t <> 'string' or char_length(v #>> '{}') > 2000) then
      erros := erros || format('%s: use até 2000 caracteres.', c.rotulo);
    elsif c.tipo = 'numero' and (t <> 'number'
          or (c.opcoes ? 'min' and v::numeric < (c.opcoes ->> 'min')::numeric)
          or (c.opcoes ? 'max' and v::numeric > (c.opcoes ->> 'max')::numeric)) then
      erros := erros || format('%s: informe um número entre %s e %s.', c.rotulo, coalesce(c.opcoes ->> 'min', '…'), coalesce(c.opcoes ->> 'max', '…'));
    elsif c.tipo = 'escolha' and (t <> 'string' or not coalesce(c.opcoes @> jsonb_build_array(v), false)) then
      erros := erros || format('%s: escolha uma das opções da lista.', c.rotulo);
    elsif c.tipo = 'multipla' and (t <> 'array' or not coalesce(c.opcoes @> v, false)) then
      erros := erros || format('%s: escolha entre as opções da lista.', c.rotulo);
    elsif c.tipo = 'sim_nao' and t <> 'boolean' then
      erros := erros || format('%s: responda sim ou não.', c.rotulo);
    elsif c.tipo = 'data' and (t <> 'string' or (v #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$') then
      erros := erros || format('%s: informe a data pelo calendário.', c.rotulo);
    elsif c.tipo = 'instituicao' then
      if t <> 'string' then
        erros := erros || format('%s: escolha uma instituição da lista.', c.rotulo);
      elsif (v #>> '{}') = 'outra' then
        if v_acesso = 'instituicoes' then
          erros := erros || 'Este evento é só para as instituições participantes.';
        end if;
      elsif (v #>> '{}') !~ '^[0-9a-f-]{36}$'
            or not exists (select 1 from instituicoes where id = (v #>> '{}')::uuid and removido_em is null)
            or (v_acesso = 'instituicoes' and not exists (
                  select 1 from edicao_instituicoes where edicao_id = p_edicao and instituicao_id = (v #>> '{}')::uuid and removido_em is null)) then
        erros := erros || format('%s: escolha uma instituição da lista.', c.rotulo);
      end if;
    end if;
  end loop;

  for k in select jsonb_object_keys(p_respostas) loop
    if not exists (select 1 from campos_inscricao where edicao_id = p_edicao and chave = k and removido_em is null) then
      erros := erros || format('A pergunta “%s” não existe nesta edição.', k);
    end if;
  end loop;
  return erros;
end $$;

-- Inscrição feita pelo formulário só entra com as respostas certas; a instituição respondida
-- vai também para a coluna instituicao_id (contar inscritos por instituição sem abrir o JSON).
create or replace function public.preparar_inscricao()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_erros text[];
  v_inst  text := new.respostas ->> 'instituicao';
begin
  if new.origem = 'formulario' and (tg_op = 'INSERT' or new.respostas is distinct from old.respostas) then
    v_erros := validar_respostas(new.edicao_id, new.respostas);
    if cardinality(v_erros) > 0 then
      raise exception '%', array_to_string(v_erros, ' ') using errcode = '23514';
    end if;
  end if;
  if v_inst ~ '^[0-9a-f-]{36}$' then
    new.instituicao_id := v_inst::uuid;
  elsif new.instituicao_id is null and (select acesso from edicoes where id = new.edicao_id) = 'lista' then
    -- Evento fechado: a pessoa é da instituição do evento.
    new.instituicao_id := (select instituicao_id from edicao_instituicoes
                            where edicao_id = new.edicao_id and removido_em is null order by ordem limit 1);
  end if;
  return new;
end $$;

create trigger inscricoes_preparar before insert or update on public.inscricoes
  for each row execute function public.preparar_inscricao();

-- -----------------------------------------------------------------------------
-- 5. Salvar o formulário da edição de uma vez (ordem, obrigatórias, condições)
-- -----------------------------------------------------------------------------
create or replace function public.definir_campos_inscricao(p_edicao uuid, p_campos jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare
  c       jsonb;
  n       int := 0;
  chaves  text[] := '{}';
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição define o formulário de inscrição.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_campos) <> 'array' then
    raise exception 'O formulário precisa ser uma lista de perguntas.';
  end if;

  for c in select * from jsonb_array_elements(p_campos) loop
    if (c ->> 'chave') = any (chaves) then
      raise exception 'A pergunta “%” aparece duas vezes.', c ->> 'rotulo';
    end if;
    if c ? 'condicao' and jsonb_typeof(c -> 'condicao') = 'object' and not ((c -> 'condicao' ->> 'campo') = any (chaves)) then
      raise exception '“%” depende de uma pergunta que precisa vir antes dela.', c ->> 'rotulo';
    end if;
    if (c ->> 'tipo') in ('escolha', 'multipla') and coalesce(jsonb_array_length(c -> 'opcoes'), 0) = 0 then
      raise exception '“%” precisa de pelo menos uma opção.', c ->> 'rotulo';
    end if;
    chaves := chaves || (c ->> 'chave');
  end loop;

  update campos_inscricao set removido_em = now()
   where edicao_id = p_edicao and removido_em is null and not (chave = any (chaves));

  for c in select * from jsonb_array_elements(p_campos) loop
    n := n + 1;
    insert into campos_inscricao (edicao_id, chave, rotulo, ajuda, tipo, opcoes, condicao, obrigatorio, sensivel, ordem, catalogo_id)
    values (p_edicao, c ->> 'chave', btrim(c ->> 'rotulo'), nullif(btrim(coalesce(c ->> 'ajuda', '')), ''), c ->> 'tipo',
            case when jsonb_typeof(c -> 'opcoes') in ('array', 'object') then c -> 'opcoes' end,
            case when jsonb_typeof(c -> 'condicao') = 'object' then c -> 'condicao' end,
            coalesce((c ->> 'obrigatorio')::boolean, true), coalesce((c ->> 'sensivel')::boolean, false), n,
            (select id from perguntas_catalogo where chave = c ->> 'chave'))
    on conflict (edicao_id, chave) do update set
      rotulo = excluded.rotulo, ajuda = excluded.ajuda, tipo = excluded.tipo, opcoes = excluded.opcoes,
      condicao = excluded.condicao, obrigatorio = excluded.obrigatorio, sensivel = excluded.sensivel,
      ordem = excluded.ordem, removido_em = null;
  end loop;
end $$;

revoke all on function public.definir_campos_inscricao(uuid, jsonb) from public, anon;
grant execute on function public.definir_campos_inscricao(uuid, jsonb) to authenticated;
revoke all on function public.validar_respostas(uuid, jsonb) from public, anon;
grant execute on function public.validar_respostas(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Aluno cadastrado em Pessoas = inscrição aprovada, sempre em dia
-- -----------------------------------------------------------------------------
create or replace function public.sincronizar_inscricao()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_resp jsonb;
begin
  if new.papel <> 'aluno' then
    return null;
  end if;
  -- Só as respostas que a edição pergunta (curso e semestre, quando ela tiver essas perguntas).
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_resp
    from jsonb_each(jsonb_strip_nulls(jsonb_build_object('curso', new.curso, 'semestre', new.semestre)))
   where key in (select chave from campos_inscricao where edicao_id = new.edicao_id and removido_em is null);

  insert into inscricoes (edicao_id, email, respostas, situacao, origem)
  values (new.edicao_id, new.email, v_resp, case when new.removido_em is null then 'aprovada' else 'cancelada' end, 'importacao')
  on conflict (edicao_id, email) do update set
    respostas = inscricoes.respostas || excluded.respostas,
    situacao  = case when new.removido_em is null then 'aprovada' else 'cancelada' end;
  return null;
end $$;

create trigger participacoes_inscricao after insert or update of curso, semestre, removido_em, papel on public.participacoes
  for each row execute function public.sincronizar_inscricao();

-- -----------------------------------------------------------------------------
-- 7. Histórico, "nada é apagado" e permissões
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['perguntas_catalogo', 'campos_inscricao', 'inscricoes'] loop
    execute format('create trigger %I_historico after insert or update on public.%I
                    for each row execute function public.registrar_historico()', t, t);
    execute format('create trigger %I_nao_apagar before delete on public.%I
                    for each row execute function public.impedir_apagar()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Perguntas não são dados pessoais (a página pública de inscrição vai lê-las).
create policy perguntas_catalogo_select on public.perguntas_catalogo for select to authenticated using (true);
create policy perguntas_catalogo_insert on public.perguntas_catalogo for insert to authenticated with check (eh_organizador());
create policy perguntas_catalogo_update on public.perguntas_catalogo for update to authenticated using (eh_organizador()) with check (eh_organizador());

create policy campos_inscricao_select on public.campos_inscricao for select to authenticated using (true);
create policy campos_inscricao_insert on public.campos_inscricao for insert to authenticated with check (eh_organizador_de(edicao_id));
create policy campos_inscricao_update on public.campos_inscricao for update to authenticated
  using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id));

-- Inscrição: a organização da edição vê todas; cada pessoa vê a sua.
create policy inscricoes_select on public.inscricoes for select to authenticated
  using (eh_organizador_de(edicao_id) or email = email_atual());
create policy inscricoes_insert on public.inscricoes for insert to authenticated with check (eh_organizador_de(edicao_id));
create policy inscricoes_update on public.inscricoes for update to authenticated
  using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id));

grant select, insert, update on public.perguntas_catalogo, public.campos_inscricao, public.inscricoes to authenticated;
revoke delete, truncate on public.perguntas_catalogo, public.campos_inscricao, public.inscricoes from authenticated;

-- -----------------------------------------------------------------------------
-- 8. O banco de perguntas prontas
-- -----------------------------------------------------------------------------
insert into public.perguntas_catalogo (grupo, chave, rotulo, ajuda, tipo, opcoes, condicao, sensivel, traz, ordem) values
  ('Estudo',   'curso',           'Curso',                        'Ex.: Sistemas de Informação', 'texto', null, null, false, '{}', 10),
  ('Estudo',   'semestre',        'Semestre',                     null, 'numero', '{"min": 1, "max": 12}', null, false, '{}', 20),
  ('Estudo',   'escolaridade',    'Escolaridade',                 null, 'escolha', '["Ensino médio", "Técnico", "Superior", "Pós-graduação", "Mestrado", "Doutorado"]', null, false, '{}', 30),
  ('Estudo',   'situacao_estudo', 'Situação do estudo',           null, 'escolha', '["Cursando", "Concluído"]', null, false, '{}', 40),
  ('Estudo',   'instituicao',     'Instituição',                  null, 'instituicao', null, null, false, '{}', 50),
  ('Trabalho', 'trabalha',        'Está trabalhando?',            null, 'sim_nao', null, null, false, '{}', 60),
  ('Trabalho', 'cargo',           'Cargo',                        null, 'escolha',
     '["Estagiário", "Desenvolvedor", "Analista de dados", "Cientista de dados", "Engenheiro de dados", "Analista de BI", "Analista de sistemas", "Suporte / infraestrutura", "Gestor / coordenador", "Professor", "Empreendedor", "Outro"]',
     '{"campo": "trabalha", "igual": true}', false, '{trabalha,cargo_outro}', 70),
  ('Trabalho', 'cargo_outro',     'Qual o seu cargo?',            null, 'texto', null, '{"campo": "cargo", "igual": "Outro"}', false, '{}', 75),
  ('Contato',  'cidade',          'Cidade',                       null, 'texto', null, null, false, '{}', 80),
  ('Contato',  'telefone',        'Telefone / WhatsApp',          'Só a organização vê.', 'texto', null, null, true, '{}', 90),
  ('Contato',  'github',          'GitHub',                       'Endereço do seu perfil (opcional para a banca ver seus projetos).', 'texto', null, null, false, '{}', 100),
  ('Contato',  'linkedin',        'LinkedIn',                     null, 'texto', null, null, false, '{}', 110),
  ('Evento',   'camiseta',        'Tamanho da camiseta',          null, 'escolha', '["PP", "P", "M", "G", "GG", "XG"]', null, false, '{}', 120),
  ('Evento',   'alimentacao',     'Restrição alimentar',          'Ex.: vegetariano, alergia a amendoim.', 'texto', null, null, true, '{}', 130),
  ('Evento',   'acessibilidade',  'Precisa de algum recurso de acessibilidade?', 'Conte o que precisa para participar bem.', 'texto_longo', null, null, true, '{}', 140),
  ('Evento',   'como_soube',      'Como ficou sabendo do evento?', null, 'escolha', '["Professor(a)", "Colegas", "Instagram", "LinkedIn", "WhatsApp", "Site da instituição", "Outro"]', null, false, '{}', 150),
  ('LGPD',     'termo',           'Li e aceito o uso dos meus dados para a organização do evento', 'Os dados servem só para organizar o evento e não são repassados.', 'aceite', null, null, false, '{}', 160);

-- -----------------------------------------------------------------------------
-- 9. As edições de antes: curso e semestre, e cada aluno vira inscrição aprovada
-- -----------------------------------------------------------------------------
insert into public.campos_inscricao (edicao_id, chave, rotulo, ajuda, tipo, opcoes, obrigatorio, ordem, catalogo_id)
select e.id, p.chave, p.rotulo, p.ajuda, p.tipo, p.opcoes, true, p.ordem, p.id
  from public.edicoes e cross join public.perguntas_catalogo p
 where p.chave in ('curso', 'semestre');

insert into public.inscricoes (edicao_id, email, respostas, situacao, origem, criado_em)
select p.edicao_id, p.email, jsonb_strip_nulls(jsonb_build_object('curso', p.curso, 'semestre', p.semestre)),
       case when p.removido_em is null then 'aprovada' else 'cancelada' end, 'importacao', p.criado_em
  from public.participacoes p
 where p.papel = 'aluno'
on conflict (edicao_id, email) do nothing;
