-- =============================================================================
-- 023 · Telas ao vivo (Supabase Realtime)
-- Quem se inscreveu vê a aprovação na hora, e o participante vê o check-in confirmado
-- assim que a mentoria lê o QR. O Realtime respeita as permissões (RLS): cada pessoa só
-- recebe mudanças das linhas que ela já podia ler.
-- Onde não existe a publicação do Realtime (Postgres local de teste), não faz nada.
-- =============================================================================

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Sem a publicação supabase_realtime (banco local): nada a fazer.';
    return;
  end if;
  foreach t in array array['inscricoes', 'participacoes'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
