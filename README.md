# DataHack Univag 2026 — Gestão de Equipes

Sistema web (mobile e desktop) para os inscritos do DataHack formarem equipes e
registrarem onde fazem as entregas. Login por e-mail + senha no Supabase Auth, com
"esqueci a senha" por e-mail; só entra quem está na lista de inscritos. Backend 100% Supabase (Auth + Postgres com RLS).

**Stack:** Next.js 16 (App Router, Server Actions) · `@supabase/ssr` · Tailwind CSS v4.

## O que faz

**Aluno**
- No primeiro acesso cria a senha com o e-mail da inscrição (só se estiver cadastrado na edição).
- Vê a própria equipe, montada pela organização. **Não adiciona, não remove e não sai**:
  a composição é só da organização.
- Escolhe o **líder** da equipe: sem líder, qualquer integrante define; depois de
  definido, só o próprio líder passa a liderança para outra pessoa (a organização sempre pode).
- Edita nome da equipe, repositório GitHub (público, obrigatório para a entrega) e os
  links de entrega com categoria: GitHub, Google Drive, Apresentação, Vídeo, Dashboard,
  Figma, Site/Deploy, Outro.
- Vê os materiais publicados pela organização.
- **Troca de equipe:** pede para ir para outra equipe; qualquer integrante de lá pode
  aceitar (os dois trocam de lugar) ou recusar. Quem pediu pode cancelar. O aviso aparece
  no topo da tela da equipe pedida (a tela se atualiza sozinha a cada 30 s).

**Organização** (`/admin`, papel `organizador`), com 6 abas na ordem do evento
(no celular: barra embaixo com Painel, Equipes, Avaliação, Ranking e "Mais"):
- **Painel:** números do evento e pendências (equipes sem líder/repositório, trocas
  aguardando, alunos sem equipe, fichas faltando), cada uma com link para resolver.
- **Pessoas:** alunos, organizadores e bancas num lugar só, com filtros (papel, sem
  equipe, sem nota) e busca. Cadastrar, editar, mudar papel, remover. A **nota média**
  só os organizadores veem.
- **Equipes**, com sub-abas:
  - *Equipes:* todas as equipes com integrantes, repositório (público/privado/pendente) e
    links; filtro "com pendência"; quem está sem equipe; criar equipe; limite de
    integrantes e **trava de edição**; exportar CSV.
  - *Trocas:* auditoria de todos os pedidos (aguardando, aceitos, recusados, cancelados).
  - *Gerador:* o algoritmo do `datahack-equipes.html`: equilibra semestre + nota, mistura
    cursos, semente reproduzível, compara com 200 sorteios aleatórios, modo telão, e
    **salva as equipes no sistema**.
- **Materiais:** links publicados para todos os alunos (desafios, fontes, dicionários).
- **Avaliação:** quadro geral, andamento das bancas e fichas com penalidades; encerrar ou
  reabrir; exportar ranking, analítico, dados brutos e notas por avaliador (CSV).
- **Ranking:** pódio com Top 3 / Top 5 / Todos e modo revelação para o telão.

Em qualquer tela: **Ctrl+K** abre a busca rápida (telas, equipes, pessoas, "ver como");
**?** mostra os atalhos. Remoções simples têm **Desfazer** no aviso.

**Bancas** (`/avaliar`, papéis `avaliador_tecnico` e `avaliador_negocio`; organizadores também)
- Lista das equipes com o andamento das fichas; ficha por rubrica com os 4 níveis de cada
  critério (descrições das rubricas do evento), nota calculada na hora e comentário.
- Rubricas v2 (`docs/cronograma_rubrica_v2.html`): fase 1 = pitch 6% + mesa 9%, fase 2 = pitch 8%
  + mesa 12%, fase 3 (repositório) 25%, negócio 40%. Cada avaliador pertence a uma banca
  da edição: na de 2026, a banca de professores avalia os pitches F1/F2, a organização avalia
  mesa F1/F2 e F3 (e pode lançar qualquer rubrica) e os jurados de negócio avaliam o pitch final.
- O regulamento (rubricas, pesos, penalidades) fica no banco, por edição; veja e baixe em
  Organização → Edições → Regulamento. Para uma edição nova a partir do Python:
  `python src/build_cronograma_rubrica.py`, copie o JSON para `config/rubricas_v2.json`,
  rode `npm run regulamento` e importe `config/regulamento_2026.json` na tela da edição.
- **Ver como qualquer pessoa:** em Pessoas (ou na equipe) ou pela busca rápida
  (Ctrl+K → "Ver como"), a organização navega como um aluno ou como um avaliador de qualquer
  banca, sem senha e sem contas falsas. Uma faixa amarela mostra a simulação; nas fichas das
  bancas nada é salvo. Como aluno, abre a tela exatamente como ele vê, com os mesmos botões que ele tem,
  todos funcionando (agindo como organização)
  (`/ver-como?email=...`, com uma confirmação antes de começar).

## Edições do evento

Cada DATAHack é uma **edição** (2026 = Edição 1) e tudo fica ligado a ela: participantes,
equipes, trocas, materiais, fichas e o **regulamento da avaliação**, que fica no banco
(fases, rubricas, critérios, níveis, penalidades e regras de desempate) e não mais no código.

- **Pessoa única + participação:** a pessoa tem um cadastro só (e-mail, nome); o papel
  (aluno, organização ou avaliador de uma banca), o curso, o semestre e a nota são por edição.
- **Formação das equipes por edição:** gerador da organização, montagem à mão ou
  **alunos propõem** (quem propõe convida os colegas, cada um confirma e a organização
  aprova ou recusa com motivo). Trocas entre alunos ligam e desligam por edição.
- **Nada é apagado:** `DELETE` é barrado por gatilho no banco. Remover vira arquivar
  (`removido_em`, `saiu_em`) e toda alteração fica em `historico` (antes e depois, quem e quando).
- **Regulamento protegido:** depois que a edição tem fichas, pesos, fatores e estrutura
  não mudam (mudariam notas já dadas); os textos podem ser corrigidos.
- **Nova edição:** Organização → Mais → Edições → "Nova edição", copiando o regulamento e
  os organizadores de outra. O formato canônico do regulamento é `config/regulamento_2026.json`
  (`npm run regulamento` gera a partir de `config/rubricas_v2.json`) e pode ser baixado/importado pela tela.
- **Edição atual:** é a que alunos e bancas veem; a organização escolhe a edição que está
  administrando no seletor do cabeçalho.

## Regras garantidas no banco (não só na tela)

- Trigger em `auth.users` recusa cadastro de e-mail fora de `pessoas`.
- Cada aluno está em no máximo uma equipe ativa por edição, contando convites (`membros_um_ativo`).
- Nome de equipe único por edição (sem diferenciar maiúsculas).
- `repo_github` no formato `https://github.com/usuario/repo` (obrigatório ao criar equipe;
  equipes do gerador ficam "pendente" até os alunos cadastrarem).
- Nota média fica numa tabela separada (`notas`, por edição) que só a organização da edição lê.
- Gmail é comparado sem pontos e sem `+sufixo` (`joao.silva@gmail.com` = `joaosilva@gmail.com`).
- RLS: só organizador cria equipe e adiciona/remove integrantes; aluno edita nome,
  repositório, links e líder da própria equipe; com a trava ligada, aluno só visualiza.
- O líder precisa ser integrante da equipe; se sair dela, a equipe fica sem líder.
- Trava do líder: com líder definido, só ele (ou um organizador) troca o líder.
- Nome e repositório da equipe: só o líder (ou um organizador) altera; links, todos os integrantes.

## Configuração (uma vez)

### 1. Banco

As migrações ficam em `supabase/migrations/` (formato do Supabase CLI), em ordem:

1. `…01_esquema_inicial` — tabelas, funções, trigger e RLS.
2. `…02_organizacao` — notas, materiais e o RPC do gerador de equipes.
3. `…03_lider_e_permissoes` — líder da equipe; composição só pela organização.
4. `…04_trava_lider` — depois de definido, só o líder troca o líder.
5. `…05_lider_edita_dados` — só o líder altera nome e repositório da equipe.
6. `…06_trocas` — pedidos de troca de equipe.
7. `…07_auditoria_trocas` — histórico de trocas preservado + quem cancelou.
8. `…08_avaliacao` — módulo de avaliação (bancas).
9. `…09_rubricas_v2` — fases 1 e 2 com pitch (professores) + mesa (organização).
10. `…10_edicoes` — edições, pessoas + participações, regulamento no banco, propostas de equipe,
    fichas por critério, histórico e "nada é apagado". A edição de 2026 vira a Edição 1 com todos
    os dados; as tabelas antigas ficam guardadas como `*_legado`.
11. `…11_presenca` — presença no evento por participação (presente/ausente, quando e quem marcou)
    e o motivo de saída "ausente" para quem estava numa equipe e não compareceu.
12. `…12_mentoria` — mentores entram no sistema: veem equipes e alunos da edição e registram a
    presença pela função `registrar_presenca` (a única coisa que a mentoria altera).
13. `…13_mapa` — mapa do evento por edição: pisos > salas > elementos (bancadas, mesas, portas…),
    em centímetros, com importação/exportação em JSON (metros) e croqui em escala.
14. `…14_mapa_equipes` — ícone da equipe (líder ou organização) e alocação das equipes nos
    lugares das bancadas, com histórico (`alocar_equipe` troca as duas quando o lugar está ocupado).
    **Rode antes de publicar o app**: a lista de equipes passa a ler a coluna `icone`.
15. `…15_chamados` — pedidos de ajuda das equipes (dúvida/problema): a equipe abre, cancela ou
    avisa que resolveu; mentoria e organização atendem. Só a equipe, a mentoria e a organização veem.
16. `…16_substituir_regulamento` — trocar o regulamento por outro JSON enquanto a edição não tem
    fichas (para planejar com uma IA); o anterior vai inteiro para o histórico.
17. `…17_instituicoes_acesso` — instituições (com logo SVG) e, por edição, quem pode participar
    (lista, instituições escolhidas ou aberto), vagas, período de inscrição e marca (nome, cor,
    logo). As edições de antes viram "lista" + Univag. Função `definir_acesso_edicao`.

**Projeto novo:** `supabase link --project-ref <ref>` e `supabase db push`
(ou cole os arquivos no SQL Editor, na ordem). Depois rode `supabase/seed.sql`
(os inscritos, as notas e o organizador inicial).

**Produção** (o projeto que já existe): as migrações 001 a 011 foram aplicadas pelo SQL Editor
(a 011 em 12/10/2026; confira se da 012 à 017 já foram aplicadas). O banco de produção não guarda o histórico do `supabase db push`, então
**não use `db push` nele**: ele tentaria rodar tudo de novo. Para uma migração nova:

1. Crie o arquivo em `supabase/migrations/` com o próximo número e teste no Postgres local
   (seção "Testes do banco" abaixo).
2. Faça o backup (`pg_dump` do Session pooler) e anote as contagens das tabelas principais.
3. Cole o arquivo no **SQL Editor** e rode. O script vai inteiro de uma vez: se der erro, nada muda.
4. Confira as contagens e só então faça o merge do app na `main` (a Vercel publica a `main`).
   Se a migração muda colunas que o app lê, o app novo e a migração precisam ir juntos.

**Ligações com `pessoas`:** várias tabelas têm mais de uma chave para `pessoas` (ex.:
`participacoes.email` e `participacoes.presenca_por`). Ao trazer o nome junto numa consulta,
diga qual ligação usar (`pessoa:pessoas!participacoes_email_fkey(nome)`). Sem isso, a API do
Supabase recusa a consulta como ambígua assim que surge uma segunda chave — foi o que derrubou
o login depois da 011. O Postgres local não pega esse erro, porque não tem a API na frente.

Se a lista de inscrições mudar: `node scripts/gerar_seed.mjs "INSCRIÇÕES.txt" supabase/seed.sql [slug-da-edicao]`.

> `seed.sql`, `INSCRIÇÕES.txt` e `inscritos-datahack.csv` contêm dados pessoais e
> estão no `.gitignore`. Não versionar.

### 2. Login (Supabase Auth, e-mail + senha)

No **primeiro acesso** o aluno informa o e-mail da inscrição e cria uma senha; depois
entra com e-mail + senha. Quem não está em `pessoas` é recusado pelo trigger do banco.
Em **"Esqueci a senha"** o Supabase envia um link por e-mail para criar uma nova senha.

1. **Authentication → Sign In / Providers → Email**: deixe ativo e **desligue
   "Confirm email"** (o cadastro entra direto, sem e-mail de confirmação).
2. **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:3000` enquanto testa; depois o domínio de produção.
   - *Redirect URLs*: `http://localhost:3000/**` e `https://SEU-DOMINIO/**`.
3. **Authentication → Emails → Templates → Reset Password** (recomendado): troque o
   link por este, que funciona mesmo se o aluno abrir o e-mail em outro navegador/celular:
   ```html
   <h2>Redefinir senha — DataHack Univag</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nova-senha">Criar nova senha</a></p>
   ```
   (Com o template padrão também funciona, mas só se abrir o link no mesmo navegador.)
4. **SMTP:** o e-mail embutido do Supabase tem limite baixo de envios por hora e pode
   só entregar para e-mails da equipe do projeto. Para os alunos receberem o e-mail de
   redefinição, configure um SMTP em **Authentication → Emails → SMTP Settings**
   (Resend, Brevo ou Gmail com senha de app). Só o "esqueci a senha" usa e-mail.

### 3. Rodar

```bash
cp .env.example .env.local   # já existe um .env.local com as chaves do projeto
npm install
npm run dev                  # http://localhost:3000
```

### 4. Deploy

Qualquer host de Next.js (Vercel é o mais simples): configure as variáveis
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Desenvolvimento

```bash
npm run dev          # http://localhost:3000
npm run lint         # ESLint
npm run typecheck    # tipos das rotas (next typegen) + tsc
npm test             # Vitest: regras de nota, permissões, trocas, gerador, validação
npm run db:tipos     # regenera src/shared/db/tipos-banco.ts lendo o banco (DATABASE_URL, só leitura)
```

O GitHub Actions (`.github/workflows/ci.yml`) roda lint, typecheck e testes em cada push.

### Testes do banco (Postgres local)

As migrações são testadas num Postgres local comum, com um "shim" que imita o mínimo do
Supabase (`auth.jwt()`, papéis `anon`/`authenticated`). Nada disso vai para a produção.

```bash
createdb datahack_teams_teste
psql -d datahack_teams_teste -f supabase/teste/shim_supabase.sql
for f in supabase/migrations/2026100*.sql supabase/migrations/20261010*.sql; do psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -f "$f"; done
node supabase/teste/dados_sinteticos.mjs | psql -d datahack_teams_teste   # dados SINTÉTICOS, no formato antigo
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261011000010_edicoes.sql
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261012000011_presenca.sql
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261014000012_mentoria.sql
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261014000013_mapa.sql
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261014000014_mapa_equipes.sql
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261014000015_chamados.sql
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261015000016_substituir_regulamento.sql
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261016000017_instituicoes_acesso.sql
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -f supabase/teste/testes_edicoes.sql  # regras por papel
PARIDADE_DB=datahack_teams_teste npx vitest run paridade  # ranking idêntico ao do código antigo
```

`supabase/teste/gabarito_ranking.json` é o ranking calculado pelo código anterior às edições
sobre os mesmos dados sintéticos; o teste de paridade exige que o cálculo novo dê o mesmo
resultado em todas as equipes (nota final, posição, rubricas, critérios, fases e desempate).

## Arquitetura

Monólito modular em Next.js (App Router) sobre Supabase. Cada módulo de negócio tem as
mesmas camadas, e a dependência só vai "para dentro" (ui → application → domain; infra
implementa o acesso ao banco):

```
src/
  app/                    rotas (só compõem telas; sem regra de negócio)
    _shell/               Area (cabeçalho + navegação + busca), menus, TelaAluno
    admin/                organização: painel, pessoas, equipes (lista/trocas/gerador),
                          materiais, avaliacao (+ exportar), ranking
    avaliar/              bancas: lista de equipes e ficha por rubrica
    ver-como/ ajuda/ login/ nova-senha/ auth/confirm/
  modules/
    pessoas/ equipes/ trocas/ materiais/ avaliacao/ gerador/ painel/
      domain/             tipos e regras puras (testadas com Vitest)
      infra/              repositorio.ts: consultas Supabase tipadas
      application/        Server Actions (validação Zod) e consultas compostas
      ui/                 componentes do módulo
  shared/
    db/                   clientes Supabase (servidor/navegador), tipos gerados, erros
    acao/                 criarAcao(schema, fn), Resultado { ok, erro, desfazer }, campos Zod
    auth/ lib/            sessão, formatação (fuso de Cuiabá), texto, CSV
    ui/                   design system: Botao, Campo, Formulario, Modal, Toast, Aviso,
                          Selo, EstadoVazio, Navegacao, PaletaComandos, Pagina…
  proxy.ts                renova a sessão e manda para /login quem não está logado
supabase/migrations/      esquema do banco (Supabase CLI)
config/regulamento_2026.json  regulamento canônico da Edição 1 (scripts/regulamento_canonico.mjs)
supabase/teste/           shim do Supabase, dados sintéticos, testes de regras e gabarito da paridade
```

A segurança continua no banco (RLS, triggers e RPCs); as regras repetidas na tela
(`modules/equipes/domain/permissoes.ts`) só servem para mostrar o que é possível e
explicar o motivo quando algo está bloqueado.

## Observações

- Como o cadastro não exige confirmação por e-mail, quem souber o e-mail de um inscrito
  poderia criar a senha antes dele. Se acontecer, o dono usa "Esqueci a senha" (o link
  chega no e-mail dele) ou você apaga o usuário em Authentication → Users.
- A checagem de "repositório público" usa a API pública do GitHub (60 consultas/hora
  por IP do servidor). Ela não bloqueia a criação; só sinaliza.
