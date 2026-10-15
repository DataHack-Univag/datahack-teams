-- =============================================================================
-- 020 · Inscrição pública (eventos de instituições escolhidas ou abertos)
--   termos               texto do termo de uso dos dados, com versão (quem aceitou qual)
--   edicao_publica()     o que a página pública mostra: marca, datas, perguntas, vagas
--   inscrever_publico()  a pessoa se inscreve sem login: vira pessoa + inscrição, e entra na
--                        edição na hora (aprovação automática com vaga), vai para a lista de
--                        espera (lotou) ou espera a organização (aprovação manual)
--   decidir_inscricao()  a organização aprova, recusa, põe na espera ou cancela
--   minhas_inscricoes()  quem se inscreveu e ainda não entrou acompanha a situação
--   vitrine()            o login mostra a logo da edição atual e as inscrições abertas
-- Evento fechado (lista) continua igual: só a organização cadastra.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Termo de uso dos dados (LGPD), com versão
-- -----------------------------------------------------------------------------
create table public.termos (
  edicao_id  uuid not null references public.edicoes (id),
  versao     int not null check (versao > 0),
  texto      text not null check (char_length(btrim(texto)) between 20 and 20000),
  criado_em  timestamptz not null default now(),
  criado_por text,
  primary key (edicao_id, versao)
);

do $$
begin
  execute 'create trigger termos_historico after insert or update on public.termos for each row execute function public.registrar_historico()';
  execute 'create trigger termos_nao_apagar before delete on public.termos for each row execute function public.impedir_apagar()';
end $$;
alter table public.termos enable row level security;
revoke all on public.termos from anon;
create policy termos_select on public.termos for select to authenticated using (true);
grant select on public.termos to authenticated;

-- Texto novo = versão nova (as anteriores ficam: cada inscrição sabe qual aceitou).
create or replace function public.definir_termo(p_edicao uuid, p_texto text)
returns int language plpgsql security definer set search_path = public
as $$
declare
  v_atual termos%rowtype;
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição define o termo.' using errcode = '42501';
  end if;
  select * into v_atual from termos where edicao_id = p_edicao order by versao desc limit 1;
  if v_atual.texto is not distinct from btrim(p_texto) then
    return v_atual.versao;
  end if;
  insert into termos (edicao_id, versao, texto, criado_por)
  values (p_edicao, coalesce(v_atual.versao, 0) + 1, btrim(p_texto), nullif(email_atual(), ''));
  return coalesce(v_atual.versao, 0) + 1;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Situação das inscrições da edição
-- -----------------------------------------------------------------------------
create or replace function public.aprovadas_na_edicao(p_edicao uuid)
returns int language sql stable security definer set search_path = public
as $$ select count(*)::int from inscricoes where edicao_id = p_edicao and situacao = 'aprovada' $$;

-- fechada (evento de lista) | em_breve | aberta | encerrada
create or replace function public.situacao_inscricao(p_edicao uuid)
returns text language sql stable security definer set search_path = public
as $$
  select case
    when e.acesso = 'lista' then 'fechada'
    when e.situacao = 'encerrada' or (e.inscricao_fecha_em is not null and now() >= e.inscricao_fecha_em) then 'encerrada'
    when e.inscricao_abre_em is not null and now() < e.inscricao_abre_em then 'em_breve'
    else 'aberta'
  end
  from edicoes e where e.id = p_edicao
$$;

-- -----------------------------------------------------------------------------
-- 3. O que a página pública mostra (sem login)
-- -----------------------------------------------------------------------------
create or replace function public.edicao_publica(p_slug text)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', e.id, 'numero', e.numero, 'slug', e.slug, 'nome', e.nome, 'marca', e.marca,
    'descricao', e.descricao, 'local', e.local, 'data_inicio', e.data_inicio, 'data_fim', e.data_fim,
    'acesso', e.acesso, 'aprovacao', e.aprovacao, 'vagas', e.vagas,
    'inscricao_abre_em', e.inscricao_abre_em, 'inscricao_fecha_em', e.inscricao_fecha_em,
    'situacao', situacao_inscricao(e.id),
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
  from edicoes e where e.slug = lower(btrim(p_slug)) and e.acesso <> 'lista'
$$;

-- -----------------------------------------------------------------------------
-- 4. Inscrever-se (sem login)
-- -----------------------------------------------------------------------------
create or replace function public.inscrever_publico(p_slug text, p_nome text, p_email text, p_respostas jsonb, p_termo_versao int default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  e          edicoes%rowtype;
  v_email    text := lower(btrim(coalesce(p_email, '')));
  v_nome     text := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_termo    termos%rowtype;
  v_existe   inscricoes%rowtype;
  v_situacao text;
begin
  select * into e from edicoes where slug = lower(btrim(p_slug)) and acesso <> 'lista';
  if e.id is null then
    raise exception 'Esta edição não recebe inscrições por aqui.';
  end if;
  if situacao_inscricao(e.id) <> 'aberta' then
    raise exception 'As inscrições desta edição não estão abertas.';
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 200 then
    raise exception 'Informe um e-mail válido.';
  end if;
  if char_length(v_nome) < 3 or char_length(v_nome) > 120 or v_nome !~ '\s' then
    raise exception 'Informe o nome completo (nome e sobrenome).';
  end if;

  select * into v_termo from termos where edicao_id = e.id order by versao desc limit 1;
  if v_termo.versao is not null and p_termo_versao is distinct from v_termo.versao then
    raise exception 'Leia e aceite o termo de uso dos dados para se inscrever.';
  end if;

  -- A mesma pessoa de outra edição (Gmail com ou sem pontos é o mesmo e-mail).
  select email into v_email from pessoas where normalizar_email(email) = normalizar_email(v_email)
   order by removido_em nulls first limit 1;
  if not found then
    v_email := lower(btrim(p_email));
    insert into pessoas (email, nome) values (v_email, v_nome);
  else
    -- Pessoa arquivada que volta a se inscrever: volta a poder entrar.
    update pessoas set removido_em = null where email = v_email and removido_em is not null;
  end if;

  select * into v_existe from inscricoes where edicao_id = e.id and email = v_email;
  if v_existe.id is not null and v_existe.situacao <> 'cancelada' then
    return jsonb_build_object('situacao', v_existe.situacao, 'ja_inscrito', true, 'email', v_email);
  end if;

  v_situacao := case
    when e.aprovacao = 'manual' then 'pendente'
    when e.vagas is null or aprovadas_na_edicao(e.id) < e.vagas then 'aprovada'
    else 'espera'
  end;

  insert into inscricoes (edicao_id, email, respostas, situacao, origem, termo_versao, termo_aceito_em)
  values (e.id, v_email, coalesce(p_respostas, '{}'::jsonb), v_situacao, 'formulario',
          v_termo.versao, case when v_termo.versao is not null then now() end)
  on conflict (edicao_id, email) do update set
    respostas = excluded.respostas, situacao = excluded.situacao, origem = 'formulario',
    termo_versao = excluded.termo_versao, termo_aceito_em = excluded.termo_aceito_em,
    decidido_por = null, decidido_em = null;

  if v_situacao = 'aprovada' then
    perform entrar_na_edicao(e.id, v_email);
  end if;
  return jsonb_build_object('situacao', v_situacao, 'ja_inscrito', false, 'email', v_email);
end $$;

-- Inscrição aprovada = participação de aluno (ou de volta, se tinha saído).
create or replace function public.entrar_na_edicao(p_edicao uuid, p_email text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into participacoes (edicao_id, email, papel) values (p_edicao, p_email, 'aluno')
  on conflict (edicao_id, email) do update set removido_em = null
   where participacoes.removido_em is not null;
end $$;
revoke all on function public.entrar_na_edicao(uuid, text) from public, anon, authenticated;

-- Lotou e abriu vaga: quem está há mais tempo na espera entra (só na aprovação automática).
create or replace function public.promover_da_espera(p_edicao uuid)
returns int language plpgsql security definer set search_path = public
as $$
declare
  e   edicoes%rowtype;
  i   inscricoes%rowtype;
  n   int := 0;
begin
  select * into e from edicoes where id = p_edicao;
  if e.aprovacao <> 'automatica' then
    return 0;
  end if;
  loop
    exit when e.vagas is not null and aprovadas_na_edicao(p_edicao) >= e.vagas;
    select * into i from inscricoes where edicao_id = p_edicao and situacao = 'espera' order by criado_em limit 1;
    exit when i.id is null;
    update inscricoes set situacao = 'aprovada', decidido_em = now(), decidido_por = null where id = i.id;
    perform entrar_na_edicao(p_edicao, i.email);
    n := n + 1;
    i := null;
  end loop;
  return n;
end $$;
revoke all on function public.promover_da_espera(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. A organização decide
-- -----------------------------------------------------------------------------
create or replace function public.decidir_inscricao(p_inscricao uuid, p_situacao text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  i          inscricoes%rowtype;
  v_promov   int := 0;
begin
  select * into i from inscricoes where id = p_inscricao;
  if i.id is null or not eh_organizador_de(i.edicao_id) then
    raise exception 'Só a organização da edição decide as inscrições.' using errcode = '42501';
  end if;
  if p_situacao not in ('aprovada', 'recusada', 'espera', 'pendente', 'cancelada') then
    raise exception 'Situação inválida.';
  end if;
  if i.situacao = p_situacao then
    return jsonb_build_object('promovidas', 0);
  end if;

  if i.situacao = 'aprovada' then
    -- Sair da edição: quem está numa equipe precisa sair dela antes.
    if exists (select 1 from membros where edicao_id = i.edicao_id and email = i.email and saiu_em is null) then
      raise exception 'Esta pessoa está numa equipe. Tire-a da equipe antes de mudar a inscrição.';
    end if;
    update participacoes set removido_em = now()
     where edicao_id = i.edicao_id and email = i.email and removido_em is null and papel = 'aluno';
  end if;

  update inscricoes set situacao = p_situacao, decidido_por = nullif(email_atual(), ''), decidido_em = now()
   where id = i.id;

  if p_situacao = 'aprovada' then
    perform entrar_na_edicao(i.edicao_id, i.email);
  elsif i.situacao = 'aprovada' then
    v_promov := promover_da_espera(i.edicao_id);
  end if;
  return jsonb_build_object('promovidas', v_promov);
end $$;

-- Gatilho de Pessoas (018) não pode desfazer a decisão: só sincroniza respostas e a volta.
create or replace function public.sincronizar_inscricao()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_resp jsonb;
begin
  if new.papel <> 'aluno' then
    return null;
  end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_resp
    from jsonb_each(jsonb_strip_nulls(jsonb_build_object('curso', new.curso, 'semestre', new.semestre)))
   where key in (select chave from campos_inscricao where edicao_id = new.edicao_id and removido_em is null);

  insert into inscricoes (edicao_id, email, respostas, situacao, origem)
  values (new.edicao_id, new.email, v_resp, case when new.removido_em is null then 'aprovada' else 'cancelada' end, 'importacao')
  on conflict (edicao_id, email) do update set
    respostas = inscricoes.respostas || excluded.respostas,
    -- Ativa = aprovada; arquivada pela organização em Pessoas = cancelada (salvo se já foi decidida).
    situacao = case
      when new.removido_em is null then 'aprovada'
      when inscricoes.situacao = 'aprovada' then 'cancelada'
      else inscricoes.situacao
    end;
  return null;
end $$;

-- Respostas recusadas pelo formulário chegam à tela com a explicação (antes era um erro genérico).
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
      raise exception '%', array_to_string(v_erros, ' ');
    end if;
  end if;
  if v_inst ~ '^[0-9a-f-]{36}$' then
    new.instituicao_id := v_inst::uuid;
  elsif new.instituicao_id is null and (select acesso from edicoes where id = new.edicao_id) = 'lista' then
    new.instituicao_id := (select instituicao_id from edicao_instituicoes
                            where edicao_id = new.edicao_id and removido_em is null order by ordem limit 1);
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- 6. Quem se inscreveu acompanha a situação; o login mostra a vitrine
-- -----------------------------------------------------------------------------
create or replace function public.minhas_inscricoes()
returns jsonb language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'edicao', e.nome, 'numero', e.numero, 'slug', e.slug, 'marca', e.marca,
           'data_inicio', e.data_inicio, 'data_fim', e.data_fim, 'local', e.local,
           'situacao', i.situacao, 'criado_em', i.criado_em,
           'posicao', case when i.situacao = 'espera' then
              (select count(*) from inscricoes x where x.edicao_id = i.edicao_id and x.situacao = 'espera' and x.criado_em <= i.criado_em) end
         ) order by i.criado_em desc), '[]'::jsonb)
    from inscricoes i join edicoes e on e.id = i.edicao_id
   where i.email = email_atual()
$$;

create or replace function public.vitrine()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'atual', (select jsonb_build_object('nome', nome, 'marca', marca, 'local', local, 'data_inicio', data_inicio, 'data_fim', data_fim)
                from edicoes where atual),
    'inscricoes', coalesce((select jsonb_agg(jsonb_build_object(
                     'slug', slug, 'nome', coalesce(marca ->> 'nome_publico', nome), 'situacao', situacao_inscricao(id),
                     'data_inicio', data_inicio, 'local', local) order by data_inicio nulls last)
                   from edicoes where acesso <> 'lista' and situacao_inscricao(id) in ('aberta', 'em_breve')), '[]'::jsonb)
  )
$$;

revoke all on function public.edicao_publica(text), public.inscrever_publico(text, text, text, jsonb, int), public.vitrine() from public;
grant execute on function public.edicao_publica(text), public.inscrever_publico(text, text, text, jsonb, int), public.vitrine() to anon, authenticated;
revoke all on function public.decidir_inscricao(uuid, text), public.minhas_inscricoes(), public.definir_termo(uuid, text) from public, anon;
grant execute on function public.decidir_inscricao(uuid, text), public.minhas_inscricoes(), public.definir_termo(uuid, text) to authenticated;
revoke all on function public.situacao_inscricao(uuid), public.aprovadas_na_edicao(uuid) from public, anon;
grant execute on function public.situacao_inscricao(uuid), public.aprovadas_na_edicao(uuid) to authenticated;
