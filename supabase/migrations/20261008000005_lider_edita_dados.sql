-- =============================================================================
-- DataHack Univag 2026 — Migração 005: só o líder edita nome e repositório
-- Rodar no SQL Editor DEPOIS do 004_trava_lider.sql (pode rodar de novo).
--
--   - Nome da equipe e repositório GitHub: só o líder (ou a organização) altera.
--     Sem líder definido, ninguém da equipe altera até escolherem o líder.
--   - Links de entrega e a verificação do repositório continuam abertos a todos
--     os integrantes.
-- =============================================================================

create or replace function public.checar_dados_equipe()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (new.nome is distinct from old.nome or new.repo_github is distinct from old.repo_github)
     and not eh_organizador()
     and (old.lider_email is null or old.lider_email <> email_atual()) then
    raise exception 'Só o líder da equipe pode alterar o nome e o repositório.';
  end if;
  return new;
end $$;

drop trigger if exists lider_edita_dados on public.equipes;
create trigger lider_edita_dados
  before update of nome, repo_github on public.equipes
  for each row execute function public.checar_dados_equipe();
