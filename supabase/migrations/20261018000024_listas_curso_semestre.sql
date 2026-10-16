-- =============================================================================
-- 024 · Curso e semestre como listas no banco de perguntas
-- Tudo o que tem resposta conhecida vira lista para escolher (sem digitar):
--   curso     lista de cursos + "Outro" (que abre "Qual o seu curso?", como o cargo)
--   semestre  1º a 12º semestre ({"min":1,"max":12,"inteiro":true} vira lista na tela)
-- Muda só o banco de perguntas prontas: as edições que já existem continuam como estão
-- (no editor do formulário dá para trocar o tipo de uma pergunta).
-- =============================================================================

update public.perguntas_catalogo set
  tipo   = 'escolha',
  ajuda  = null,
  opcoes = '["Administração", "Agronomia", "Análise e Desenvolvimento de Sistemas", "Arquitetura e Urbanismo",
             "Ciência da Computação", "Ciência de Dados", "Ciências Contábeis", "Design", "Direito", "Economia",
             "Enfermagem", "Engenharia Civil", "Engenharia de Computação", "Engenharia de Produção",
             "Engenharia de Software", "Engenharia Elétrica", "Estatística", "Gestão da Tecnologia da Informação",
             "Jogos Digitais", "Matemática", "Medicina", "Psicologia", "Publicidade e Propaganda",
             "Redes de Computadores", "Segurança da Informação", "Sistemas de Informação", "Outro"]'::jsonb,
  traz   = '{curso_outro}'
where chave = 'curso';

insert into public.perguntas_catalogo (grupo, chave, rotulo, ajuda, tipo, opcoes, condicao, sensivel, ordem)
values ('Estudo', 'curso_outro', 'Qual o seu curso?', null, 'texto', null, '{"campo": "curso", "igual": "Outro"}', false, 15)
on conflict (chave) do nothing;

update public.perguntas_catalogo set opcoes = '{"min": 1, "max": 12, "inteiro": true}'::jsonb where chave = 'semestre';

-- A conferência das respostas passa a recusar número quebrado quando a pergunta é de inteiros.
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
    elsif c.tipo = 'numero' and coalesce((c.opcoes ->> 'inteiro')::boolean, false) and v::numeric <> trunc(v::numeric) then
      erros := erros || format('%s: escolha um número inteiro.', c.rotulo);
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
