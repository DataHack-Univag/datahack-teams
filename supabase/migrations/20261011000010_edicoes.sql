-- =============================================================================
-- DataHack Univag — Migração 010: edições do evento
--
-- O sistema passa a guardar várias edições do evento. Tudo fica ligado a uma edição e
-- NADA é apagado: remover vira "arquivar" (removido_em / saiu_em), DELETE é barrado por
-- gatilho e toda alteração fica registrada em `historico` (antes e depois).
--
--   edicoes            nome, datas, local, formato, modo de formação das equipes, regras
--   pessoas            cadastro único por e-mail (antes "inscritos")
--   participacoes      papel de cada pessoa em cada edição (aluno, organizador, avaliador, mentor)
--   notas              nota média por edição (só a organização lê)
--   bancas             quem avalia o quê em cada edição
--   fases, rubricas, criterios, niveis, criterio_niveis, penalidades, regras_desempate
--                      o regulamento da avaliação, por edição (antes era um arquivo no código)
--   fichas, notas_criterio
--                      a ficha de cada avaliador, uma linha por critério (antes "avaliacoes")
--   equipes            + edição, origem (gerador, manual, proposta) e situação (aprovação)
--   membros            + edição, convite/confirmação e saída (quem esteve em qual equipe)
--
-- A edição de 2026 vira a Edição 1 e recebe todos os dados que já existem.
-- Tabelas antigas que mudaram de formato ficam guardadas como *_legado (só leitura).
-- =============================================================================

-- As políticas antigas dependem de colunas que mudam aqui; as novas são criadas na seção 11.
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 1. Edições
-- -----------------------------------------------------------------------------
create table public.edicoes (
  id                   uuid primary key default gen_random_uuid(),
  numero               int not null unique check (numero > 0),
  slug                 text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nome                 text not null check (char_length(btrim(nome)) between 3 and 120),
  descricao            text check (descricao is null or char_length(descricao) <= 4000),
  -- Como o evento funciona (cronograma, fases, regras), em texto livre.
  formato              text check (formato is null or char_length(formato) <= 8000),
  local                text check (local is null or char_length(local) <= 200),
  data_inicio          date,
  data_fim             date,
  situacao             text not null default 'planejada'
                       check (situacao in ('planejada', 'inscricoes', 'em_andamento', 'encerrada')),
  -- Só uma edição é a "atual" (a que alunos e bancas veem).
  atual                boolean not null default false,
  -- Como as equipes são formadas nesta edição:
  --   organizacao     a organização cria as equipes à mão
  --   gerador         a organização usa o gerador (sorteio equilibrado)
  --   alunos_propoem  os alunos propõem a equipe, os colegas confirmam e a organização aprova
  modo_formacao        text not null default 'gerador'
                       check (modo_formacao in ('organizacao', 'gerador', 'alunos_propoem')),
  permite_trocas       boolean not null default false,
  min_membros          int not null default 2 check (min_membros between 1 and 20),
  max_membros          int not null default 5 check (max_membros between 1 and 20),
  -- Trava das equipes (fim do prazo): alunos só visualizam.
  equipes_travadas     boolean not null default false,
  avaliacao_encerrada  boolean not null default false,
  formula              text,
  desclassificacao     text,
  metadados            jsonb not null default '{}'::jsonb check (jsonb_typeof(metadados) = 'object'),
  criado_por           text,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  check (data_fim is null or data_inicio is null or data_fim >= data_inicio),
  check (min_membros <= max_membros)
);
create unique index edicoes_uma_atual on public.edicoes (atual) where atual;

-- -----------------------------------------------------------------------------
-- 2. Pessoas e participações
-- -----------------------------------------------------------------------------
create table public.pessoas_legado as select * from public.inscritos;

alter table public.inscritos rename to pessoas;
alter table public.pessoas add column removido_em timestamptz;

create table public.participacoes (
  edicao_id    uuid not null references public.edicoes (id),
  email        text not null references public.pessoas (email) on update cascade,
  papel        text not null default 'aluno' check (papel in ('aluno', 'organizador', 'avaliador', 'mentor')),
  -- Banca da pessoa nesta edição (avaliadores; os organizadores ficam na banca da organização).
  banca_id     uuid,
  curso        text,
  semestre     int check (semestre is null or semestre between 1 and 12),
  criado_em    timestamptz not null default now(),
  removido_em  timestamptz,
  primary key (edicao_id, email)
);
create index participacoes_email_idx on public.participacoes (email);

-- -----------------------------------------------------------------------------
-- 3. Regulamento da avaliação (por edição)
-- -----------------------------------------------------------------------------
create table public.bancas (
  id              uuid primary key default gen_random_uuid(),
  edicao_id       uuid not null references public.edicoes (id),
  codigo          text not null check (codigo ~ '^[a-z0-9_]+$'),
  nome            text not null,
  descricao       text,
  -- A banca da própria organização (organizadores avaliam por ela).
  da_organizacao  boolean not null default false,
  ordem           int not null default 0,
  unique (edicao_id, codigo)
);
alter table public.participacoes add constraint participacoes_banca_fkey
  foreign key (banca_id) references public.bancas (id);

create table public.fases (
  id          uuid primary key default gen_random_uuid(),
  edicao_id   uuid not null references public.edicoes (id),
  codigo      text not null check (codigo ~ '^[A-Za-z0-9_]+$'),
  nome        text not null,
  -- Peso da fase na nota final (= soma dos pesos das rubricas dela).
  peso        numeric(6,2) not null check (peso >= 0),
  ordem       int not null default 0,
  descricao   text,
  unique (edicao_id, codigo)
);

create table public.rubricas (
  id          uuid primary key default gen_random_uuid(),
  edicao_id   uuid not null references public.edicoes (id),
  fase_id     uuid not null references public.fases (id),
  banca_id    uuid not null references public.bancas (id),
  codigo      text not null check (codigo ~ '^[A-Za-z0-9_]+$'),
  parte       text,
  nome        text not null,
  curto       text not null,
  -- Peso desta rubrica na nota final (0–100).
  peso_final  numeric(6,2) not null check (peso_final >= 0),
  momento     text,
  ordem       int not null default 0,
  unique (edicao_id, codigo)
);

create table public.criterios (
  id          uuid primary key default gen_random_uuid(),
  edicao_id   uuid not null references public.edicoes (id),
  rubrica_id  uuid not null references public.rubricas (id),
  codigo      text not null check (codigo ~ '^[A-Za-z0-9_]+$'),
  nome        text not null,
  -- Peso dentro da rubrica (os critérios de uma rubrica somam 100).
  peso        numeric(6,2) not null check (peso >= 0),
  descricao   text,
  ordem       int not null default 0,
  unique (rubrica_id, codigo)
);

create table public.niveis (
  id          uuid primary key default gen_random_uuid(),
  edicao_id   uuid not null references public.edicoes (id),
  nome        text not null,
  -- Fator aplicado ao peso do critério (0 a 1).
  fator       numeric(4,3) not null check (fator between 0 and 1),
  ordem       int not null default 0,
  unique (edicao_id, fator),
  unique (edicao_id, nome)
);

-- O que significa cada nível em cada critério (texto do botão na ficha).
create table public.criterio_niveis (
  criterio_id  uuid not null references public.criterios (id),
  nivel_id     uuid not null references public.niveis (id),
  descricao    text not null,
  primary key (criterio_id, nivel_id)
);

create table public.penalidades (
  id          uuid primary key default gen_random_uuid(),
  edicao_id   uuid not null references public.edicoes (id),
  codigo      text not null check (codigo ~ '^[a-z0-9_]+$'),
  texto       text not null,
  pontos      numeric(6,2) not null check (pontos <= 0),
  ordem       int not null default 0,
  unique (edicao_id, codigo)
);

-- Desempate, em ordem: maior nota numa rubrica, maior média num critério ou decisão das bancas.
create table public.regras_desempate (
  id           uuid primary key default gen_random_uuid(),
  edicao_id    uuid not null references public.edicoes (id),
  ordem        int not null,
  descricao    text not null,
  tipo         text not null check (tipo in ('rubrica', 'criterio', 'manual')),
  rubrica_id   uuid references public.rubricas (id),
  criterio_id  uuid references public.criterios (id),
  unique (edicao_id, ordem),
  check ((tipo = 'rubrica' and rubrica_id is not null)
      or (tipo = 'criterio' and criterio_id is not null)
      or tipo = 'manual')
);

-- Importa um regulamento no formato canônico (config/regulamento_2026.json, gerado por
-- scripts/regulamento_canonico.mjs). Serve para a Edição 1 e para edições novas.
create or replace function public.importar_regulamento(p_edicao uuid, p_json jsonb)
returns void language plpgsql set search_path = public
as $$
declare
  r       jsonb;
  c       jsonb;
  v_rub   uuid;
  v_crit  uuid;
begin
  if exists (select 1 from rubricas where edicao_id = p_edicao) then
    raise exception 'Esta edição já tem regulamento.';
  end if;

  insert into bancas (edicao_id, codigo, nome, da_organizacao, ordem)
  select p_edicao, x ->> 'codigo', x ->> 'nome', coalesce((x ->> 'da_organizacao')::boolean, false), o
    from jsonb_array_elements(p_json -> 'bancas') with ordinality as t(x, o);

  insert into niveis (edicao_id, nome, fator, ordem)
  select p_edicao, x ->> 'nome', (x ->> 'fator')::numeric, o
    from jsonb_array_elements(p_json -> 'niveis') with ordinality as t(x, o);

  insert into fases (edicao_id, codigo, nome, peso, ordem, descricao)
  select p_edicao, x ->> 'codigo', x ->> 'nome', (x ->> 'peso')::numeric, o, x ->> 'descricao'
    from jsonb_array_elements(p_json -> 'fases') with ordinality as t(x, o);

  for r in select x || jsonb_build_object('_ordem', o)
             from jsonb_array_elements(p_json -> 'rubricas') with ordinality as t(x, o) loop
    insert into rubricas (edicao_id, fase_id, banca_id, codigo, parte, nome, curto, peso_final, momento, ordem)
    values (p_edicao,
            (select id from fases where edicao_id = p_edicao and codigo = r ->> 'fase'),
            (select id from bancas where edicao_id = p_edicao and codigo = r ->> 'banca'),
            r ->> 'codigo', r ->> 'parte', r ->> 'nome', coalesce(r ->> 'curto', r ->> 'codigo'),
            (r ->> 'peso_final')::numeric, r ->> 'momento', (r ->> '_ordem')::int)
    returning id into v_rub;

    for c in select x || jsonb_build_object('_ordem', o)
               from jsonb_array_elements(r -> 'criterios') with ordinality as t(x, o) loop
      insert into criterios (edicao_id, rubrica_id, codigo, nome, peso, descricao, ordem)
      values (p_edicao, v_rub, c ->> 'codigo', c ->> 'nome', (c ->> 'peso')::numeric, c ->> 'descricao',
              (c ->> '_ordem')::int)
      returning id into v_crit;
      insert into criterio_niveis (criterio_id, nivel_id, descricao)
      select v_crit, nv.id, n ->> 'descricao'
        from jsonb_array_elements(c -> 'niveis') n
        join niveis nv on nv.edicao_id = p_edicao and nv.fator = (n ->> 'fator')::numeric;
    end loop;
  end loop;

  insert into penalidades (edicao_id, codigo, texto, pontos, ordem)
  select p_edicao, x ->> 'codigo', x ->> 'texto', (x ->> 'pontos')::numeric, o
    from jsonb_array_elements(p_json -> 'penalidades') with ordinality as t(x, o);

  insert into regras_desempate (edicao_id, ordem, descricao, tipo, rubrica_id, criterio_id)
  select p_edicao, o, x ->> 'descricao', x ->> 'tipo',
         (select id from rubricas where edicao_id = p_edicao and codigo = x ->> 'rubrica'),
         (select cr.id from criterios cr join rubricas rb on rb.id = cr.rubrica_id
           where x ->> 'tipo' = 'criterio' and rb.edicao_id = p_edicao
             and rb.codigo = x ->> 'rubrica' and cr.codigo = x ->> 'criterio')
    from jsonb_array_elements(p_json -> 'desempate') with ordinality as t(x, o);

  update edicoes set formula = p_json ->> 'formula', desclassificacao = p_json ->> 'desclassificacao'
   where id = p_edicao;
end $$;

-- Exporta o regulamento de uma edição no mesmo formato (para copiar para outra edição).
create or replace function public.exportar_regulamento(p_edicao uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'versao', 1,
    'bancas', (select coalesce(jsonb_agg(jsonb_build_object('codigo', codigo, 'nome', nome,
                 'da_organizacao', da_organizacao) order by ordem), '[]') from bancas where edicao_id = p_edicao),
    'niveis', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'fator', fator) order by ordem), '[]')
                 from niveis where edicao_id = p_edicao),
    'fases', (select coalesce(jsonb_agg(jsonb_build_object('codigo', codigo, 'nome', nome, 'peso', peso,
                'descricao', descricao) order by ordem), '[]') from fases where edicao_id = p_edicao),
    'rubricas', (select coalesce(jsonb_agg(jsonb_build_object(
                    'codigo', r.codigo, 'fase', f.codigo, 'banca', b.codigo, 'parte', r.parte, 'nome', r.nome,
                    'curto', r.curto, 'peso_final', r.peso_final, 'momento', r.momento,
                    'criterios', (select coalesce(jsonb_agg(jsonb_build_object(
                        'codigo', c.codigo, 'nome', c.nome, 'peso', c.peso, 'descricao', c.descricao,
                        'niveis', (select coalesce(jsonb_agg(jsonb_build_object('fator', n.fator,
                                     'descricao', cn.descricao) order by n.ordem), '[]')
                                     from criterio_niveis cn join niveis n on n.id = cn.nivel_id
                                    where cn.criterio_id = c.id)
                      ) order by c.ordem), '[]') from criterios c where c.rubrica_id = r.id)
                  ) order by r.ordem), '[]')
                   from rubricas r join fases f on f.id = r.fase_id join bancas b on b.id = r.banca_id
                  where r.edicao_id = p_edicao),
    'penalidades', (select coalesce(jsonb_agg(jsonb_build_object('codigo', codigo, 'texto', texto,
                      'pontos', pontos) order by ordem), '[]') from penalidades where edicao_id = p_edicao),
    'desempate', (select coalesce(jsonb_agg(jsonb_build_object('descricao', d.descricao, 'tipo', d.tipo,
                    'rubrica', r.codigo, 'criterio', c.codigo) order by d.ordem), '[]')
                    from regras_desempate d left join rubricas r on r.id = d.rubrica_id
                    left join criterios c on c.id = d.criterio_id where d.edicao_id = p_edicao),
    'formula', (select formula from edicoes where id = p_edicao),
    'desclassificacao', (select desclassificacao from edicoes where id = p_edicao)
  )
$$;

-- -----------------------------------------------------------------------------
-- 4. Edição 1 (2026) com os dados que já existem
-- -----------------------------------------------------------------------------
insert into public.edicoes (numero, slug, nome, descricao, formato, local, data_inicio, data_fim, situacao, atual,
                            modo_formacao, permite_trocas, min_membros, max_membros, equipes_travadas,
                            avaliacao_encerrada, metadados)
select 1, 'datahack-2026', 'DATAHack Univag 2026 · Rota do Diploma',
       'Primeira edição do DATAHack Univag: dados públicos do INEP e do IBGE sobre trajetória e evasão no ensino superior.',
       'Sexta-feira: formação das equipes e criação dos repositórios. Sábado: três fases técnicas com pitches curtos '
       || '(banca de professores e mesa da organização) e pitch final para os jurados de negócio.',
       'Univag · Várzea Grande – MT', date '2026-10-09', date '2026-10-10', 'em_andamento', true,
       'gerador', true, 2, c.max_membros, c.edicao_bloqueada, c.avaliacao_encerrada,
       jsonb_build_object(
         'formacao_equipes', 'Equipes montadas pela organização com o gerador (sorteio equilibrado por semestre e nota). '
                             || 'Depois de reclamações dos alunos, foi liberada a troca de equipe entre eles.',
         'origem', 'migração 010 (dados anteriores às edições)'
       )
  from public.configuracao c where c.id = 1;

select public.importar_regulamento((select id from public.edicoes where numero = 1),
  $regulamento${"versao":1,"bancas":[{"codigo":"professores","nome":"Banca de professores de tecnologia","da_organizacao":false},{"codigo":"organizacao","nome":"Organizadores (avaliação técnica)","da_organizacao":true},{"codigo":"negocio","nome":"Jurados de negócio (3)","da_organizacao":false}],"niveis":[{"nome":"Insuficiente","fator":0},{"nome":"Básico","fator":0.5},{"nome":"Proficiente","fator":0.8},{"nome":"Excelente","fator":1}],"fases":[{"codigo":"F1","nome":"Fase 1 · Exploração e estratégia","peso":15},{"codigo":"F2","nome":"Fase 2 · Ingestão e protótipo","peso":20},{"codigo":"F3","nome":"Fase 3 · Repositório final","peso":25},{"codigo":"NEG","nome":"Negócio · Pitch final","peso":40}],"rubricas":[{"codigo":"F1_PITCH","fase":"F1","banca":"professores","parte":"pitch","nome":"Fase 1 · Pitch · Exploração e estratégia","curto":"F1 · Pitch","peso_final":6,"momento":"10:45–11:45, pitch de 3 + 2 min","criterios":[{"codigo":"problema","nome":"Entendimento do desafio","peso":20,"descricao":"A equipe explica com as próprias palavras o que vai responder e por que isso importa.","niveis":[{"fator":0,"descricao":"Não sabe dizer o que vai responder."},{"fator":0.5,"descricao":"Repete o enunciado, sem mostrar entendimento."},{"fator":0.8,"descricao":"Explica o problema e quais perguntas vai atacar primeiro."},{"fator":1,"descricao":"Explica o problema, prioriza as perguntas e diz o que espera encontrar."}]},{"codigo":"escolhas","nome":"Justificativa das escolhas","peso":25,"descricao":"Consegue explicar, em linguagem clara, por que escolheu o banco, as ferramentas e a forma de organizar os dados.","niveis":[{"fator":0,"descricao":"Não justifica (“porque sim”, “porque a IA sugeriu”)."},{"fator":0.5,"descricao":"Justificativa genérica, sem ligação com os dados do desafio."},{"fator":0.8,"descricao":"Justifica cada escolha pelo volume, formato dos arquivos ou facilidade da equipe."},{"fator":1,"descricao":"Compara alternativas e explica o que perdeu e o que ganhou com cada escolha."}]},{"codigo":"raciocinio","nome":"Raciocínio sobre os dados","peso":25,"descricao":"O que a equipe descobriu olhando os arquivos e que riscos ou armadilhas já percebeu.","niveis":[{"fator":0,"descricao":"Ainda não olhou os dados."},{"fator":0.5,"descricao":"Descreve os arquivos, sem tirar conclusão."},{"fator":0.8,"descricao":"Aponta o que cada base tem, como elas se ligam e ao menos uma dificuldade."},{"fator":1,"descricao":"Antecipa armadilhas concretas e diz como vai lidar com cada uma."}]},{"codigo":"plano","nome":"Plano para as próximas fases","peso":15,"descricao":"O plano é realista para o tempo do evento e está dividido entre os integrantes.","niveis":[{"fator":0,"descricao":"Sem plano."},{"fator":0.5,"descricao":"Plano vago ou irreal para o tempo."},{"fator":0.8,"descricao":"Plano claro, com etapas e responsáveis."},{"fator":1,"descricao":"Plano claro, priorizado e com plano B se algo der errado."}]},{"codigo":"comunicacao","nome":"Comunicação e domínio da equipe","peso":15,"descricao":"Clareza, uso do tempo e segurança nas respostas; o domínio é da equipe, não de uma pessoa só.","niveis":[{"fator":0,"descricao":"Não se entende ou estoura o tempo."},{"fator":0.5,"descricao":"Compreensível, mas confuso ou dependente de uma pessoa."},{"fator":0.8,"descricao":"Claro, no tempo, responde bem às perguntas."},{"fator":1,"descricao":"Claro e seguro; qualquer integrante responde."}]}]},{"codigo":"F1_MESA","fase":"F1","banca":"organizacao","parte":"mesa","nome":"Fase 1 · Mesa · Ambiente, exploração e estratégia","curto":"F1 · Mesa","peso_final":9,"momento":"10:45–11:45, ~5 min na mesa + commit da Entrega 1","criterios":[{"codigo":"ambiente","nome":"Ambiente e repositório","peso":15,"descricao":"Montado no laboratório às 8h: repositório público com todos como colaboradores, estrutura inicial, banco escolhido instalado (local ou nuvem).","niveis":[{"fator":0,"descricao":"Sem repositório funcional ou equipe sem acesso."},{"fator":0.5,"descricao":"Repositório existe, mas sem estrutura ou faltando integrantes."},{"fator":0.8,"descricao":"Repositório organizado, todos com acesso, banco instalado e acessível."},{"fator":1,"descricao":"Além disso, .gitignore correto (dados fora do Git) e README inicial com o plano."}]},{"codigo":"fontes","nome":"Entendimento das fontes","peso":30,"descricao":"Identificou arquivos principais × cópias/apoio, formatos, dicionários, chaves e granularidade.","niveis":[{"fator":0,"descricao":"Não sabe o que há nos zips nem qual arquivo usar."},{"fator":0.5,"descricao":"Sabe quais arquivos usar, mas não percebeu formatos/granularidade."},{"fator":0.8,"descricao":"Formatos (CSV ; latin-1, xlsx com cabeçalho fora da 1ª linha), chave CO_CURSO e granularidade (coorte; EAD por polo) entendidos."},{"fator":1,"descricao":"Além disso, aponta armadilhas (EAD duplicada por polo, coortes com tempos diferentes, valores que saltam num ano) antes de ingerir."}]},{"codigo":"exploratoria","nome":"Análise exploratória","peso":25,"descricao":"Volumes, tipos, nulos, distribuições e anomalias iniciais, com evidência no repositório.","niveis":[{"fator":0,"descricao":"Não fez exploração."},{"fator":0.5,"descricao":"Contou linhas/colunas, sem olhar qualidade."},{"fator":0.8,"descricao":"Tipos, nulos, valores suprimidos (--, SC) e distribuições das variáveis-chave."},{"fator":1,"descricao":"Exploração orientada às perguntas, com hipóteses e anomalias registradas."}]},{"codigo":"estrategia","nome":"Estratégia de ingestão e transformação","peso":30,"descricao":"Banco/ferramenta, camadas, idempotência planejada, tipos e plano de junções, documentados (ex.: docs/estrategia.md).","niveis":[{"fator":0,"descricao":"Sem estratégia."},{"fator":0.5,"descricao":"Estratégia genérica (“vamos jogar no banco”)."},{"fator":0.8,"descricao":"Camadas (bruto → tratado → analítico), tipos (códigos como texto) e junções planejados."},{"fator":1,"descricao":"Além disso, idempotência explícita (como reexecutar sem duplicar), controle de carga e estimativa de volume."}]}]},{"codigo":"F2_PITCH","fase":"F2","banca":"professores","parte":"pitch","nome":"Fase 2 · Pitch · Ingestão, transformação e protótipo","curto":"F2 · Pitch","peso_final":8,"momento":"14:15–15:15, pitch de 3 + 2 min","criterios":[{"codigo":"evolucao","nome":"Evolução desde a Fase 1","peso":15,"descricao":"O que mudou no plano, o que deu errado e como a equipe resolveu.","niveis":[{"fator":0,"descricao":"Não sabe dizer o que fez desde a Fase 1."},{"fator":0.5,"descricao":"Lista o que fez, sem refletir."},{"fator":0.8,"descricao":"Mostra o avanço e explica os ajustes de rota."},{"fator":1,"descricao":"Mostra o avanço, explica os ajustes e o que aprendeu com eles."}]},{"codigo":"pipeline","nome":"Explicação do pipeline","peso":25,"descricao":"Explica, sem jargão desnecessário, o caminho do arquivo baixado até a tabela que responde às perguntas.","niveis":[{"fator":0,"descricao":"Não consegue explicar."},{"fator":0.5,"descricao":"Explica partes soltas, sem o caminho completo."},{"fator":0.8,"descricao":"Explica o caminho completo, em ordem, de forma compreensível."},{"fator":1,"descricao":"Explica o caminho completo e como garante que os números estão certos."}]},{"codigo":"respostas","nome":"Primeiras respostas","peso":25,"descricao":"Já existem números que respondem a alguma pergunta, com fonte e cuidado na interpretação.","niveis":[{"fator":0,"descricao":"Nenhum número."},{"fator":0.5,"descricao":"Números sem dizer de onde vêm ou o que significam."},{"fator":0.8,"descricao":"Números para pelo menos 2 perguntas, com fonte e interpretação correta."},{"fator":1,"descricao":"Números para a maioria das perguntas, com ressalvas (associação ≠ causa, anual × turma)."}]},{"codigo":"dashboard","nome":"Plano do dashboard","peso":20,"descricao":"O que o dashboard vai mostrar, para quem, e por que esses gráficos.","niveis":[{"fator":0,"descricao":"Sem plano."},{"fator":0.5,"descricao":"Plano genérico (“vamos fazer uns gráficos”)."},{"fator":0.8,"descricao":"Plano organizado pelas perguntas, com o público definido."},{"fator":1,"descricao":"Plano claro, com rascunho ou protótipo e escolhas de visualização justificadas."}]},{"codigo":"comunicacao","nome":"Comunicação e domínio da equipe","peso":15,"descricao":"Clareza, uso do tempo e segurança nas respostas; o domínio é da equipe, não de uma pessoa só.","niveis":[{"fator":0,"descricao":"Não se entende ou estoura o tempo."},{"fator":0.5,"descricao":"Compreensível, mas confuso ou dependente de uma pessoa."},{"fator":0.8,"descricao":"Claro, no tempo, responde bem às perguntas."},{"fator":1,"descricao":"Claro e seguro; qualquer integrante responde."}]}]},{"codigo":"F2_MESA","fase":"F2","banca":"organizacao","parte":"mesa","nome":"Fase 2 · Mesa · Ingestão, transformação e protótipo","curto":"F2 · Mesa","peso_final":12,"momento":"14:15–15:15, ~5 min na mesa + commit da Entrega 2","criterios":[{"codigo":"ingestao","nome":"Ingestão implementada","peso":25,"descricao":"Carga automatizada das bases necessárias no banco escolhido, vista funcionando na mesa.","niveis":[{"fator":0,"descricao":"Sem ingestão, ou feita à mão (copiar/colar, importação manual)."},{"fator":0.5,"descricao":"Parte das bases carregada, com passos manuais."},{"fator":0.8,"descricao":"Todas as bases necessárias carregadas por código, com encoding e cabeçalho corretos."},{"fator":1,"descricao":"Carga parametrizada, registro do que foi carregado (log/controle) e tratamento de erros."}]},{"codigo":"idempotencia","nome":"Idempotência","peso":20,"descricao":"Rodar a carga/transformação de novo não duplica nem altera o resultado.","niveis":[{"fator":0,"descricao":"Reexecutar duplica linhas ou quebra."},{"fator":0.5,"descricao":"Funciona só apagando tudo à mão antes."},{"fator":0.8,"descricao":"Reexecução segura (truncate-and-load, upsert ou controle de arquivos carregados)."},{"fator":1,"descricao":"Além disso, demonstrou na mesa: rodou duas vezes e conferiu contagens iguais."}]},{"codigo":"transformacao","nome":"Transformação e qualidade","peso":25,"descricao":"Limpeza, filtros, junções e checagens.","niveis":[{"fator":0,"descricao":"Erros que mudam o resultado (códigos como número, nulos como zero, EAD somada sem agregar)."},{"fator":0.5,"descricao":"Limpeza correta, mas sem checagens (taxa de junção, linhas antes/depois)."},{"fator":0.8,"descricao":"Filtro de graduação, agregação por curso, junções com taxa de match, células < 10 suprimidas."},{"fator":1,"descricao":"Além disso, trata anomalias e tem checagens automatizadas."}]},{"codigo":"modelagem","nome":"Modelagem e arquitetura","peso":15,"descricao":"Como os dados estão organizados para responder às perguntas.","niveis":[{"fator":0,"descricao":"Tudo numa tabela só, sem critério."},{"fator":0.5,"descricao":"Tabelas separadas, sem lógica clara."},{"fator":0.8,"descricao":"Camadas definidas e modelo analítico que atende às perguntas (ex.: fatos por curso/coorte)."},{"fator":1,"descricao":"Modelo justificado (granularidade, chaves), documentado em docs/arquitetura.md."}]},{"codigo":"prototipo","nome":"Protótipo ligado aos dados","peso":15,"descricao":"O protótipo mostrado no pitch lê de fato das tabelas transformadas.","niveis":[{"fator":0,"descricao":"Sem protótipo."},{"fator":0.5,"descricao":"Protótipo com números digitados ou de planilha à parte."},{"fator":0.8,"descricao":"Protótipo lê das tabelas do pipeline para pelo menos 2 perguntas."},{"fator":1,"descricao":"Protótipo ligado ao pipeline cobrindo a maioria das perguntas."}]}]},{"codigo":"F3_REPO","fase":"F3","banca":"organizacao","parte":"mesa","nome":"Fase 3 · Repositório final e uso de IA","curto":"F3 · Repositório","peso_final":25,"momento":"Em paralelo ao pitch final (17:15–19:15), no commit das 17:00","criterios":[{"codigo":"reprodutibilidade","nome":"Reprodutibilidade de ponta a ponta","peso":20,"descricao":"Seguindo o README, alguém de fora roda do zero e chega aos mesmos números.","niveis":[{"fator":0,"descricao":"Não roda."},{"fator":0.5,"descricao":"Roda com ajustes (caminhos absolutos, dependências faltando, ordem não documentada)."},{"fator":0.8,"descricao":"Roda do zero seguindo o README, e gera as extrações em outputs/ que alimentam o dashboard."},{"fator":1,"descricao":"Um comando (ou ordem numerada) roda tudo, do download ao dashboard; dependências fixadas; saídas determinísticas."}]},{"codigo":"codigo","nome":"Qualidade do código e da arquitetura","peso":20,"descricao":"Organização, legibilidade, separação de etapas, coerência com a estratégia.","niveis":[{"fator":0,"descricao":"Ilegível ou um notebook caótico."},{"fator":0.5,"descricao":"Organizado em partes, com muita repetição."},{"fator":0.8,"descricao":"Etapas separadas, nomes claros, comentários onde importa."},{"fator":1,"descricao":"Modular, limpo, coerente com a arquitetura documentada."}]},{"codigo":"corretude","nome":"Corretude das respostas","peso":20,"descricao":"Os números do dashboard conferem com o código e com o gabarito da organização.","niveis":[{"fator":0,"descricao":"Números errados ou não rastreáveis no código."},{"fator":0.5,"descricao":"Ordem de grandeza certa, erros de método."},{"fator":0.8,"descricao":"Números corretos para as perguntas obrigatórias."},{"fator":1,"descricao":"Corretos, incluindo bônus, com ressalvas metodológicas bem colocadas."}]},{"codigo":"ia","nome":"Uso de IA e domínio técnico","peso":25,"descricao":"Pasta prompts/ completa e o que as conversas mostram sobre o conhecimento do aluno.","niveis":[{"fator":0,"descricao":"Sem pasta prompts/, conversas omitidas, ou só pedidos de “faz pra mim”."},{"fator":0.5,"descricao":"Conversas presentes, mas o aluno só aceita respostas, sem demonstrar entendimento."},{"fator":0.8,"descricao":"Conversas mostram o aluno usando conceitos certos (ingestão, idempotência, chaves, camadas) e conferindo o que a IA gera."},{"fator":1,"descricao":"Aluno conduz a IA com domínio: compara abordagens, discute arquitetura, corrige erros da IA e registra as decisões."}]},{"codigo":"documentacao","nome":"Validação e documentação","peso":15,"descricao":"Checagens, dicionário das variáveis criadas e decisões registradas.","niveis":[{"fator":0,"descricao":"Sem documentação."},{"fator":0.5,"descricao":"README mínimo."},{"fator":0.8,"descricao":"README completo, variáveis derivadas explicadas, checagens registradas."},{"fator":1,"descricao":"Além disso, decisões e limitações documentadas e testes/asserts no código."}]}]},{"codigo":"NEG","fase":"NEG","banca":"negocio","parte":"negocio","nome":"Negócio · Pitch final","curto":"Negócio","peso_final":40,"momento":"Pitch final (17:15–19:15)","criterios":[{"codigo":"respondeu","nome":"Respondeu às perguntas","peso":30,"descricao":"As perguntas do desafio (P1–P5) foram respondidas de forma direta, com número e fonte?","niveis":[{"fator":0,"descricao":"Respondeu 0–1 pergunta, ou falou do tema sem responder."},{"fator":0.5,"descricao":"Respondeu 2–3 perguntas."},{"fator":0.8,"descricao":"Respondeu as 5 obrigatórias."},{"fator":1,"descricao":"Respondeu as 5 obrigatórias e ao menos 1 bônus (B1/B2)."}]},{"codigo":"solidez","nome":"Clareza e solidez das respostas","peso":20,"descricao":"As respostas são claras, convincentes e mostram de onde vem cada número?","niveis":[{"fator":0,"descricao":"Respostas vagas ou contraditórias."},{"fator":0.5,"descricao":"Respostas claras, mas sem mostrar de onde vêm."},{"fator":0.8,"descricao":"Claras e sustentadas por dados, com limitações citadas."},{"fator":1,"descricao":"Muito claras, sustentadas e com a dúvida certa levantada (o que os dados não dizem)."}]},{"codigo":"dashboard","nome":"Dashboard e visualização","peso":20,"descricao":"O dashboard é fácil de entender, ajuda a responder às perguntas e funciona na sala da banca?","niveis":[{"fator":0,"descricao":"Confuso, ou não abriu na sala da banca (só o plano B salvou parte)."},{"fator":0.5,"descricao":"Funciona, mas é difícil de ler."},{"fator":0.8,"descricao":"Claro, organizado pelas perguntas, gráficos adequados."},{"fator":1,"descricao":"Claro, bonito e útil; dá vontade de usar."}]},{"codigo":"valor","nome":"Valor e recomendações","peso":20,"descricao":"O que um gestor (IES, governo) faria com isso?","niveis":[{"fator":0,"descricao":"Sem recomendação."},{"fator":0.5,"descricao":"Recomendações genéricas."},{"fator":0.8,"descricao":"Pelo menos uma recomendação concreta, ligada aos achados."},{"fator":1,"descricao":"Recomendações priorizadas, viáveis e com público definido."}]},{"codigo":"comunicacao","nome":"Comunicação","peso":10,"descricao":"Narrativa no tempo e segurança nas respostas à banca.","niveis":[{"fator":0,"descricao":"Estoura o tempo ou não se entende."},{"fator":0.5,"descricao":"Compreensível, desorganizado."},{"fator":0.8,"descricao":"Clara, no tempo, responde bem."},{"fator":1,"descricao":"Envolvente; todo o time domina o trabalho."}]}]}],"penalidades":[{"codigo":"causalidade","texto":"Afirmar causalidade (“X causa evasão”) em vez de associação.","pontos":-5},{"codigo":"celulas","texto":"Expor células com menos de 10 alunos em tabela ou gráfico.","pontos":-3},{"codigo":"acesso","texto":"Repositório ou link do pitch sem acesso na hora da entrega (10 min de tolerância para corrigir).","pontos":-5},{"codigo":"planob","texto":"Entrega final sem plano B (PDF/vídeo do dashboard).","pontos":-3},{"codigo":"tempo","texto":"Estourar em mais de 1 min o tempo do pitch final.","pontos":-2}],"desempate":[{"descricao":"Maior nota na rubrica F3 · Repositório final.","tipo":"rubrica","rubrica":"F3_REPO"},{"descricao":"Maior nota em “Respondeu às perguntas” (Negócio).","tipo":"criterio","rubrica":"NEG","criterio":"respondeu"},{"descricao":"Maior nota em “Idempotência” (F2 · Mesa).","tipo":"criterio","rubrica":"F2_MESA","criterio":"idempotencia"},{"descricao":"Persistindo, decisão conjunta das bancas.","tipo":"manual"}],"formula":"Nota final = 6% × F1_PITCH + 9% × F1_MESA + 8% × F2_PITCH + 12% × F2_MESA + 25% × F3_REPO + 40% × NEG + penalidades","desclassificacao":"Sem entrega final até 17:00, plágio entre equipes ou dados que não sejam públicos."}$regulamento$::jsonb);

-- Papéis antigos → participação na Edição 1 (avaliadores e organizadores ganham a banca).
insert into public.participacoes (edicao_id, email, papel, banca_id, curso, semestre, criado_em)
select e.id, p.email,
       case when p.papel like 'avaliador_%' then 'avaliador' else p.papel end,
       (select b.id from public.bancas b where b.edicao_id = e.id
           and b.codigo = case p.papel when 'avaliador_tecnico' then 'professores'
                                       when 'avaliador_negocio' then 'negocio'
                                       when 'organizador' then 'organizacao' end),
       p.curso, p.semestre, p.criado_em
  from public.pessoas p cross join public.edicoes e
 where e.numero = 1;

-- O papel, o curso e o semestre agora são da participação (cópia em pessoas_legado).
alter table public.pessoas drop constraint if exists inscritos_papel_check;
alter table public.pessoas drop column papel, drop column curso, drop column semestre;

-- Nota média por edição.
alter table public.notas add column edicao_id uuid references public.edicoes (id);
update public.notas set edicao_id = (select id from public.edicoes where numero = 1);
alter table public.notas alter column edicao_id set not null;
alter table public.notas drop constraint notas_pkey;
alter table public.notas add primary key (edicao_id, email);

-- -----------------------------------------------------------------------------
-- 5. Equipes, integrantes, links, materiais e trocas por edição
-- -----------------------------------------------------------------------------
alter table public.equipes
  add column edicao_id      uuid references public.edicoes (id),
  -- De onde veio a equipe.
  add column origem         text not null default 'manual' check (origem in ('manual', 'gerador', 'proposta', 'migracao')),
  -- formando: aguardando os colegas confirmarem (proposta dos alunos)
  -- aguardando_aprovacao: todos confirmaram, falta a organização aprovar
  -- aprovada · recusada · cancelada (desistência de quem propôs)
  add column situacao       text not null default 'aprovada'
                            check (situacao in ('formando', 'aguardando_aprovacao', 'aprovada', 'recusada', 'cancelada')),
  add column proposta_por   text references public.pessoas (email) on update cascade,
  add column analisado_por  text references public.pessoas (email) on update cascade,
  add column analisado_em   timestamptz,
  add column motivo_analise text check (motivo_analise is null or char_length(motivo_analise) <= 500),
  add column removido_em    timestamptz,
  add column removido_por   text references public.pessoas (email) on update cascade;
-- Sem tocar em atualizado_em: a data da última alteração de cada equipe é preservada.
alter table public.equipes disable trigger equipes_atualizado_em;
update public.equipes set edicao_id = (select id from public.edicoes where numero = 1), origem = 'migracao';
alter table public.equipes enable trigger equipes_atualizado_em;
alter table public.equipes alter column edicao_id set not null;
create index equipes_edicao_idx on public.equipes (edicao_id);

-- Nome único por edição (entre as equipes ativas).
drop index if exists public.equipes_nome_unico;
create unique index equipes_nome_unico on public.equipes (edicao_id, lower(btrim(nome)))
  where removido_em is null and situacao not in ('recusada', 'cancelada');

-- Integrantes: uma linha por passagem da pessoa numa equipe (saiu_em fecha a passagem).
alter table public.membros
  add column id            uuid not null default gen_random_uuid(),
  add column edicao_id     uuid references public.edicoes (id),
  -- confirmado: está na equipe · convidado: chamado numa proposta, ainda não confirmou
  add column situacao      text not null default 'confirmado' check (situacao in ('confirmado', 'convidado')),
  add column convidado_por text references public.pessoas (email) on update cascade,
  add column saiu_em       timestamptz,
  add column motivo_saida  text check (motivo_saida is null or motivo_saida in
                             ('removido', 'recusou_convite', 'proposta_cancelada', 'equipe_recusada', 'substituicao', 'equipe_arquivada'));
update public.membros m set edicao_id = e.edicao_id from public.equipes e where e.id = m.equipe_id;
alter table public.membros alter column edicao_id set not null;
alter table public.membros drop constraint membros_pkey;
alter table public.membros add primary key (id);
-- Cada pessoa em no máximo uma equipe ativa por edição (contando convites).
create unique index membros_um_ativo on public.membros (edicao_id, email) where saiu_em is null;
alter table public.membros drop constraint if exists membros_email_fkey;
alter table public.membros add constraint membros_email_fkey
  foreign key (email) references public.pessoas (email) on update cascade;
alter table public.membros drop constraint if exists membros_equipe_id_fkey;
alter table public.membros add constraint membros_equipe_id_fkey
  foreign key (equipe_id) references public.equipes (id);

alter table public.links
  add column removido_em  timestamptz,
  add column removido_por text references public.pessoas (email) on update cascade;
alter table public.links drop constraint if exists links_equipe_id_fkey;
alter table public.links add constraint links_equipe_id_fkey foreign key (equipe_id) references public.equipes (id);

alter table public.materiais
  add column edicao_id    uuid references public.edicoes (id),
  add column removido_em  timestamptz;
update public.materiais set edicao_id = (select id from public.edicoes where numero = 1);
alter table public.materiais alter column edicao_id set not null;

alter table public.trocas add column edicao_id uuid references public.edicoes (id);
update public.trocas set edicao_id = (select id from public.edicoes where numero = 1);
alter table public.trocas alter column edicao_id set not null;
drop index if exists public.trocas_um_pendente;
create unique index trocas_um_pendente on public.trocas (edicao_id, solicitante) where status = 'pendente';

-- -----------------------------------------------------------------------------
-- 6. Fichas de avaliação (uma linha por critério) e penalidades aplicadas
-- -----------------------------------------------------------------------------
create table public.fichas (
  id             uuid primary key default gen_random_uuid(),
  edicao_id      uuid not null references public.edicoes (id),
  equipe_id      uuid not null references public.equipes (id),
  rubrica_id     uuid not null references public.rubricas (id),
  avaliador      text not null references public.pessoas (email) on update cascade,
  comentario     text check (comentario is null or char_length(comentario) <= 2000),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  removido_em    timestamptz,
  removido_por   text references public.pessoas (email) on update cascade
);
create unique index fichas_uma_ativa on public.fichas (equipe_id, rubrica_id, avaliador) where removido_em is null;
create index fichas_edicao_idx on public.fichas (edicao_id);

create table public.notas_criterio (
  ficha_id     uuid not null references public.fichas (id),
  criterio_id  uuid not null references public.criterios (id),
  -- null = critério ainda sem nível (a ficha pode ser salva pela metade)
  nivel_id     uuid references public.niveis (id),
  primary key (ficha_id, criterio_id)
);

insert into public.fichas (id, edicao_id, equipe_id, rubrica_id, avaliador, comentario, criado_em, atualizado_em)
select a.id, r.edicao_id, a.equipe_id, r.id, a.avaliador, a.comentario, a.criado_em, a.atualizado_em
  from public.avaliacoes a
  join public.rubricas r on r.codigo = a.rubrica and r.edicao_id = (select id from public.edicoes where numero = 1);

insert into public.notas_criterio (ficha_id, criterio_id, nivel_id)
select a.id, c.id, n.id
  from public.avaliacoes a
  join public.rubricas r on r.codigo = a.rubrica and r.edicao_id = (select id from public.edicoes where numero = 1)
  join public.criterios c on c.rubrica_id = r.id
  join lateral jsonb_each(a.notas) j(k, v) on j.k = c.codigo
  join public.niveis n on n.edicao_id = r.edicao_id and n.fator = (j.v::text)::numeric;

alter table public.avaliacoes rename to avaliacoes_legado;

create table public.penalidades_equipe (
  id             uuid primary key default gen_random_uuid(),
  edicao_id      uuid not null references public.edicoes (id),
  equipe_id      uuid not null references public.equipes (id),
  penalidade_id  uuid not null references public.penalidades (id),
  aplicado_por   text references public.pessoas (email) on update cascade,
  criado_em      timestamptz not null default now(),
  removido_em    timestamptz,
  removido_por   text references public.pessoas (email) on update cascade
);
create unique index penalidades_equipe_uma_ativa on public.penalidades_equipe (equipe_id, penalidade_id)
  where removido_em is null;

insert into public.penalidades_equipe (edicao_id, equipe_id, penalidade_id, aplicado_por, criado_em)
select p.edicao_id, pa.equipe_id, p.id, pa.aplicado_por, pa.criado_em
  from public.penalidades_aplicadas pa
  join public.penalidades p on p.codigo = pa.penalidade and p.edicao_id = (select id from public.edicoes where numero = 1);

alter table public.penalidades_aplicadas rename to penalidades_aplicadas_legado;
alter table public.configuracao rename to configuracao_legado;

-- -----------------------------------------------------------------------------
-- 7. Histórico (auditoria) e "nada é apagado"
-- -----------------------------------------------------------------------------
create table public.historico (
  id        bigint generated always as identity primary key,
  tabela    text not null,
  operacao  text not null,
  antes     jsonb,
  depois    jsonb,
  por       text,
  em        timestamptz not null default now()
);
create index historico_tabela_idx on public.historico (tabela, em desc);

-- -----------------------------------------------------------------------------
-- 8. Funções de acesso (security definer: evitam recursão de RLS)
-- -----------------------------------------------------------------------------
create or replace function public.email_atual()
returns text language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select email from pessoas
      where normalizar_email(email) = normalizar_email(auth.jwt() ->> 'email') limit 1),
    lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

create or replace function public.edicao_atual()
returns uuid language sql stable security definer set search_path = public
as $$ select id from edicoes where atual $$;

create or replace function public.eh_organizador_de(p_edicao uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from participacoes where edicao_id = p_edicao and email = email_atual()
                    and papel = 'organizador' and removido_em is null)
$$;

-- Organizador de alguma edição (pode criar e configurar edições).
create or replace function public.eh_organizador()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from participacoes where email = email_atual() and papel = 'organizador'
                    and removido_em is null)
$$;

create or replace function public.participa_de(p_edicao uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from participacoes where edicao_id = p_edicao and email = email_atual()
                    and removido_em is null)
$$;

-- Participa da edição atual (ou organiza alguma edição).
create or replace function public.eh_inscrito()
returns boolean language sql stable security definer set search_path = public
as $$ select participa_de(edicao_atual()) or eh_organizador() $$;

create or replace function public.papel_em(p_edicao uuid)
returns text language sql stable security definer set search_path = public
as $$
  select papel from participacoes where edicao_id = p_edicao and email = email_atual() and removido_em is null
$$;

create or replace function public.papel_atual()
returns text language sql stable security definer set search_path = public
as $$ select papel_em(edicao_atual()) $$;

create or replace function public.eh_avaliador()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(papel_atual() = 'avaliador', false) $$;

create or replace function public.equipe_ativa_de(p_email text, p_edicao uuid)
returns uuid language sql stable security definer set search_path = public
as $$
  select equipe_id from membros where email = p_email and edicao_id = p_edicao
     and saiu_em is null and situacao = 'confirmado'
$$;

create or replace function public.minha_equipe(p_edicao uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select equipe_ativa_de(email_atual(), p_edicao) $$;

create or replace function public.minha_equipe()
returns uuid language sql stable security definer set search_path = public
as $$ select minha_equipe(edicao_atual()) $$;

create or replace function public.edicao_da_equipe(p_equipe uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select edicao_id from equipes where id = p_equipe $$;

-- Alunos podem mexer nas equipes? (a organização da edição sempre pode)
create or replace function public.edicao_liberada(p_edicao uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select eh_organizador_de(p_edicao)
      or exists (select 1 from edicoes where id = p_edicao and not equipes_travadas and situacao <> 'encerrada')
$$;

create or replace function public.edicao_liberada()
returns boolean language sql stable security definer set search_path = public
as $$ select edicao_liberada(edicao_atual()) $$;

-- Pode lançar/editar a ficha desta rubrica agora?
create or replace function public.pode_avaliar(p_rubrica uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from rubricas r join edicoes e on e.id = r.edicao_id
     where r.id = p_rubrica
       and (eh_organizador_de(r.edicao_id)
            or (not e.avaliacao_encerrada and e.situacao <> 'encerrada'
                and exists (select 1 from participacoes p
                             where p.edicao_id = r.edicao_id and p.email = email_atual()
                               and p.removido_em is null and p.papel = 'avaliador' and p.banca_id = r.banca_id)))
  )
$$;

create or replace function public.quem_age(p_como text)
returns text language sql stable security definer set search_path = public
as $$
  select case when eh_organizador() and nullif(btrim(coalesce(p_como, '')), '') is not null
              then lower(btrim(p_como)) else email_atual() end
$$;

create or replace function public.nome_de(p_email text)
returns text language sql stable security definer set search_path = public
as $$ select nome from pessoas where email = p_email $$;

-- -----------------------------------------------------------------------------
-- 9. Gatilhos
-- -----------------------------------------------------------------------------

-- Cadastro só para quem está na lista de pessoas.
create or replace function public.bloquear_nao_inscritos()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.pessoas
                 where public.normalizar_email(email) = public.normalizar_email(new.email) and removido_em is null) then
    raise exception 'E-mail % não está na lista de inscritos do DataHack', new.email;
  end if;
  return new;
end $$;

-- Nada é apagado: remover é arquivar.
create or replace function public.impedir_apagar()
returns trigger language plpgsql
as $$
begin
  raise exception 'Os dados do DataHack não são apagados (%). Use o arquivamento.', tg_table_name;
end $$;

create or replace function public.registrar_historico()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into historico (tabela, operacao, antes, depois, por)
  values (tg_table_name, tg_op,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
          nullif(email_atual(), ''));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['edicoes', 'pessoas', 'participacoes', 'notas', 'bancas', 'fases', 'rubricas', 'criterios',
                           'niveis', 'criterio_niveis', 'penalidades', 'regras_desempate', 'equipes', 'membros',
                           'links', 'materiais', 'trocas', 'fichas', 'notas_criterio', 'penalidades_equipe'] loop
    execute format('drop trigger if exists %I_historico on public.%I', t, t);
    execute format('create trigger %I_historico after insert or update on public.%I
                    for each row execute function public.registrar_historico()', t, t);
    execute format('drop trigger if exists %I_nao_apagar on public.%I', t, t);
    execute format('create trigger %I_nao_apagar before delete on public.%I
                    for each row execute function public.impedir_apagar()', t, t);
  end loop;
  foreach t in array array['historico', 'pessoas_legado', 'avaliacoes_legado', 'penalidades_aplicadas_legado',
                           'configuracao_legado'] loop
    execute format('drop trigger if exists %I_nao_apagar on public.%I', t, t);
    execute format('create trigger %I_nao_apagar before delete on public.%I
                    for each row execute function public.impedir_apagar()', t, t);
  end loop;
end $$;

drop trigger if exists edicoes_atualizado_em on public.edicoes;
create trigger edicoes_atualizado_em before update on public.edicoes
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists fichas_atualizado_em on public.fichas;
create trigger fichas_atualizado_em before update on public.fichas
  for each row execute function public.tocar_atualizado_em();

-- Integrante: mesma edição da equipe, aluno da edição e limite de integrantes.
create or replace function public.checar_membro()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_limite int;
  v_atual  int;
begin
  select edicao_id into new.edicao_id from equipes where id = new.equipe_id;
  if new.saiu_em is not null then
    return new;
  end if;
  if not exists (select 1 from participacoes where edicao_id = new.edicao_id and email = new.email
                    and papel = 'aluno' and removido_em is null) then
    raise exception 'Só alunos desta edição podem fazer parte de uma equipe.';
  end if;
  if current_setting('dh.troca', true) = '1' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.equipe_id = old.equipe_id and old.saiu_em is null then
    return new;
  end if;
  select max_membros into v_limite from edicoes where id = new.edicao_id;
  select count(*) into v_atual from membros
   where equipe_id = new.equipe_id and saiu_em is null and id <> new.id;
  if v_atual >= v_limite then
    raise exception 'A equipe já atingiu o limite de % integrantes.', v_limite;
  end if;
  return new;
end $$;

drop trigger if exists limite_membros on public.membros;
drop function if exists public.checar_limite_membros();
drop trigger if exists checar_membro on public.membros;
create trigger checar_membro before insert or update of equipe_id, saiu_em on public.membros
  for each row execute function public.checar_membro();

-- Se o líder sai ou muda de equipe, a equipe fica sem líder.
create or replace function public.limpar_lider()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.saiu_em is null and (new.saiu_em is not null or new.equipe_id <> old.equipe_id) then
    update equipes set lider_email = null where id = old.equipe_id and lider_email = old.email;
  end if;
  return null;
end $$;

drop trigger if exists limpa_lider on public.membros;
create trigger limpa_lider after update of equipe_id, saiu_em on public.membros
  for each row execute function public.limpar_lider();

create or replace function public.checar_lider()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.lider_email is not null and not exists (
    select 1 from membros where email = new.lider_email and equipe_id = new.id
       and saiu_em is null and situacao = 'confirmado'
  ) then
    raise exception 'O líder precisa ser integrante da equipe.';
  end if;

  if tg_op = 'UPDATE'
     and new.lider_email is distinct from old.lider_email
     and old.lider_email is not null
     and exists (select 1 from membros where email = old.lider_email and equipe_id = old.id and saiu_em is null)
     and not eh_organizador_de(old.edicao_id)
     and old.lider_email <> email_atual() then
    raise exception 'Só o líder atual pode passar a liderança para outra pessoa.';
  end if;
  return new;
end $$;

create or replace function public.checar_dados_equipe()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (new.nome is distinct from old.nome or new.repo_github is distinct from old.repo_github)
     and not eh_organizador_de(old.edicao_id)
     and (old.lider_email is null or old.lider_email <> email_atual()) then
    raise exception 'Só o líder da equipe pode alterar o nome e o repositório.';
  end if;
  -- Situação, origem, edição e arquivamento só mudam pela organização ou pelas funções do fluxo.
  if (new.situacao is distinct from old.situacao or new.edicao_id is distinct from old.edicao_id
      or new.origem is distinct from old.origem or new.removido_em is distinct from old.removido_em)
     and not eh_organizador_de(old.edicao_id) and current_setting('dh.fluxo', true) is distinct from '1' then
    raise exception 'Só a organização altera a situação da equipe.';
  end if;
  return new;
end $$;

drop trigger if exists lider_edita_dados on public.equipes;
create trigger lider_edita_dados
  before update of nome, repo_github, situacao, edicao_id, origem, removido_em on public.equipes
  for each row execute function public.checar_dados_equipe();

-- Equipe arquivada ou recusada: pedidos de troca aguardando são cancelados.
create or replace function public.cancelar_trocas_da_equipe()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (new.removido_em is not null and old.removido_em is null)
     or (new.situacao in ('recusada', 'cancelada') and old.situacao not in ('recusada', 'cancelada')) then
    update trocas set status = 'cancelada', respondido_em = now(),
           respondido_nome = 'automático (equipe arquivada)'
     where status = 'pendente' and (equipe_origem = new.id or equipe_destino = new.id);
  end if;
  return null;
end $$;

drop trigger if exists trocas_da_equipe on public.equipes;
create trigger trocas_da_equipe after update of removido_em, situacao on public.equipes
  for each row execute function public.cancelar_trocas_da_equipe();

-- Regulamento: pesos e fatores não mudam depois que a edição tem fichas (mudaria notas já dadas).
create or replace function public.proteger_regulamento()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  -- Colunas que mudam o cálculo, por tabela.
  v_cols text[] := case tg_table_name
    when 'fases' then array['peso']
    when 'rubricas' then array['peso_final', 'fase_id', 'banca_id']
    when 'criterios' then array['peso', 'rubrica_id']
    when 'niveis' then array['fator']
    when 'penalidades' then array['pontos']
  end;
  v_c text;
begin
  if not exists (select 1 from fichas where edicao_id = new.edicao_id and removido_em is null) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Esta edição já tem fichas lançadas: não dá para incluir itens no regulamento.';
  end if;
  foreach v_c in array v_cols loop
    if to_jsonb(new) -> v_c is distinct from to_jsonb(old) -> v_c then
      raise exception 'Esta edição já tem fichas lançadas: pesos, fatores e estrutura do regulamento não podem mudar (os textos podem).';
    end if;
  end loop;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['fases', 'rubricas', 'criterios', 'niveis', 'penalidades'] loop
    execute format('drop trigger if exists %I_protegido on public.%I', t, t);
    execute format('create trigger %I_protegido before insert or update on public.%I
                    for each row execute function public.proteger_regulamento()', t, t);
  end loop;
end $$;

drop trigger if exists avaliacoes_validar on public.avaliacoes_legado;

-- -----------------------------------------------------------------------------
-- 10. Funções do fluxo (RPCs)
-- -----------------------------------------------------------------------------

-- Equipe criada pela organização.
drop function if exists public.criar_equipe(text, text);
create or replace function public.criar_equipe(p_nome text, p_repo text, p_edicao uuid default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_edicao uuid := coalesce(p_edicao, edicao_atual());
  v_id     uuid;
begin
  if not eh_organizador_de(v_edicao) then
    raise exception 'A formação das equipes é feita pela organização.';
  end if;
  insert into equipes (edicao_id, nome, repo_github, criado_por, origem, situacao)
  values (v_edicao, btrim(p_nome), nullif(btrim(coalesce(p_repo, '')), ''), email_atual(), 'manual', 'aprovada')
  returning id into v_id;
  return v_id;
end $$;

-- Arquiva (não apaga) uma equipe: os integrantes saem e os pedidos de troca são cancelados.
create or replace function public.arquivar_equipe(p_equipe uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_edicao uuid := edicao_da_equipe(p_equipe);
begin
  if not eh_organizador_de(v_edicao) then
    raise exception 'Só a organização arquiva equipes.';
  end if;
  update membros set saiu_em = now(), motivo_saida = 'equipe_arquivada'
   where equipe_id = p_equipe and saiu_em is null;
  update equipes set removido_em = now(), removido_por = email_atual(), lider_email = null
   where id = p_equipe and removido_em is null;
end $$;

-- Grava as equipes montadas pelo gerador. p_substituir arquiva as equipes atuais da edição.
drop function if exists public.aplicar_equipes(jsonb, boolean);
create or replace function public.aplicar_equipes(p_equipes jsonb, p_substituir boolean default false, p_edicao uuid default null)
returns int language plpgsql security definer set search_path = public
as $$
declare
  v_edicao uuid := coalesce(p_edicao, edicao_atual());
  v_eq     jsonb;
  v_nome   text;
  v_base   text;
  v_n      int;
  v_id     uuid;
  v_maior  int;
  v_total  int := 0;
  v_email  text;
begin
  if not eh_organizador_de(v_edicao) then
    raise exception 'Apenas organizadores podem aplicar equipes.';
  end if;
  if jsonb_typeof(p_equipes) <> 'array' or jsonb_array_length(p_equipes) = 0 then
    raise exception 'Nenhuma equipe para aplicar.';
  end if;

  if p_substituir then
    perform arquivar_equipe(id) from equipes where edicao_id = v_edicao and removido_em is null;
  end if;

  select max(jsonb_array_length(e -> 'emails')) into v_maior from jsonb_array_elements(p_equipes) e;
  update edicoes set max_membros = greatest(max_membros, v_maior) where id = v_edicao;

  for v_eq in select * from jsonb_array_elements(p_equipes) loop
    v_base := btrim(coalesce(v_eq ->> 'nome', 'Equipe'));
    v_nome := v_base;
    v_n := 1;
    while exists (select 1 from equipes where edicao_id = v_edicao and removido_em is null
                     and situacao not in ('recusada', 'cancelada') and lower(btrim(nome)) = lower(v_nome)) loop
      v_n := v_n + 1;
      v_nome := v_base || ' (' || v_n || ')';
    end loop;

    insert into equipes (edicao_id, nome, repo_github, criado_por, origem, situacao)
    values (v_edicao, v_nome, null, email_atual(), 'gerador', 'aprovada')
    returning id into v_id;

    for v_email in select lower(x) from jsonb_array_elements_text(v_eq -> 'emails') x loop
      update membros set saiu_em = now(), motivo_saida = 'substituicao'
       where edicao_id = v_edicao and email = v_email and saiu_em is null;
      insert into membros (edicao_id, email, equipe_id) values (v_edicao, v_email, v_id);
    end loop;
    v_total := v_total + 1;
  end loop;

  -- Equipes que ficaram vazias, sem repositório e sem links, são arquivadas.
  perform arquivar_equipe(e.id) from equipes e
   where e.edicao_id = v_edicao and e.removido_em is null and e.repo_github is null
     and not exists (select 1 from membros m where m.equipe_id = e.id and m.saiu_em is null)
     and not exists (select 1 from links l where l.equipe_id = e.id and l.removido_em is null);

  return v_total;
end $$;

-- Organização tira alguém da equipe (a passagem fica no histórico).
create or replace function public.remover_integrante(p_equipe uuid, p_email text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not eh_organizador_de(edicao_da_equipe(p_equipe)) then
    raise exception 'Só a organização altera os integrantes.';
  end if;
  update membros set saiu_em = now(), motivo_saida = 'removido'
   where equipe_id = p_equipe and email = lower(p_email) and saiu_em is null;
  if not found then
    raise exception 'Essa pessoa não está na equipe.';
  end if;
end $$;

-- ---------- proposta de equipe pelos alunos (modo alunos_propoem) ----------

create or replace function public.propor_equipe(p_nome text, p_emails text[], p_repo text default null, p_como text default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_email  text := quem_age(p_como);
  v_edicao uuid := edicao_atual();
  e        edicoes%rowtype;
  v_id     uuid;
  v_outro  text;
  v_total  int;
begin
  select * into e from edicoes where id = v_edicao;
  if e.modo_formacao <> 'alunos_propoem' then
    raise exception 'Nesta edição as equipes são formadas pela organização.';
  end if;
  if not edicao_liberada(v_edicao) then
    raise exception 'A formação das equipes está encerrada.';
  end if;
  if not exists (select 1 from participacoes where edicao_id = v_edicao and email = v_email
                    and papel = 'aluno' and removido_em is null) then
    raise exception 'Só alunos desta edição propõem equipes.';
  end if;
  if exists (select 1 from membros where edicao_id = v_edicao and email = v_email and saiu_em is null) then
    raise exception 'Você já está numa equipe (ou tem um convite aguardando resposta).';
  end if;
  select count(distinct x) + 1 into v_total from unnest(p_emails) x where lower(btrim(x)) <> v_email;
  if v_total > e.max_membros then
    raise exception 'A equipe pode ter no máximo % integrantes.', e.max_membros;
  end if;

  perform set_config('dh.fluxo', '1', true);
  insert into equipes (edicao_id, nome, repo_github, criado_por, origem, situacao, proposta_por, lider_email)
  values (v_edicao, btrim(p_nome), nullif(btrim(coalesce(p_repo, '')), ''), v_email, 'proposta', 'formando', v_email, null)
  returning id into v_id;

  insert into membros (edicao_id, email, equipe_id, situacao) values (v_edicao, v_email, v_id, 'confirmado');
  update equipes set lider_email = v_email where id = v_id;

  foreach v_outro in array p_emails loop
    v_outro := lower(btrim(v_outro));
    continue when v_outro = '' or v_outro = v_email;
    if exists (select 1 from membros where edicao_id = v_edicao and email = v_outro and saiu_em is null) then
      raise exception '% já está numa equipe ou tem um convite aguardando.', coalesce(nome_de(v_outro), v_outro);
    end if;
    insert into membros (edicao_id, email, equipe_id, situacao, convidado_por)
    values (v_edicao, v_outro, v_id, 'convidado', v_email);
  end loop;

  perform atualizar_situacao_proposta(v_id);
  perform set_config('dh.fluxo', '0', true);
  return v_id;
end $$;

-- Com todos confirmados (e o mínimo de integrantes), a proposta vai para a organização.
create or replace function public.atualizar_situacao_proposta(p_equipe uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  q          equipes%rowtype;
  v_min      int;
  v_ativos   int;
  v_convites int;
begin
  select * into q from equipes where id = p_equipe;
  if q.situacao not in ('formando', 'aguardando_aprovacao') then
    return;
  end if;
  select min_membros into v_min from edicoes where id = q.edicao_id;
  select count(*) filter (where situacao = 'confirmado'), count(*) filter (where situacao = 'convidado')
    into v_ativos, v_convites from membros where equipe_id = p_equipe and saiu_em is null;
  perform set_config('dh.fluxo', '1', true);
  update equipes set situacao = case when v_convites = 0 and v_ativos >= v_min then 'aguardando_aprovacao' else 'formando' end
   where id = p_equipe;
end $$;

create or replace function public.convidar_integrante(p_equipe uuid, p_email text, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_email  text := quem_age(p_como);
  q        equipes%rowtype;
  v_outro  text := lower(btrim(p_email));
begin
  select * into q from equipes where id = p_equipe;
  if q.proposta_por is distinct from v_email and not eh_organizador_de(q.edicao_id) then
    raise exception 'Só quem propôs a equipe convida integrantes.';
  end if;
  if q.situacao not in ('formando', 'aguardando_aprovacao') then
    raise exception 'Esta equipe não está mais em formação.';
  end if;
  if exists (select 1 from membros where edicao_id = q.edicao_id and email = v_outro and saiu_em is null) then
    raise exception '% já está numa equipe ou tem um convite aguardando.', coalesce(nome_de(v_outro), v_outro);
  end if;
  insert into membros (edicao_id, email, equipe_id, situacao, convidado_por)
  values (q.edicao_id, v_outro, p_equipe, 'convidado', v_email);
  perform atualizar_situacao_proposta(p_equipe);
end $$;

create or replace function public.responder_convite(p_equipe uuid, p_aceitar boolean, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_email text := quem_age(p_como);
begin
  if p_aceitar then
    update membros set situacao = 'confirmado'
     where equipe_id = p_equipe and email = v_email and situacao = 'convidado' and saiu_em is null;
  else
    update membros set saiu_em = now(), motivo_saida = 'recusou_convite'
     where equipe_id = p_equipe and email = v_email and situacao = 'convidado' and saiu_em is null;
  end if;
  if not found then
    raise exception 'Esse convite não está mais aguardando.';
  end if;
  perform atualizar_situacao_proposta(p_equipe);
end $$;

create or replace function public.cancelar_proposta(p_equipe uuid, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_email text := quem_age(p_como);
  q       equipes%rowtype;
begin
  select * into q from equipes where id = p_equipe;
  if q.proposta_por is distinct from v_email and not eh_organizador_de(q.edicao_id) then
    raise exception 'Só quem propôs pode desistir da proposta.';
  end if;
  if q.situacao not in ('formando', 'aguardando_aprovacao') then
    raise exception 'Esta proposta já foi analisada.';
  end if;
  update membros set saiu_em = now(), motivo_saida = 'proposta_cancelada'
   where equipe_id = p_equipe and saiu_em is null;
  perform set_config('dh.fluxo', '1', true);
  update equipes set situacao = 'cancelada', lider_email = null where id = p_equipe;
end $$;

-- Organização aprova ou recusa (com motivo) uma equipe proposta.
create or replace function public.analisar_equipe(p_equipe uuid, p_aprovar boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  q equipes%rowtype;
begin
  select * into q from equipes where id = p_equipe;
  if not eh_organizador_de(q.edicao_id) then
    raise exception 'Só a organização aprova equipes.';
  end if;
  if q.situacao not in ('formando', 'aguardando_aprovacao') then
    raise exception 'Esta equipe já foi analisada.';
  end if;
  if p_aprovar and exists (select 1 from membros where equipe_id = p_equipe and saiu_em is null and situacao = 'convidado') then
    raise exception 'Ainda há convites aguardando resposta.';
  end if;
  if not p_aprovar then
    update membros set saiu_em = now(), motivo_saida = 'equipe_recusada' where equipe_id = p_equipe and saiu_em is null;
  end if;
  update equipes set situacao = case when p_aprovar then 'aprovada' else 'recusada' end,
         analisado_por = email_atual(), analisado_em = now(),
         motivo_analise = nullif(btrim(coalesce(p_motivo, '')), ''),
         lider_email = case when p_aprovar then lider_email end
   where id = p_equipe;
end $$;

-- ---------- trocas (só quando a edição permite) ----------

create or replace function public.pedir_troca(p_destino uuid, p_mensagem text default null, p_como text default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_email  text := quem_age(p_como);
  v_edicao uuid := edicao_da_equipe(p_destino);
  v_origem uuid;
  v_id     uuid;
begin
  if v_edicao is null or not participa_de(v_edicao) and not eh_organizador_de(v_edicao) then
    raise exception 'Equipe não encontrada.';
  end if;
  if not (select permite_trocas from edicoes where id = v_edicao) then
    raise exception 'Nesta edição não há troca de equipe.';
  end if;
  if not edicao_liberada(v_edicao) then
    raise exception 'A edição das equipes está bloqueada pela organização.';
  end if;
  v_origem := equipe_ativa_de(v_email, v_edicao);
  if v_origem is null then
    raise exception 'Você não está em nenhuma equipe.';
  end if;
  if v_origem = p_destino then
    raise exception 'Você já está nessa equipe.';
  end if;
  if not exists (select 1 from equipes where id = p_destino and removido_em is null and situacao = 'aprovada') then
    raise exception 'Equipe não encontrada.';
  end if;
  if exists (select 1 from trocas where edicao_id = v_edicao and solicitante = v_email and status = 'pendente') then
    raise exception 'Você já tem um pedido de troca aguardando. Cancele-o antes de pedir outro.';
  end if;

  insert into trocas (edicao_id, solicitante, solicitante_nome, equipe_origem, origem_nome, equipe_destino, destino_nome, mensagem)
  values (v_edicao, v_email, nome_de(v_email),
          v_origem, (select nome from equipes where id = v_origem),
          p_destino, (select nome from equipes where id = p_destino),
          nullif(btrim(coalesce(p_mensagem, '')), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.cancelar_troca(p_pedido uuid, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_email text := case when eh_organizador() and nullif(btrim(coalesce(p_como, '')), '') is null
                       then email_atual() else quem_age(p_como) end;
begin
  update trocas set status = 'cancelada', respondido_em = now(), respondido_por = v_email,
         respondido_nome = coalesce(nome_de(v_email), v_email) || case when eh_organizador() then ' (organização)' else '' end
   where id = p_pedido and status = 'pendente'
     and (solicitante = quem_age(p_como) or eh_organizador_de(edicao_id));
  if not found then
    raise exception 'Esse pedido não está mais aguardando.';
  end if;
end $$;

create or replace function public.recusar_troca(p_pedido uuid, p_como text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_email text := quem_age(p_como);
begin
  update trocas t set status = 'recusada', respondido_por = v_email, respondido_nome = nome_de(v_email),
         respondido_em = now()
   where t.id = p_pedido and t.status = 'pendente'
     and (eh_organizador_de(t.edicao_id) or equipe_ativa_de(v_email, t.edicao_id) = t.equipe_destino);
  if not found then
    raise exception 'Esse pedido não está mais aguardando (ou não é para a sua equipe).';
  end if;
end $$;

create or replace function public.aceitar_troca(p_pedido uuid, p_como text default null)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_email text := quem_age(p_como);
  t       trocas%rowtype;
begin
  select * into t from trocas where id = p_pedido for update;
  if not found or t.status <> 'pendente' then
    return 'Esse pedido não está mais aguardando.';
  end if;
  if not edicao_liberada(t.edicao_id) then
    return 'A edição das equipes está bloqueada pela organização.';
  end if;
  if equipe_ativa_de(v_email, t.edicao_id) is distinct from t.equipe_destino then
    return 'Só um integrante da equipe pedida pode aceitar a troca.';
  end if;
  if equipe_ativa_de(t.solicitante, t.edicao_id) is distinct from t.equipe_origem then
    update trocas set status = 'cancelada', respondido_em = now(),
           respondido_nome = 'automático (quem pediu já mudou de equipe)'
     where id = t.id;
    return 'Quem pediu já mudou de equipe; o pedido foi cancelado.';
  end if;

  perform set_config('dh.troca', '1', true);
  update membros set equipe_id = t.equipe_destino, entrou_em = now()
   where email = t.solicitante and edicao_id = t.edicao_id and saiu_em is null;
  update membros set equipe_id = t.equipe_origem, entrou_em = now()
   where email = v_email and edicao_id = t.edicao_id and saiu_em is null;
  perform set_config('dh.troca', '0', true);

  update trocas set status = 'aceita', respondido_por = v_email, respondido_nome = nome_de(v_email), respondido_em = now()
   where id = t.id;
  update trocas set status = 'cancelada', respondido_em = now(), respondido_nome = 'automático (houve outra troca)'
   where edicao_id = t.edicao_id and status = 'pendente' and solicitante in (t.solicitante, v_email);
  return 'ok';
end $$;

-- ---------- avaliação ----------

-- Salva a ficha do avaliador logado. p_notas = {"codigo_do_criterio": fator, ...}.
create or replace function public.salvar_ficha(p_equipe uuid, p_rubrica uuid, p_notas jsonb, p_comentario text default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_email  text := email_atual();
  r        rubricas%rowtype;
  v_ficha  uuid;
  v_k      text;
  v_v      jsonb;
  v_crit   uuid;
  v_nivel  uuid;
begin
  select * into r from rubricas where id = p_rubrica;
  if not found or r.edicao_id is distinct from edicao_da_equipe(p_equipe) then
    raise exception 'Rubrica inválida para esta equipe.';
  end if;
  if not pode_avaliar(p_rubrica) then
    raise exception 'Essa ficha não é da sua banca ou a avaliação já foi encerrada.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_notas) <> 'object' then
    raise exception 'Notas inválidas.';
  end if;

  select id into v_ficha from fichas
   where equipe_id = p_equipe and rubrica_id = p_rubrica and avaliador = v_email and removido_em is null;
  if v_ficha is null then
    insert into fichas (edicao_id, equipe_id, rubrica_id, avaliador, comentario)
    values (r.edicao_id, p_equipe, p_rubrica, v_email, nullif(btrim(coalesce(p_comentario, '')), ''))
    returning id into v_ficha;
  else
    update fichas set comentario = nullif(btrim(coalesce(p_comentario, '')), '') where id = v_ficha;
  end if;

  for v_k, v_v in select * from jsonb_each(p_notas) loop
    select id into v_crit from criterios where rubrica_id = p_rubrica and codigo = v_k;
    if v_crit is null then
      raise exception 'Critério % não existe nesta rubrica.', v_k;
    end if;
    v_nivel := null;
    if jsonb_typeof(v_v) <> 'null' then
      select id into v_nivel from niveis where edicao_id = r.edicao_id and fator = (v_v::text)::numeric;
      if v_nivel is null then
        raise exception 'Nível inválido na ficha de avaliação.';
      end if;
    end if;
    insert into notas_criterio (ficha_id, criterio_id, nivel_id) values (v_ficha, v_crit, v_nivel)
    on conflict (ficha_id, criterio_id) do update set nivel_id = excluded.nivel_id;
  end loop;
  return v_ficha;
end $$;

create or replace function public.arquivar_ficha(p_ficha uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update fichas set removido_em = now(), removido_por = email_atual()
   where id = p_ficha and removido_em is null and eh_organizador_de(edicao_id);
  if not found then
    raise exception 'Ficha não encontrada (ou sem permissão).';
  end if;
end $$;

-- ---------- edições ----------

-- Cria uma edição. p_copiar_de: copia o regulamento e os organizadores de outra edição.
create or replace function public.criar_edicao(p_dados jsonb, p_copiar_de uuid default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not eh_organizador() then
    raise exception 'Só a organização cria edições.';
  end if;
  insert into edicoes (numero, slug, nome, descricao, formato, local, data_inicio, data_fim, modo_formacao,
                       permite_trocas, min_membros, max_membros, metadados, criado_por)
  values ((select coalesce(max(numero), 0) + 1 from edicoes),
          p_dados ->> 'slug', p_dados ->> 'nome', p_dados ->> 'descricao', p_dados ->> 'formato', p_dados ->> 'local',
          nullif(p_dados ->> 'data_inicio', '')::date, nullif(p_dados ->> 'data_fim', '')::date,
          coalesce(p_dados ->> 'modo_formacao', 'gerador'), coalesce((p_dados ->> 'permite_trocas')::boolean, false),
          coalesce((p_dados ->> 'min_membros')::int, 2), coalesce((p_dados ->> 'max_membros')::int, 5),
          coalesce(p_dados -> 'metadados', '{}'::jsonb), email_atual())
  returning id into v_id;

  if p_copiar_de is not null then
    perform importar_regulamento(v_id, exportar_regulamento(p_copiar_de));
  end if;

  -- Copiando de outra edição, os organizadores dela continuam organizando; quem cria sempre organiza.
  if p_copiar_de is not null then
    insert into participacoes (edicao_id, email, papel, banca_id)
    select v_id, p.email, 'organizador', (select id from bancas where edicao_id = v_id and da_organizacao limit 1)
      from participacoes p
     where p.edicao_id = p_copiar_de and p.papel = 'organizador' and p.removido_em is null
    on conflict do nothing;
  end if;
  insert into participacoes (edicao_id, email, papel, banca_id)
  values (v_id, email_atual(), 'organizador', (select id from bancas where edicao_id = v_id and da_organizacao limit 1))
  on conflict do nothing;
  return v_id;
end $$;

-- Troca o regulamento de uma edição que ainda não tem fichas (formato canônico).
create or replace function public.definir_regulamento(p_edicao uuid, p_json jsonb)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição define o regulamento.';
  end if;
  perform importar_regulamento(p_edicao, p_json);
  update participacoes set banca_id = (select id from bancas where edicao_id = p_edicao and da_organizacao limit 1)
   where edicao_id = p_edicao and papel = 'organizador' and banca_id is null;
end $$;

-- Define qual edição é a atual (a que alunos e bancas veem).
create or replace function public.definir_edicao_atual(p_edicao uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not eh_organizador_de(p_edicao) then
    raise exception 'Só a organização da edição faz dela a atual.';
  end if;
  update edicoes set atual = false where atual and id <> p_edicao;
  update edicoes set atual = true where id = p_edicao;
end $$;

-- -----------------------------------------------------------------------------
-- 11. Row Level Security
-- -----------------------------------------------------------------------------
-- (as políticas antigas foram removidas no início da migração)

do $$
declare t text;
begin
  foreach t in array array['edicoes', 'pessoas', 'participacoes', 'notas', 'bancas', 'fases', 'rubricas', 'criterios',
                           'niveis', 'criterio_niveis', 'penalidades', 'regras_desempate', 'equipes', 'membros',
                           'links', 'materiais', 'trocas', 'fichas', 'notas_criterio', 'penalidades_equipe', 'historico',
                           'pessoas_legado', 'avaliacoes_legado', 'penalidades_aplicadas_legado', 'configuracao_legado'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke delete, truncate on public.%I from authenticated', t);
  end loop;
end $$;

-- Edições: quem participa vê; a organização da edição altera (criar é pela função).
create policy edicoes_select on public.edicoes for select to authenticated using (eh_organizador() or participa_de(id));
create policy edicoes_update on public.edicoes for update to authenticated
  using (eh_organizador_de(id)) with check (eh_organizador_de(id));

-- Pessoas: inscritos veem a lista; a organização cadastra e arquiva.
create policy pessoas_select on public.pessoas for select to authenticated using (eh_inscrito());
create policy pessoas_insert on public.pessoas for insert to authenticated with check (eh_organizador());
create policy pessoas_update on public.pessoas for update to authenticated using (eh_organizador()) with check (eh_organizador());

create policy participacoes_select on public.participacoes for select to authenticated
  using (eh_organizador_de(edicao_id) or participa_de(edicao_id));
create policy participacoes_insert on public.participacoes for insert to authenticated with check (eh_organizador_de(edicao_id));
create policy participacoes_update on public.participacoes for update to authenticated
  using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id));

create policy notas_org on public.notas for select to authenticated using (eh_organizador_de(edicao_id));
create policy notas_insert on public.notas for insert to authenticated with check (eh_organizador_de(edicao_id));
create policy notas_update on public.notas for update to authenticated
  using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id));

-- Regulamento: quem participa da edição lê; a organização da edição altera.
do $$
declare t text;
begin
  foreach t in array array['bancas', 'fases', 'rubricas', 'criterios', 'niveis', 'penalidades', 'regras_desempate'] loop
    execute format('create policy %I_select on public.%I for select to authenticated
                    using (eh_organizador_de(edicao_id) or participa_de(edicao_id))', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated
                    with check (eh_organizador_de(edicao_id))', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated
                    using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id))', t, t);
  end loop;
end $$;
create policy criterio_niveis_select on public.criterio_niveis for select to authenticated
  using (exists (select 1 from criterios c where c.id = criterio_id and (eh_organizador_de(c.edicao_id) or participa_de(c.edicao_id))));
create policy criterio_niveis_write on public.criterio_niveis for insert to authenticated
  with check (exists (select 1 from criterios c where c.id = criterio_id and eh_organizador_de(c.edicao_id)));
create policy criterio_niveis_update on public.criterio_niveis for update to authenticated
  using (exists (select 1 from criterios c where c.id = criterio_id and eh_organizador_de(c.edicao_id)));

-- Equipes: quem participa vê as ativas; integrantes (dados) e organização editam.
create policy equipes_select on public.equipes for select to authenticated
  using (eh_organizador_de(edicao_id) or (participa_de(edicao_id) and removido_em is null));
create policy equipes_update on public.equipes for update to authenticated
  using ((id = minha_equipe(edicao_id) or eh_organizador_de(edicao_id)) and edicao_liberada(edicao_id))
  with check ((id = minha_equipe(edicao_id) or eh_organizador_de(edicao_id)) and edicao_liberada(edicao_id));

create policy membros_select on public.membros for select to authenticated
  using (eh_organizador_de(edicao_id) or participa_de(edicao_id));
create policy membros_insert on public.membros for insert to authenticated with check (eh_organizador_de(edicao_id));
create policy membros_update on public.membros for update to authenticated
  using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id));

create policy links_select on public.links for select to authenticated
  using (eh_organizador_de(edicao_da_equipe(equipe_id)) or (participa_de(edicao_da_equipe(equipe_id)) and removido_em is null));
create policy links_insert on public.links for insert to authenticated
  with check ((equipe_id = minha_equipe(edicao_da_equipe(equipe_id)) or eh_organizador_de(edicao_da_equipe(equipe_id)))
              and edicao_liberada(edicao_da_equipe(equipe_id)));
create policy links_update on public.links for update to authenticated
  using ((equipe_id = minha_equipe(edicao_da_equipe(equipe_id)) or eh_organizador_de(edicao_da_equipe(equipe_id)))
         and edicao_liberada(edicao_da_equipe(equipe_id)))
  with check ((equipe_id = minha_equipe(edicao_da_equipe(equipe_id)) or eh_organizador_de(edicao_da_equipe(equipe_id)))
              and edicao_liberada(edicao_da_equipe(equipe_id)));

create policy materiais_select on public.materiais for select to authenticated
  using (eh_organizador_de(edicao_id) or (participa_de(edicao_id) and removido_em is null));
create policy materiais_insert on public.materiais for insert to authenticated with check (eh_organizador_de(edicao_id));
create policy materiais_update on public.materiais for update to authenticated
  using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id));

create policy trocas_select on public.trocas for select to authenticated
  using (eh_organizador_de(edicao_id) or solicitante = email_atual()
         or equipe_origem = minha_equipe(edicao_id) or equipe_destino = minha_equipe(edicao_id));

-- Fichas: o avaliador vê as dele; a organização da edição vê todas. Escrita só pelas funções.
create policy fichas_select on public.fichas for select to authenticated
  using (eh_organizador_de(edicao_id) or avaliador = email_atual());
create policy notas_criterio_select on public.notas_criterio for select to authenticated
  using (exists (select 1 from fichas f where f.id = ficha_id and (eh_organizador_de(f.edicao_id) or f.avaliador = email_atual())));

create policy penalidades_equipe_select on public.penalidades_equipe for select to authenticated
  using (eh_organizador_de(edicao_id) or papel_em(edicao_id) = 'avaliador');
create policy penalidades_equipe_insert on public.penalidades_equipe for insert to authenticated
  with check (eh_organizador_de(edicao_id));
create policy penalidades_equipe_update on public.penalidades_equipe for update to authenticated
  using (eh_organizador_de(edicao_id)) with check (eh_organizador_de(edicao_id));

create policy historico_select on public.historico for select to authenticated using (eh_organizador());
-- Tabelas *_legado: sem política = ninguém do app lê (ficam só para auditoria no banco).

-- -----------------------------------------------------------------------------
-- 12. Permissões
-- -----------------------------------------------------------------------------
grant select, update on public.edicoes to authenticated;
grant select, insert, update on public.pessoas, public.participacoes, public.notas, public.bancas, public.fases,
  public.rubricas, public.criterios, public.niveis, public.criterio_niveis, public.penalidades, public.regras_desempate,
  public.membros, public.links, public.materiais, public.penalidades_equipe to authenticated;
grant select, update on public.equipes to authenticated;
grant select on public.trocas, public.fichas, public.notas_criterio, public.historico to authenticated;
revoke all on public.pessoas_legado, public.avaliacoes_legado, public.penalidades_aplicadas_legado,
  public.configuracao_legado from authenticated;

do $$
declare f text;
begin
  -- Funções internas: o app não chama direto.
  foreach f in array array['public.importar_regulamento(uuid, jsonb)', 'public.atualizar_situacao_proposta(uuid)',
                           'public.registrar_historico()', 'public.impedir_apagar()', 'public.proteger_regulamento()',
                           'public.cancelar_trocas_da_equipe()', 'public.checar_membro()'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
  -- Funções que o app usa.
  foreach f in array array['public.edicao_atual()', 'public.eh_organizador_de(uuid)', 'public.participa_de(uuid)',
                           'public.papel_em(uuid)', 'public.equipe_ativa_de(text, uuid)', 'public.minha_equipe(uuid)',
                           'public.edicao_da_equipe(uuid)', 'public.edicao_liberada(uuid)', 'public.pode_avaliar(uuid)',
                           'public.exportar_regulamento(uuid)',
                           'public.criar_equipe(text, text, uuid)', 'public.arquivar_equipe(uuid)',
                           'public.aplicar_equipes(jsonb, boolean, uuid)', 'public.remover_integrante(uuid, text)',
                           'public.propor_equipe(text, text[], text, text)', 'public.convidar_integrante(uuid, text, text)',
                           'public.responder_convite(uuid, boolean, text)', 'public.cancelar_proposta(uuid, text)',
                           'public.analisar_equipe(uuid, boolean, text)', 'public.salvar_ficha(uuid, uuid, jsonb, text)',
                           'public.arquivar_ficha(uuid)', 'public.criar_edicao(jsonb, uuid)',
                           'public.definir_regulamento(uuid, jsonb)', 'public.definir_edicao_atual(uuid)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Funções antigas que perderam o sentido.
drop function if exists public.pode_avaliar(text);
drop function if exists public.validar_notas();
drop function if exists public.cancelar_trocas_orfas() cascade;
