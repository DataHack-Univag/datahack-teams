-- =============================================================================
-- 012 · Mentoria no sistema
-- Mentores entram no sistema: veem as equipes e os alunos da edição (as regras de leitura
-- da 010 já valem para qualquer participante) e registram a presença dos alunos.
-- Presença é a única coisa que a mentoria altera, por esta função: a participação em si
-- (papel, banca, curso, semestre) continua só com a organização.
-- =============================================================================

create or replace function public.registrar_presenca(p_edicao uuid, p_email text, p_presenca text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not (eh_organizador_de(p_edicao) or papel_em(p_edicao) = 'mentor') then
    raise exception 'Só a organização e a mentoria registram presença.' using errcode = '42501';
  end if;
  if p_presenca is not null and p_presenca not in ('presente', 'ausente') then
    raise exception 'Presença inválida: use presente ou ausente.';
  end if;

  -- null limpa o registro (usado pelo "desfazer").
  update participacoes
     set presenca     = p_presenca,
         presenca_em  = case when p_presenca is null then null else now() end,
         presenca_por = case when p_presenca is null then null else email_atual() end
   where edicao_id = p_edicao and email = lower(btrim(p_email)) and papel = 'aluno' and removido_em is null;
  if not found then
    raise exception 'Essa pessoa não é aluna desta edição.';
  end if;
end $$;

revoke all on function public.registrar_presenca(uuid, text, text) from public, anon;
grant execute on function public.registrar_presenca(uuid, text, text) to authenticated;
