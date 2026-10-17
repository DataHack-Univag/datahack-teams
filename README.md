# DATAHack — Equipes

Sistema web (celular e computador) para organizar o **DATAHack**: inscrições, equipes, check-in,
pedidos de ajuda, mapa do evento, avaliação pelas bancas e ranking. Começou no DATAHack Univag
2026 (Edição 1) e hoje é **por edição**: cada evento tem o seu formulário, as suas regras, o seu
regulamento, a sua logo e a sua cor, e pode ser de uma instituição só, de várias ou aberto a todos.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS v4 · Supabase
(Auth, Postgres com RLS, Realtime) · Zod · Vitest. Produção na Vercel (deploy da `main`).

---

## O que faz

### Participante
- **Inscrição pelo site** (`/inscricao/<edição>`), quando a edição é aberta ou de instituições:
  nome e sobrenome, e-mail (pode ser o pessoal), senha, as perguntas da edição e o **termo de uso
  dos dados**, que só libera o aceite depois de rolar até o fim. Acompanha a situação em
  **Minha inscrição** (em análise, aprovada, lista de espera com a posição), que muda na hora.
- **Login vale sempre:** quem participou de qualquer edição entra e vê as edições de que participou
  (só consulta) e, em **Suas edições**, a edição que está acontecendo, com a inscrição se estiver aberta.
- **Minha equipe:** colegas, líder, repositório no GitHub, links de entrega, ícone da equipe e o lugar
  no mapa. Conforme a edição, a equipe vem do gerador da organização, é montada à mão ou é
  **proposta pelos participantes** (quem propõe convida, cada um confirma, a organização aprova).
- **Trocas de equipe** (se a edição permitir), **pedido de ajuda** à mentoria (dúvida ou problema),
  **QR code de entrada** no check-in e **Materiais** (desafios, bases, dicionários).

### Mentoria (`/mentoria`)
Equipes e pessoas da edição, **check-in por QR** (câmera ou código de 8 letras) com a lista de quem
entrou e quem falta, chamada de presença e **chamados** (pedidos de ajuda), com histórico.

### Bancas (`/avaliar`)
Ficha por rubrica com os níveis de cada critério (atalhos de teclado), salva pela metade, nota na hora.
O regulamento (fases, rubricas, critérios, níveis, penalidades, desempate) fica no banco, por edição.

### Organização (`/admin`)
Menu por tarefa: **Painel · Equipes · Avaliação · Ranking**, e os grupos **Participantes** (Pessoas,
Inscrições, Check-in), **Durante o evento** (Chamados, Mapa, Materiais) e **Configurar** (Edições,
Formulário de inscrição, Regulamento, Instituições).
- **Painel:** números e pendências do evento, inclusive a formação das equipes (quem propôs, quem foi
  convidado, quem está livre).
- **Pessoas e Inscrições:** cadastro com as perguntas da edição, fila de inscrições (aprovar, recusar,
  lista de espera), vagas, prazo e termo LGPD com versões.
- **Equipes:** lista, propostas, trocas e o **gerador** (equilibra semestre e nota, telão).
- **Avaliação e Ranking:** quadro geral, fichas por banca, exportações e pódio com modo revelação.
- **Mapa:** salas desenhadas em escala, bancadas, distribuição das equipes e croqui para imprimir.
- **Edições:** criar (copiando o regulamento de outra), acesso e marca (logo e cor), **situação** e
  edição atual. **Ver como:** navega como qualquer participante, mentor ou banca, sem senha.

### Em todas as telas
- **Ao vivo:** inscrição nova, convite, proposta pronta para aprovar, troca, pedido de ajuda, mentor a
  caminho, presença confirmada… a tela se atualiza na hora e mostra um aviso (Supabase Realtime).
  Bolinhas no menu mostram o que espera ação.
- **A cor da edição pinta o sistema inteiro** (claro e escuro), inclusive login, carregamentos e janelas.
- **Ajuda** por módulo, com busca (a organização vê a de todos os perfis); **Ctrl+K** abre a busca rápida.
- Heurísticas de Nielsen como guia: estado sempre visível, confirmação e "Desfazer", prevenir o erro.

---

## Edições

Cada DATAHack é uma **edição**, e tudo pertence a ela: participações, inscrições, equipes, trocas,
chamados, check-in, mapa, materiais, fichas e regulamento. A pessoa tem um cadastro só; o papel
(participante, organização, mentoria ou banca), o curso, o semestre e o CR são por edição.

**Acesso:** lista fechada (a organização cadastra), instituições escolhidas ou aberto a todos.
Aprovação das inscrições automática (com vagas e lista de espera) ou pela organização.

**Situação** (Configurar → Edições → Situação):

| Situação | O que significa |
|---|---|
| Em planejamento | em preparação; a página de inscrição diz "as inscrições ainda não foram abertas" |
| Em andamento | acontecendo; **tornar a edição atual já põe aqui** |
| Encerrada | concluída e **congelada**: nada dela muda, nem pela organização (reabrir = voltar para "em andamento") |
| Cancelada | não vai acontecer, com o motivo; o link de inscrição deixa de existir |

**Edição atual:** é a que o login, os participantes e as bancas veem. Só uma edição em andamento (ou
encerrada) pode ser a atual; em planejamento nunca. **Sem edição atual**, o login e o sistema mostram
a última encerrada, marcada como "Atual · encerrada".

**Inscrições pelo site** só abrem na **edição atual, em andamento e dentro do prazo** (abrem em /
fecham em). Só aí o botão "Inscrever-se" aparece no login.

---

## Regras garantidas no banco (não só na tela)

- **Nada é apagado:** `DELETE` é barrado por gatilho; remover vira arquivar (`removido_em`, `saiu_em`)
  e toda alteração fica em `historico` (antes, depois, quem e quando).
- **Edição encerrada congelada:** um gatilho em cada tabela da edição recusa inserir, alterar ou apagar.
  Manutenção de propósito: `set local dh.permitir_encerrada = 'sim';` na própria transação.
- **RLS** em tudo; as RPCs `security definer` conferem o papel. Cada pessoa vê os nomes de quem dividiu
  alguma edição com ela; a organização vê todos. O Realtime respeita as mesmas permissões.
- Respostas do formulário conferidas por `validar_respostas` (a mesma regra roda na tela).
  Inscrição aprovada já traz curso, semestre e CR para o cadastro.
- Cada participante em no máximo uma equipe ativa por edição, contando convites; nome de equipe único
  por edição; repositório no formato `https://github.com/usuario/repo`.
- CR (nota média) numa tabela separada (`notas`), que só a organização lê.
- Gmail comparado sem pontos e sem `+sufixo`. Cadastro no Auth só para e-mails que existem em `pessoas`.
- Regulamento protegido: com fichas lançadas, pesos e estrutura não mudam.

---

## Configuração

### 1. Banco

As migrações ficam em `supabase/migrations/`, em ordem:

| # | Migração | Resumo |
|---|---|---|
| 001–009 | esquema inicial … rubricas v2 | equipes, líder, trocas, avaliação (a versão do evento de 2026) |
| 010 | `edicoes` | edições, pessoa + participação, regulamento no banco, propostas, histórico, nada apagado |
| 011 | `presenca` | presença por participação |
| 012 | `mentoria` | mentores veem a edição e registram presença |
| 013–014 | `mapa`, `mapa_equipes` | mapa do evento em escala, ícone e lugar das equipes |
| 015 | `chamados` | pedidos de ajuda das equipes |
| 016 | `substituir_regulamento` | trocar o regulamento enquanto não há fichas |
| 017 | `instituicoes_acesso` | instituições, acesso por edição, vagas, prazo, marca (logo e cor) |
| 018 | `formulario_inscricao` | banco de perguntas, perguntas por edição, inscrições com respostas |
| 019 | `logo_edicao` | correção da 017 (logo oficial na Edição 1) |
| 020 | `inscricao_publica` | página pública, aprovação, lista de espera, termo LGPD, vitrine do login |
| 021 | `checkin_qr` | código de check-in por participante e `fazer_checkin` |
| 022 | `cr_no_formulario` | CR como pergunta do formulário |
| 023 | `tempo_real` | Realtime em inscrições e presença |
| 024 | `listas_curso_semestre` | curso em lista (com "Outro"), semestre inteiro |
| 025 | `vitrine_edicao_atual` | login informa a edição atual e o link de inscrição |
| 026 | `tempo_real_telas` | Realtime em equipes, convites, trocas, chamados, avaliação, mapa, materiais |
| 027–028 | `inscricao_so_na_atual`, `inscricao_ainda_nao_abriu` | inscrição só na atual e no prazo; "ainda não abriram" × "encerradas" |
| 029 | `participante_nas_mensagens` | "participante" no lugar de "aluno" nas mensagens |
| 030 | `inscricao_preenche_cadastro` | inscrição aprovada traz curso, semestre e CR |
| 031 | `situacao_edicao` | planejada / em andamento / encerrada / cancelada (com motivo) |
| 032 | `sem_edicao_atual` | pode não haver atual (login mostra a última encerrada); nomes visíveis entre edições |
| 033–034 | `atual_em_andamento`, `planejada_nao_e_atual` | atual = em andamento; planejada nunca é a atual |
| 035 | `edicao_encerrada_congelada` | edição encerrada não muda mais |

**Projeto novo:** `supabase link --project-ref <ref>` e `supabase db push` (ou cole os arquivos no
SQL Editor, na ordem). Depois rode `supabase/seed.sql` (inscritos, notas e organizador inicial).

**Produção:** as migrações foram aplicadas **pelo SQL Editor**; o banco não guarda o histórico do
`supabase db push`, então **não use `db push` nele**. Para uma migração nova:

1. Crie o arquivo com o próximo número e teste no Postgres local (seção "Testes do banco").
2. Faça o backup (`pg_dump` pelo Session pooler) e anote as contagens das tabelas principais.
3. Cole o arquivo no **SQL Editor** e rode (vai inteiro: se der erro, nada muda).
4. Confira as contagens e só então faça o merge na `main`. Se a migração muda o que o app lê,
   app e migração vão juntos.

**Ligações com `pessoas`:** várias tabelas têm mais de uma chave para `pessoas`. Ao trazer o nome numa
consulta, diga qual usar (`pessoa:pessoas!participacoes_email_fkey(nome)`), senão a API recusa a
consulta como ambígua. O Postgres local não pega esse erro.

Lista de inscritos (lista fechada): `node scripts/gerar_seed.mjs "INSCRIÇÕES.txt" supabase/seed.sql [slug-da-edicao]`.

> `seed.sql`, `INSCRIÇÕES.txt`, `inscritos-datahack.csv` e `.env.local` contêm dados pessoais ou
> chaves e estão no `.gitignore`. **Não versionar.** Nunca use a chave `service_role` no app.

### 2. Login (Supabase Auth, e-mail e senha)

No primeiro acesso a pessoa cria a senha com o e-mail cadastrado (ou cria a conta ao se inscrever
pelo site). "Esqueci a senha" manda um link por e-mail.

1. **Authentication → Sign In / Providers → Email:** ativo, com **"Confirm email" desligado**.
2. **Authentication → URL Configuration:** *Site URL* = o domínio de produção; *Redirect URLs* com
   `http://localhost:3000/**`, `https://SEU-DOMINIO/**` e o domínio do Preview, se usar.
3. **Authentication → Emails → Templates → Reset Password** (recomendado), para funcionar mesmo
   abrindo o e-mail em outro aparelho:
   ```html
   <h2>Redefinir senha — DATAHack</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nova-senha">Criar nova senha</a></p>
   ```
4. **SMTP próprio** (Resend, Brevo ou Gmail com senha de app) em **Authentication → Emails → SMTP
   Settings**: o e-mail embutido do Supabase tem limite baixo.

### 3. Rodar

```bash
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev                  # http://localhost:3000
```

### 4. Deploy (Vercel)

- **Produção:** a branch `main`.
- **Testes:** a branch `dev` vira um **Preview** automático a cada push, com endereço próprio.
  Marque as variáveis do Supabase também para o ambiente *Preview*. Atenção: com as mesmas
  variáveis, o Preview usa **o mesmo banco da produção**.

---

## Desenvolvimento

```bash
npm run dev          # http://localhost:3000
npm run lint         # ESLint
npm run typecheck    # tipos das rotas (next typegen) + tsc
npm test             # Vitest (regras de domínio, permissões, gerador, inscrição, tema, avisos…)
npm run db:tipos     # regenera src/shared/db/tipos-banco.ts lendo o banco (DATABASE_URL, só leitura)
npm run regulamento  # gera config/regulamento_2026.json a partir de config/rubricas_v2.json
```

O GitHub Actions (`.github/workflows/ci.yml`) roda lint, typecheck e testes em cada push.
Com pouca memória, `npx vitest run --no-file-parallelism` roda um arquivo por vez.

### Testes do banco (Postgres local)

As migrações são testadas num Postgres comum, com um "shim" que imita o mínimo do Supabase
(`auth.jwt()`, papéis `anon` e `authenticated`). Nada disso vai para a produção.

```bash
createdb datahack_teams_teste
psql -d datahack_teams_teste -f supabase/teste/shim_supabase.sql
for f in supabase/migrations/2026100*.sql supabase/migrations/20261010*.sql; do
  psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -f "$f"
done
node supabase/teste/dados_sinteticos.mjs | psql -d datahack_teams_teste   # dados SINTÉTICOS (formato antigo)
for f in supabase/migrations/2026101[1-9]*.sql supabase/migrations/2026102*.sql; do
  psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -1 -f "$f"
done
psql -d datahack_teams_teste -v ON_ERROR_STOP=1 -f supabase/teste/testes_edicoes.sql   # regras por papel (rollback no fim)
PARIDADE_DB=datahack_teams_teste npx vitest run paridade                               # ranking igual ao do código antigo
```

`testes_edicoes.sql` termina com `OK: todas as regras das migrações 010 a 035 conferem.`
`supabase/teste/gabarito_ranking.json` é o ranking do código anterior às edições sobre os mesmos dados
sintéticos; o teste de paridade exige o mesmo resultado em todas as equipes.

---

## Arquitetura

Monólito modular em Next.js sobre Supabase. Cada módulo tem as mesmas camadas, e a dependência só vai
"para dentro" (ui → application → domain; infra implementa o acesso ao banco):

```
src/
  app/                      rotas (só compõem telas)
    _shell/                 Area (cabeçalho, menu, avisos ao vivo), menus, TelaAluno, seletor de edições
    admin/                  organização: painel, pessoas, inscrições, check-in, equipes, avaliação,
                            ranking, chamados, mapa, materiais, edições, instituições
    mentoria/               equipes, pessoas, check-in e chamados
    avaliar/                bancas: lista de equipes e ficha por rubrica
    inscricao/[slug]/       página pública de inscrição
    minha-inscricao/ minhas-edicoes/ ver-como/ ajuda/ login/ nova-senha/ auth/confirm/
  modules/
    avaliacao chamados checkin edicoes equipes gerador inscricoes instituicoes
    mapa materiais painel pessoas trocas
      domain/               tipos e regras puras (testadas com Vitest)
      infra/                repositorio.ts: consultas Supabase tipadas
      application/          Server Actions (validação Zod)
      ui/                   componentes do módulo
  shared/
    db/                     clientes Supabase, tipos gerados, tradução de erros
    acao/                   criarAcao(schema, fn), Resultado { ok, erro, desfazer }, campos Zod
    auth/ lib/              sessão, edição escolhida, fuso de Cuiabá, texto, CSV, regras dos avisos
    ui/                     design system: Botao, Campo, Formulario, Modal, Toast, Navegacao,
                            TempoReal, SomenteLeitura, PaletaComandos, Pagina…
  proxy.ts                  renova a sessão e manda para /login quem não está logado
supabase/migrations/        esquema do banco
supabase/teste/             shim do Supabase, dados sintéticos, testes de regras e gabarito da paridade
config/                     regulamento canônico da Edição 1
```

A segurança fica no banco (RLS, gatilhos e RPCs). As regras repetidas na tela só servem para mostrar
o que é possível e explicar o motivo quando algo está bloqueado (ex.: a edição encerrada deixa os
botões que gravam desabilitados, e o banco recusa de qualquer forma).

---

## Observações

- Como o cadastro não exige confirmação por e-mail, quem souber o e-mail de alguém da lista poderia
  criar a senha antes. Se acontecer, o dono usa "Esqueci a senha" ou a organização apaga o usuário em
  Authentication → Users.
- A checagem de "repositório público" usa a API pública do GitHub (60 consultas por hora por IP do
  servidor). Ela não bloqueia nada; só sinaliza.
