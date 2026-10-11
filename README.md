# DataHack Univag 2026 — Gestão de Equipes

Sistema web (mobile e desktop) para os inscritos do DataHack formarem equipes e
registrarem onde fazem as entregas. Login por e-mail + senha no Supabase Auth, com
"esqueci a senha" por e-mail; só entra quem está na lista de inscritos. Backend 100% Supabase (Auth + Postgres com RLS).

**Stack:** Next.js 16 (App Router, Server Actions) · `@supabase/ssr` · Tailwind CSS v4.

## O que faz

**Aluno**
- No primeiro acesso cria a senha com o e-mail da inscrição (só se estiver em `inscritos`).
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
  + mesa 12%, fase 3 (repositório) 25%, negócio 40%. Banca de professores (`avaliador_tecnico`)
  avalia os pitches F1/F2; organização avalia mesa F1/F2 e F3 (e pode lançar qualquer rubrica);
  jurados de negócio (`avaliador_negocio`) avaliam o pitch final.
- Rubricas, pesos e penalidades vêm de `src/build_cronograma_rubrica.py`. Se mudar lá:
  `python src/build_cronograma_rubrica.py`, copie `docs/rubricas_v2.json` para
  `config/rubricas_v2.json` e rode `npm run gerar:rubricas`
  (gera `src/modules/avaliacao/domain/rubricas.ts`).
- **Ver como aluno:** na página de uma equipe ("Ver como este aluno") ou pela busca rápida
  (Ctrl+K → "Ver como"), abre a tela exatamente como aquele aluno vê, com os mesmos botões que ele tem,
  todos funcionando (agindo como organização)
  (`/ver-como?email=...`). Nada é alterado e não precisa da senha do aluno.

## Regras garantidas no banco (não só na tela)

- Trigger em `auth.users` recusa cadastro de e-mail fora de `inscritos`.
- Cada aluno está em no máximo uma equipe (PK em `membros.email`).
- Nome de equipe único (sem diferenciar maiúsculas).
- `repo_github` no formato `https://github.com/usuario/repo` (obrigatório ao criar equipe;
  equipes do gerador ficam "pendente" até os alunos cadastrarem).
- Nota média fica numa tabela separada (`notas`) que só organizadores leem.
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

**Projeto novo:** `supabase link --project-ref <ref>` e `supabase db push`
(ou cole os arquivos no SQL Editor, na ordem). Depois rode `supabase/seed.sql`
(os inscritos, as notas e o organizador inicial).

**Projeto que já existe** (as 9 migrações já foram aplicadas à mão pelo SQL Editor):
marque-as como aplicadas uma vez, sem rodar nada no banco:

```bash
supabase migration repair --status applied 20261006000001 20261007000002 20261007000003   20261008000004 20261008000005 20261009000006 20261009000007 20261010000008 20261010000009
```

A partir daí, mudanças novas no banco viram um arquivo novo em `supabase/migrations/`
(`supabase migration new <nome>`), testado num projeto de teste antes da produção.
Se a lista de inscrições mudar: `node scripts/gerar_seed.mjs "INSCRIÇÕES.txt" supabase/seed.sql`.

> `seed.sql`, `INSCRIÇÕES.txt` e `inscritos-datahack.csv` contêm dados pessoais e
> estão no `.gitignore`. Não versionar.

### 2. Login (Supabase Auth, e-mail + senha)

No **primeiro acesso** o aluno informa o e-mail da inscrição e cria uma senha; depois
entra com e-mail + senha. Quem não está em `inscritos` é recusado pelo trigger do banco.
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
config/rubricas_v2.json   fonte das rubricas → scripts/gerar_rubricas.mjs
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
