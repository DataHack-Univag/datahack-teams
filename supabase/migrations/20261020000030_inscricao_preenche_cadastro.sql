-- =============================================================================
-- 030 · Inscrição aprovada já traz curso, semestre e CR para o cadastro
-- -----------------------------------------------------------------------------
-- Quem se inscrevia pela página respondia curso e semestre, mas ao ser aprovado entrava
-- na edição sem eles: a lista de Pessoas (e o gerador de equipes) lê curso e semestre da
-- participação e o CR da tabela de notas. Agora, ao entrar na edição, a participação recebe
-- o que a pessoa respondeu ("Outro" usa o texto digitado), sem apagar o que já existia.
-- No fim, corrige quem já foi aprovado sem esses dados.
-- =============================================================================

-- Curso, semestre e CR das respostas da inscrição (nulos se não respondeu ou fora da faixa).
create or replace function public.cadastro_da_inscricao(p_edicao uuid, p_email text,
  out curso text, out semestre int, out cr numeric)
language sql stable security definer set search_path = public
as $$
  select nullif(btrim(case when r ->> 'curso' = 'Outro' then coalesce(r ->> 'curso_outro', '') else coalesce(r ->> 'curso', '') end), ''),
         case when jsonb_typeof(r -> 'semestre') = 'number' and (r ->> 'semestre')::numeric between 1 and 12
                   and (r ->> 'semestre')::numeric = trunc((r ->> 'semestre')::numeric)
              then (r ->> 'semestre')::int end,
         case when jsonb_typeof(r -> 'cr') = 'number' and (r ->> 'cr')::numeric between 0 and 10 then (r ->> 'cr')::numeric end
    from (select respostas as r from inscricoes where edicao_id = p_edicao and email = p_email) x
$$;
revoke all on function public.cadastro_da_inscricao(uuid, text) from public, anon, authenticated;

-- Cadastro → respostas (gatilho da 018/020): se a resposta já diz o mesmo curso (igual, com
-- outra caixa, ou "Outro" + o texto digitado), ela fica como está. Antes, copiar "Biomedicina"
-- por cima de "Outro" quebrava a resposta (o formulário recusa um curso fora da lista).
create or replace function public.sincronizar_inscricao()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_resp  jsonb;
  v_atual jsonb;
begin
  if new.papel <> 'aluno' then
    return null;
  end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_resp
    from jsonb_each(jsonb_strip_nulls(jsonb_build_object('curso', new.curso, 'semestre', new.semestre)))
   where key in (select chave from campos_inscricao where edicao_id = new.edicao_id and removido_em is null);

  select respostas into v_atual from inscricoes where edicao_id = new.edicao_id and email = new.email;
  if v_resp ? 'curso' and v_atual is not null
     and (lower(btrim(coalesce(v_atual ->> 'curso', ''))) = lower(btrim(new.curso))
          or (v_atual ->> 'curso' = 'Outro' and lower(btrim(coalesce(v_atual ->> 'curso_outro', ''))) = lower(btrim(new.curso)))) then
    v_resp := v_resp - 'curso';
  end if;

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

-- Inscrição aprovada = participação (ou de volta, se tinha saído), já com curso, semestre e CR.
create or replace function public.entrar_na_edicao(p_edicao uuid, p_email text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  c record;
begin
  select * into c from cadastro_da_inscricao(p_edicao, p_email);
  insert into participacoes (edicao_id, email, papel, curso, semestre) values (p_edicao, p_email, 'aluno', c.curso, c.semestre)
  on conflict (edicao_id, email) do update
     set removido_em = null,
         curso = coalesce(participacoes.curso, excluded.curso),
         semestre = coalesce(participacoes.semestre, excluded.semestre);
  if c.cr is not null then
    insert into notas (edicao_id, email, nota) values (p_edicao, p_email, c.cr)
    on conflict (edicao_id, email) do update set nota = excluded.nota where notas.nota is null;
  end if;
end $$;
revoke all on function public.entrar_na_edicao(uuid, text) from public, anon, authenticated;

-- Quem já entrou pela inscrição sem curso/semestre/CR: completa (sem trocar o que existe).
do $$
declare
  p record;
  c record;
  n int := 0;
begin
  for p in
    select pa.edicao_id, pa.email from participacoes pa
      join inscricoes i on i.edicao_id = pa.edicao_id and i.email = pa.email and i.situacao = 'aprovada'
     where pa.papel = 'aluno' and pa.removido_em is null
       and (pa.curso is null or pa.semestre is null
            or not exists (select 1 from notas nt where nt.edicao_id = pa.edicao_id and nt.email = pa.email and nt.nota is not null))
  loop
    select * into c from cadastro_da_inscricao(p.edicao_id, p.email);
    if c.curso is null and c.semestre is null and c.cr is null then
      continue;
    end if;
    update participacoes set curso = coalesce(curso, c.curso), semestre = coalesce(semestre, c.semestre)
     where edicao_id = p.edicao_id and email = p.email and (curso is null and c.curso is not null or semestre is null and c.semestre is not null);
    if c.cr is not null then
      insert into notas (edicao_id, email, nota) values (p.edicao_id, p.email, c.cr)
      on conflict (edicao_id, email) do update set nota = excluded.nota where notas.nota is null;
    end if;
    n := n + 1;
  end loop;
  raise notice 'Cadastros completados a partir da inscrição: %', n;
end $$;
