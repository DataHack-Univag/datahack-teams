-- =============================================================================
-- 021 · Check-in por QR code
-- Cada participante tem um código só dele por edição (o QR mostra esse código). Na entrada, a
-- mentoria ou a organização lê o QR e a presença é marcada (a mesma presença da 011/012).
-- Os códigos ficam numa tabela própria: participantes leem as participações dos colegas, e o
-- código não pode vazar (seria fazer check-in no lugar de outro).
-- =============================================================================

create table public.checkin_codigos (
  edicao_id  uuid not null references public.edicoes (id),
  email      text not null references public.pessoas (email) on update cascade,
  -- 8 caracteres sem os que confundem (0/O, 1/I/L).
  codigo     text not null unique check (codigo ~ '^[A-HJ-NP-Z2-9]{8}$'),
  criado_em  timestamptz not null default now(),
  primary key (edicao_id, email)
);

do $$
begin
  execute 'create trigger checkin_codigos_nao_apagar before delete on public.checkin_codigos for each row execute function public.impedir_apagar()';
end $$;
alter table public.checkin_codigos enable row level security;
revoke all on public.checkin_codigos from anon, authenticated;
-- Ninguém lê a tabela direto: o próprio código vem de meu_codigo_checkin().

-- Código aleatório (gen_random_uuid é criptográfico).
create or replace function public.gerar_codigo_checkin()
returns text language sql volatile
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                           (get_byte(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), i) % 32) + 1, 1), '')
    from generate_series(0, 7) i
$$;

-- O código de quem está logado nesta edição (cria na primeira vez).
create or replace function public.meu_codigo_checkin(p_edicao uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_email  text := email_atual();
  v_codigo text;
begin
  if not participa_de(p_edicao) then
    raise exception 'Você não participa desta edição.' using errcode = '42501';
  end if;
  select codigo into v_codigo from checkin_codigos where edicao_id = p_edicao and email = v_email;
  if v_codigo is null then
    loop
      begin
        insert into checkin_codigos (edicao_id, email, codigo) values (p_edicao, v_email, gerar_codigo_checkin())
        returning codigo into v_codigo;
        exit;
      exception when unique_violation then
        -- Outro código igual (raríssimo) ou a mesma pessoa em duas abas: tenta de novo.
        select codigo into v_codigo from checkin_codigos where edicao_id = p_edicao and email = v_email;
        exit when v_codigo is not null;
      end;
    end loop;
  end if;
  return v_codigo;
end $$;

-- Leitura do QR na entrada: marca presente (aluno) e diz quem é.
create or replace function public.fazer_checkin(p_edicao uuid, p_codigo text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_email   text;
  p         participacoes%rowtype;
  v_nome    text;
  v_equipe  text;
  v_estava  boolean;
begin
  if not (eh_organizador_de(p_edicao) or papel_em(p_edicao) = 'mentor') then
    raise exception 'Só a organização e a mentoria fazem o check-in.' using errcode = '42501';
  end if;
  select email into v_email from checkin_codigos
   where edicao_id = p_edicao and codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_email is null then
    raise exception 'Código não encontrado nesta edição. Confira se a pessoa abriu o QR da edição certa.';
  end if;
  select * into p from participacoes where edicao_id = p_edicao and email = v_email;
  if p.email is null or p.removido_em is not null then
    raise exception 'Esta pessoa não participa mais desta edição.';
  end if;
  select nome into v_nome from pessoas where email = v_email;
  select e.nome into v_equipe from membros m join equipes e on e.id = m.equipe_id
   where m.edicao_id = p_edicao and m.email = v_email and m.saiu_em is null limit 1;

  v_estava := coalesce(p.presenca = 'presente', false);
  if p.papel = 'aluno' and not v_estava then
    update participacoes set presenca = 'presente', presenca_em = now(), presenca_por = email_atual()
     where edicao_id = p_edicao and email = v_email;
  end if;
  return jsonb_build_object('nome', v_nome, 'email', v_email, 'papel', p.papel, 'equipe', v_equipe,
                            'ja_estava', v_estava, 'presenca_em', case when v_estava then p.presenca_em end);
end $$;

revoke all on function public.gerar_codigo_checkin() from public, anon, authenticated;
revoke all on function public.meu_codigo_checkin(uuid), public.fazer_checkin(uuid, text) from public, anon;
grant execute on function public.meu_codigo_checkin(uuid), public.fazer_checkin(uuid, text) to authenticated;
