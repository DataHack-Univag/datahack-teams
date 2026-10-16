-- =============================================================================
-- 026 · Mais telas ao vivo (Supabase Realtime)
-- A 023 ligou inscrições e presença. Esta liga o resto do que muda durante o evento:
-- equipes e convites, trocas, chamados, avaliação (fichas, notas, penalidades),
-- materiais, lugares no mapa e a estrutura da avaliação (fases e critérios).
-- O Realtime respeita as permissões (RLS): cada pessoa só recebe mudanças das linhas que
-- ela já podia ler. Onde não existe a publicação (Postgres local de teste), não faz nada.
-- =============================================================================

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Sem a publicação supabase_realtime (banco local): nada a fazer.';
    return;
  end if;
  foreach t in array array['equipes', 'membros', 'trocas', 'chamados', 'fichas', 'notas_criterio', 'penalidades_equipe',
                           'materiais', 'alocacoes', 'fases', 'criterios'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
