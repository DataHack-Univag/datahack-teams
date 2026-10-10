-- =============================================================================
-- DataHack Univag 2026 — Migração 008: módulo de avaliação (bancas)
-- Rodar no SQL Editor DEPOIS do 007_auditoria_trocas.sql (pode rodar de novo).
--
-- Rubricas, pesos e níveis vêm de src/build_cronograma_rubrica.py (docs/rubricas.json):
--   TEC_F1 15% · TEC_F2 20% · TEC_F3 25% (banca técnica)  ·  NEG 40% (banca de negócio)
--   níveis: Insuficiente 0 · Básico 0,5 · Proficiente 0,8 · Excelente 1
--
--   - Novos papéis: avaliador_tecnico (TEC_*) e avaliador_negocio (NEG).
--     Organizadores podem avaliar qualquer rubrica.
--   - avaliacoes: uma ficha por (equipe, avaliador, rubrica), com o nível de cada critério.
--   - penalidades_aplicadas: penalidades da nota final, marcadas pela organização.
--   - configuracao.avaliacao_encerrada: trava as fichas (só a organização edita).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Papéis
-- -----------------------------------------------------------------------------
alter table public.inscritos drop constraint if exists inscritos_papel_check;
alter table public.inscritos add constraint inscritos_papel_check
  check (papel in ('aluno', 'organizador', 'avaliador_tecnico', 'avaliador_negocio'));

create or replace function public.papel_atual()
returns text language sql stable security definer set search_path = public
as $$ select papel from inscritos where email = email_atual() $$;

create or replace function public.eh_avaliador()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(papel_atual() in ('avaliador_tecnico', 'avaliador_negocio'), false) $$;

alter table public.configuracao add column if not exists avaliacao_encerrada boolean not null default false;

-- Pode lançar/editar a ficha desta rubrica agora?
create or replace function public.pode_avaliar(p_rubrica text)
returns boolean language sql stable security definer set search_path = public
as $$
  select eh_organizador()
      or (
        not coalesce((select avaliacao_encerrada from configuracao where id = 1), false)
        and (
          (papel_atual() = 'avaliador_tecnico' and p_rubrica in ('TEC_F1', 'TEC_F2', 'TEC_F3'))
          or (papel_atual() = 'avaliador_negocio' and p_rubrica = 'NEG')
        )
      )
$$;

-- -----------------------------------------------------------------------------
-- Fichas de avaliação
-- -----------------------------------------------------------------------------
create table if not exists public.avaliacoes (
  id             uuid primary key default gen_random_uuid(),
  -- restrict: equipe ou avaliador com nota lançada não pode ser apagado sem querer.
  equipe_id      uuid not null references public.equipes (id) on delete restrict,
  avaliador      text not null references public.inscritos (email) on delete restrict on update cascade,
  rubrica        text not null check (rubrica in ('TEC_F1', 'TEC_F2', 'TEC_F3', 'NEG')),
  -- {"criterio_id": fator}, fator em 0 | 0.5 | 0.8 | 1
  notas          jsonb not null default '{}'::jsonb check (jsonb_typeof(notas) = 'object'),
  comentario     text check (comentario is null or char_length(comentario) <= 2000),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (equipe_id, avaliador, rubrica)
);
create index if not exists avaliacoes_equipe_idx on public.avaliacoes (equipe_id);

-- Só aceita os fatores dos 4 níveis.
create or replace function public.validar_notas()
returns trigger language plpgsql
as $$
declare
  v jsonb;
begin
  for v in select value from jsonb_each(new.notas) loop
    if jsonb_typeof(v) <> 'number' or (v::text)::numeric not in (0, 0.5, 0.8, 1) then
      raise exception 'Nível inválido na ficha de avaliação.';
    end if;
  end loop;
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists avaliacoes_validar on public.avaliacoes;
create trigger avaliacoes_validar
  before insert or update on public.avaliacoes
  for each row execute function public.validar_notas();

alter table public.avaliacoes enable row level security;

-- Avaliador vê as próprias fichas; a organização vê todas.
drop policy if exists avaliacoes_select on public.avaliacoes;
create policy avaliacoes_select on public.avaliacoes for select to authenticated
  using (eh_organizador() or avaliador = email_atual());

drop policy if exists avaliacoes_insert on public.avaliacoes;
create policy avaliacoes_insert on public.avaliacoes for insert to authenticated
  with check (avaliador = email_atual() and pode_avaliar(rubrica));

drop policy if exists avaliacoes_update on public.avaliacoes;
create policy avaliacoes_update on public.avaliacoes for update to authenticated
  using (avaliador = email_atual() and pode_avaliar(rubrica))
  with check (avaliador = email_atual() and pode_avaliar(rubrica));

drop policy if exists avaliacoes_delete on public.avaliacoes;
create policy avaliacoes_delete on public.avaliacoes for delete to authenticated
  using (eh_organizador() or (avaliador = email_atual() and pode_avaliar(rubrica)));

revoke all on public.avaliacoes from anon;
grant select, insert, update, delete on public.avaliacoes to authenticated;

-- -----------------------------------------------------------------------------
-- Penalidades da nota final (ids e pontos definidos nas rubricas do evento)
-- -----------------------------------------------------------------------------
create table if not exists public.penalidades_aplicadas (
  equipe_id     uuid not null references public.equipes (id) on delete cascade,
  penalidade    text not null check (penalidade in ('causalidade', 'celulas', 'acesso', 'planob', 'tempo')),
  aplicado_por  text references public.inscritos (email) on delete set null on update cascade,
  criado_em     timestamptz not null default now(),
  primary key (equipe_id, penalidade)
);

alter table public.penalidades_aplicadas enable row level security;
drop policy if exists penalidades_select on public.penalidades_aplicadas;
create policy penalidades_select on public.penalidades_aplicadas for select to authenticated
  using (eh_organizador() or eh_avaliador());
drop policy if exists penalidades_write on public.penalidades_aplicadas;
create policy penalidades_write on public.penalidades_aplicadas for all to authenticated
  using (eh_organizador()) with check (eh_organizador());

revoke all on public.penalidades_aplicadas from anon;
grant select, insert, update, delete on public.penalidades_aplicadas to authenticated;

grant execute on function public.papel_atual(), public.eh_avaliador(), public.pode_avaliar(text) to authenticated;
