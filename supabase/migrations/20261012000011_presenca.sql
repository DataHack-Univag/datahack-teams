-- =============================================================================
-- 011 · Presença no evento
-- Cada participação de uma edição pode ser marcada como presente ou ausente (com quando e
-- quem marcou). Ausência NÃO remove ninguém: a pessoa continua inscrita e no histórico.
-- Quem estava numa equipe e não compareceu sai dela com o motivo "ausente" (saiu_em),
-- como em todas as outras saídas: nada é apagado.
-- =============================================================================

alter table public.participacoes
  add column presenca     text check (presenca is null or presenca in ('presente', 'ausente')),
  add column presenca_em  timestamptz,
  add column presenca_por text references public.pessoas (email) on update cascade;

comment on column public.participacoes.presenca is
  'Presença no evento: presente, ausente ou null (ainda não registrada).';

-- Novo motivo de saída de equipe: não compareceu ao evento.
alter table public.membros drop constraint membros_motivo_saida_check;
alter table public.membros add constraint membros_motivo_saida_check check (motivo_saida is null or motivo_saida in
  ('removido', 'recusou_convite', 'proposta_cancelada', 'equipe_recusada', 'substituicao', 'equipe_arquivada', 'ausente'));
