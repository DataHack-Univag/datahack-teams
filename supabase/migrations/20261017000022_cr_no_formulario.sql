-- =============================================================================
-- 022 · CR no formulário, e o cadastro da organização seguindo o formulário da edição
-- Na Edição 1 a organização cadastrava curso, semestre e CR (a nota média que o gerador usa
-- para equilibrar as equipes). O CR continua em "notas" (é de lá que o gerador lê); agora ele
-- também é uma pergunta do formulário, e a inscrição de cada aluno acompanha a nota.
-- A organização preenche as outras perguntas da edição no cadastro em Pessoas.
-- =============================================================================

insert into public.perguntas_catalogo (grupo, chave, rotulo, ajuda, tipo, opcoes, sensivel, ordem)
values ('Estudo', 'cr', 'CR (nota média)', 'De 0 a 10. Só a organização vê; o gerador usa para equilibrar as equipes.',
        'numero', '{"min": 0, "max": 10}', true, 25)
on conflict (chave) do nothing;

-- Edições que já perguntam curso e semestre (as de antes) ganham o CR logo depois, opcional
-- (calouro não tem nota).
insert into public.campos_inscricao (edicao_id, chave, rotulo, ajuda, tipo, opcoes, obrigatorio, sensivel, ordem, catalogo_id)
select c.edicao_id, p.chave, p.rotulo, p.ajuda, p.tipo, p.opcoes, false, true, c.ordem + 1, p.id
  from public.campos_inscricao c cross join public.perguntas_catalogo p
 where c.chave = 'semestre' and c.removido_em is null and p.chave = 'cr'
on conflict (edicao_id, chave) do nothing;

-- As notas que já existem vão para a inscrição.
update public.inscricoes i set respostas = i.respostas || jsonb_build_object('cr', n.nota)
  from public.notas n
 where n.edicao_id = i.edicao_id and n.email = i.email and n.nota is not null
   and exists (select 1 from public.campos_inscricao c where c.edicao_id = i.edicao_id and c.chave = 'cr' and c.removido_em is null);

-- Daqui em diante, mudou a nota, a inscrição acompanha.
create or replace function public.sincronizar_cr()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from campos_inscricao where edicao_id = new.edicao_id and chave = 'cr' and removido_em is null) then
    return null;
  end if;
  update inscricoes
     set respostas = case when new.nota is null then respostas - 'cr' else respostas || jsonb_build_object('cr', new.nota) end
   where edicao_id = new.edicao_id and email = new.email;
  return null;
end $$;

create trigger notas_inscricao after insert or update of nota on public.notas
  for each row execute function public.sincronizar_cr();

-- A organização preenche as respostas de alguém (cadastro em Pessoas). Pode deixar em branco o
-- que não sabe (não cobra obrigatórias), mas o que preencher precisa estar no formato certo.
-- Curso, semestre e CR têm lugar próprio (participação e notas) e não vêm por aqui.
create or replace function public.salvar_respostas_organizacao(p_edicao uuid, p_email text, p_respostas jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_proprias text[] := array['curso', 'semestre', 'cr'];
  v_atual    jsonb;
  v_nova     jsonb;
  v_erros    text[];
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição preenche o cadastro.' using errcode = '42501';
  end if;
  select respostas into v_atual from inscricoes where edicao_id = p_edicao and email = lower(btrim(p_email));
  if v_atual is null then
    raise exception 'Esta pessoa não tem inscrição nesta edição (cadastre-a como aluno primeiro).';
  end if;
  -- Mantém curso/semestre/CR como estão e troca o resto pelo que veio.
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_nova
    from (select key, value from jsonb_each(v_atual) where key = any (v_proprias)
          union all
          select key, value from jsonb_each(coalesce(p_respostas, '{}'::jsonb))
           where not (key = any (v_proprias)) and value not in ('null'::jsonb, '""'::jsonb, '[]'::jsonb)) x;

  select coalesce(array_agg(e), '{}') into v_erros from unnest(validar_respostas(p_edicao, v_nova)) e
   where e not like 'Responda:%';
  if cardinality(v_erros) > 0 then
    raise exception '%', array_to_string(v_erros, ' ');
  end if;
  update inscricoes set respostas = v_nova where edicao_id = p_edicao and email = lower(btrim(p_email));
end $$;

revoke all on function public.salvar_respostas_organizacao(uuid, text, jsonb) from public, anon;
grant execute on function public.salvar_respostas_organizacao(uuid, text, jsonb) to authenticated;
