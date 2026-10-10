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

**Organização** (`/admin`, papel `organizador`), com abas:
- **Equipes:** todas as equipes com integrantes, repositório (público/privado/pendente) e
  links de entrega; quem está sem equipe; criar/editar/excluir equipe; limite de
  integrantes e **trava de edição** (fim do prazo); exportar CSV.
- **Participantes:** lista de quem pode logar, com nome, e-mail, curso, semestre e
  **nota média** (só organizadores veem a nota). Cadastrar, editar, remover, buscar.
- **Gerador de equipes:** o algoritmo do `datahack-equipes.html` integrado: equilibra
  semestre + nota (peso ajustável), mistura cursos, semente reproduzível, compara com
  200 sorteios aleatórios, modo telão. Lê os participantes do banco e **salva as equipes
  no sistema** (só quem está sem equipe, ou refazendo tudo). Equipes geradas nascem sem
  repositório; os alunos veem um aviso para cadastrar o GitHub.
- **Materiais:** links publicados pela organização (repositório de documentação,
  desafios, fontes e dicionários de dados...). Aparecem na tela inicial de todos os alunos.
- **Trocas:** auditoria de todos os pedidos de troca (aguardando, aceitos, recusados,
  cancelados): quem pediu, de qual equipe para qual, mensagem, quem respondeu e quando.
- **Avaliação:** ranking consolidado (média por critério entre avaliadores, nota de cada
  rubrica, penalidades, nota final e desempate), detalhe de cada ficha, encerrar/reabrir a
  avaliação e exportar CSV.
- **Organizadores e bancas:** organizadores e avaliadores (técnico / negócio).

**Bancas** (`/avaliar`, papéis `avaliador_tecnico` e `avaliador_negocio`; organizadores também)
- Lista das equipes com o andamento das fichas; ficha por rubrica com os 4 níveis de cada
  critério (descrições das rubricas do evento), nota calculada na hora e comentário.
- Rubricas v2 (`docs/cronograma_rubrica_v2.html`): fase 1 = pitch 6% + mesa 9%, fase 2 = pitch 8%
  + mesa 12%, fase 3 (repositório) 25%, negócio 40%. Banca de professores (`avaliador_tecnico`)
  avalia os pitches F1/F2; organização avalia mesa F1/F2 e F3 (e pode lançar qualquer rubrica);
  jurados de negócio (`avaliador_negocio`) avaliam o pitch final.
- Rubricas, pesos e penalidades vêm de `src/build_cronograma_rubrica.py`. Se mudar lá:
  `python src/build_cronograma_rubrica.py` e depois, em `datahack-teams/`,
  `node scripts/gerar_rubricas.mjs ../docs/rubricas_v2.json src/lib/rubricas.ts`.
- **Ver como aluno:** em Participantes (ou na página de uma equipe), "👁 Ver como este
  aluno" abre a tela exatamente como aquele aluno vê, com os mesmos botões que ele tem,
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

No painel do Supabase → **SQL Editor**, rode, nesta ordem:

1. `supabase/schema.sql` — tabelas, funções, trigger e RLS.
2. `supabase/002_organizacao.sql` — notas, materiais e o RPC do gerador de equipes.
3. `supabase/003_lider_e_permissoes.sql` — líder da equipe; composição só pela organização.
4. `supabase/004_trava_lider.sql` — depois de definido, só o líder troca o líder.
5. `supabase/005_lider_edita_dados.sql` — só o líder altera nome e repositório da equipe.
6. `supabase/006_trocas.sql` — pedidos de troca de equipe.
7. `supabase/007_auditoria_trocas.sql` — histórico de trocas preservado + quem cancelou.
8. `supabase/008_avaliacao.sql` — módulo de avaliação (bancas).
9. `supabase/009_rubricas_v2.sql` — rubricas v2: fases 1 e 2 com pitch (professores) + mesa (organização).
10. `supabase/seed.sql` — os 55 inscritos ativos, as notas e o organizador inicial.

Todos podem ser rodados de novo sem problema. Se a lista de inscrições mudar:
`node supabase/gerar_seed.mjs "INSCRIÇÕES.txt" supabase/seed.sql`. Depois, novos
participantes e organizadores podem ser cadastrados direto pelo sistema.

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

## Estrutura

```
supabase/schema.sql        tabelas, RLS, trigger de lista de inscritos, RPC criar_equipe
supabase/seed.sql          inscritos (gerado de INSCRIÇÕES.txt — não versionar)
src/proxy.ts               renova sessão e manda para /login quem não está logado
src/app/login              tela de login (entrar / primeiro acesso / esqueci a senha)
src/app/auth/confirm       destino do link de redefinição de senha
src/app/nova-senha         define a nova senha
src/app/ver-como           organizador vê a tela de um aluno (somente leitura)
src/app/page.tsx           painel do aluno (minha equipe / criar equipe)
src/app/admin              área da organização (equipes, participantes, gerador, materiais, organizadores)
src/app/admin/equipes/[id] edição de qualquer equipe
src/lib/gerador.ts         algoritmo de formação de equipes (portado do datahack-equipes.html)
src/lib/rubricas.ts        rubricas do evento (GERADO de docs/rubricas_v2.json)
src/lib/nota.ts            cálculo da nota (rubrica, final, desempate)
src/app/avaliar            área das bancas (fichas de avaliação)
src/app/actions.ts         Server Actions (mutações)
src/components/            PainelEquipe, CriarEquipe, Formulario, Cabecalho, LoginSenha
```

## Observações

- Como o cadastro não exige confirmação por e-mail, quem souber o e-mail de um inscrito
  poderia criar a senha antes dele. Se acontecer, o dono usa "Esqueci a senha" (o link
  chega no e-mail dele) ou você apaga o usuário em Authentication → Users.
- A checagem de "repositório público" usa a API pública do GitHub (60 consultas/hora
  por IP do servidor). Ela não bloqueia a criação; só sinaliza.
