// Perguntas da ajuda por público (heurística 10). Texto simples, sem jargão.

export type Publico = "aluno" | "banca" | "mentoria" | "organizacao";
export type Topico = { pergunta: string; resposta: string; publicos: Publico[] };

export const TOPICOS: Topico[] = [
  // ------------------------------------------------ aluno
  {
    pergunta: "Onde vejo a minha equipe?",
    resposta: "Na aba “Minha equipe”: colegas, líder, repositório no GitHub e links de entrega. Dependendo da edição, quem monta as equipes é a organização ou os próprios alunos.",
    publicos: ["aluno"],
  },
  {
    pergunta: "Como monto a minha equipe (quando os alunos formam as equipes)?",
    resposta:
      "Em “Minha equipe”, dê um nome, convide os colegas e envie. Cada colega confirma no sistema; com todos confirmados, a organização aprova. Quem propõe começa como líder e pode desistir enquanto a proposta não for analisada.",
    publicos: ["aluno"],
  },
  {
    pergunta: "Recebi um convite para uma equipe. E agora?",
    resposta:
      "O convite aparece em “Minha equipe”. Confirme para entrar ou recuse. Enquanto o convite estiver aguardando, você não pode entrar em outra equipe.",
    publicos: ["aluno"],
  },
  {
    pergunta: "Como cadastro o repositório da equipe?",
    resposta:
      "O líder (ou a organização) cola o endereço do GitHub em “Dados da equipe”. O repositório precisa ser público; o sistema avisa se não conseguir abrir.",
    publicos: ["aluno", "organizacao"],
  },
  {
    pergunta: "Como envio o link do pitch, do dashboard ou do vídeo?",
    resposta: "Em “Links de entrega”, escolha o tipo, cole o link e salve. Dá para remover e desfazer logo em seguida.",
    publicos: ["aluno"],
  },
  {
    pergunta: "Quero mudar de equipe. Como faço?",
    resposta:
      "Na aba “Trocas” (quando a edição permite), escolha a equipe e envie o pedido. Qualquer integrante da equipe de destino pode aceitar; quem aceitar troca de lugar com você. Você pode cancelar enquanto estiver pendente.",
    publicos: ["aluno"],
  },
  {
    pergunta: "Por que não consigo editar nada?",
    resposta: "A organização bloqueia a edição no fim do prazo de entregas. Você continua vendo tudo; fale com a organização se precisar alterar algo.",
    publicos: ["aluno"],
  },
  {
    pergunta: "Onde estão os desafios e as bases de dados?",
    resposta: "Na aba “Materiais”. Os mais importantes também aparecem em destaque na tela da equipe.",
    publicos: ["aluno"],
  },
  // ------------------------------------------------ bancas
  {
    pergunta: "Como avalio uma equipe?",
    resposta:
      "Em “Avaliar”, abra a equipe e marque um nível em cada critério. A descrição de cada nível aparece no próprio botão. Salve ao final; dá para voltar e alterar enquanto a avaliação estiver aberta.",
    publicos: ["banca", "organizacao"],
  },
  {
    pergunta: "Posso salvar uma ficha pela metade?",
    resposta: "Pode. O sistema avisa quais critérios faltam e a ficha fica marcada como “incompleta” na lista até você terminar.",
    publicos: ["banca", "organizacao"],
  },
  {
    pergunta: "Existem atalhos de teclado na ficha?",
    resposta: "Sim: 1 a 4 marcam o nível do critério selecionado, ↑ e ↓ mudam de critério e Ctrl+S salva. Aperte “?” para ver todos os atalhos.",
    publicos: ["banca", "organizacao"],
  },
  {
    pergunta: "Como a nota final é calculada?",
    resposta:
      "Cada rubrica vale de 0 a 100 (peso do critério × nível). Com mais de um avaliador, usa-se a média por critério. As rubricas somam com os pesos do regulamento e as penalidades são descontadas. O botão “Como a nota é calculada?” mostra a regra completa.",
    publicos: ["banca", "organizacao"],
  },
  // ------------------------------------------------ organização
  {
    pergunta: "Como monto as equipes?",
    resposta:
      "Em Equipes → Gerador: escolha o tamanho, gere combinações equilibradas por semestre e nota, compare e cadastre a escolhida. Também dá para criar uma equipe à mão.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Como vejo exatamente o que um aluno vê?",
    resposta: "Em Pessoas (ou na equipe), abra a pessoa e use “Ver como”, ou procure “Ver como” na busca rápida (Ctrl+K). Vendo como aluno, o que você fizer fica registrado como organização; vendo como banca, as fichas ficam só para consulta.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Como encerro a avaliação?",
    resposta: "Na aba Avaliação, use “Encerrar avaliação”. As bancas passam a só consultar as fichas; a organização ainda edita e pode reabrir.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Como exporto as planilhas?",
    resposta: "Use o botão “Exportar” em Equipes (integrantes e links) ou em Avaliação (ranking, analítico, dados brutos e por avaliador). Os arquivos abrem direto no Excel.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Como mostro o ranking no telão?",
    resposta: "Na aba Ranking, escolha Top 3, Top 5 ou Todos e use o modo revelação: cada clique revela uma posição, da última para a primeira.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Como preparo a próxima edição do evento?",
    resposta:
      "Em Mais → Edições, crie a edição copiando o regulamento e a organização da anterior. Ajuste datas, formato e regras das equipes, cadastre alunos e bancas em Pessoas (com a edição nova escolhida no topo) e, quando o evento começar, use “Tornar a edição atual”.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Por que não existe “apagar”?",
    resposta:
      "Para nada se perder entre edições: remover uma equipe, um link, uma ficha ou uma pessoa arquiva o registro, e toda alteração fica no histórico. As listas mostram só o que está ativo.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "O que é o selo “Ausente” em Pessoas?",
    resposta:
      "É quem estava inscrito mas não compareceu ao evento (marcado na chamada, em Pessoas → Presença). A pessoa continua na edição, na equipe e no histórico: ausência não é remoção. Na Edição 1, os ausentes que estavam numa equipe saíram dela com o motivo “ausente”. Use o filtro “Ausentes no evento” para ver a lista.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Como confiro se as telas das bancas estão certas sem criar contas falsas?",
    resposta:
      "Em Pessoas, abra qualquer aluno ou avaliador e use “Ver como esta pessoa”. Você navega exatamente como ela; nas fichas das bancas nada é salvo durante a simulação.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Como monto o mapa do evento (croqui)?",
    resposta:
      "Em Mais → Mapa, crie cada sala com as medidas aproximadas e toque em “Desenhar”. Escolha um modelo pronto (bancada de laboratório para 2 equipes, mesa, porta, telão…) e arraste para o lugar; “Colocar uma fileira” põe várias bancadas numeradas de uma vez. O croqui para a universidade sai em “Croqui”, pronto para imprimir ou salvar em PDF.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Como coloco as equipes nas bancadas do mapa?",
    resposta:
      "Em Mapa → “Distribuir equipes”. No computador, arraste a equipe da lista até um lugar da bancada; no celular, toque na equipe e depois no lugar. Soltar num lugar ocupado troca as duas equipes. Toda mudança tem “Desfazer”, e o histórico de onde cada equipe esteve fica guardado. Para imprimir com as equipes: Croqui → “Com as equipes”.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Tenho um desenho no papel. Dá para importar?",
    resposta:
      "Sim, de dois jeitos. Em Mapa → “Importar um desenho”, copie as instruções, mande para uma IA junto com a foto do desenho e cole o JSON que ela devolver: o sistema confere antes de importar. Ou abra a sala e, em “Medidas e fundo da sala”, ponha a foto como fundo e desenhe as bancadas por cima. PDF não é lido direto: tire um print da planta.",
    publicos: ["organizacao"],
  },
  // ------------------------------------------------ mentoria
  {
    pergunta: "O que a mentoria vê no sistema?",
    resposta:
      "Em “Equipes”, todas as equipes da edição: integrantes, líder, quem está presente, repositório e links de entrega. Em “Pessoas”, os alunos com curso, equipe e presença. Notas e fichas das bancas ficam só com a organização e as bancas.",
    publicos: ["mentoria"],
  },
  {
    pergunta: "Como faço a chamada?",
    resposta:
      "Pela equipe: em “Equipes”, cada equipe tem os integrantes com “Presente” e “Ausente” e o atalho “Marcar todos presentes” (na organização, abra “Presença” no card da equipe). Pela lista: em “Pessoas”, use a busca e o filtro “Sem registro” para ver quem falta. Errou? Toque em “Desfazer” no aviso ou marque de novo.",
    publicos: ["mentoria", "organizacao"],
  },
  {
    pergunta: "Como atendo os pedidos de ajuda?",
    resposta:
      "Em “Chamados” aparecem as equipes que pediram ajuda, na ordem: problemas primeiro, depois quem espera há mais tempo, com o lugar no mapa. Toque em “Vou atender” (a equipe vê que você está indo) e, no fim, em “Resolvido”. Errou? Use “Desfazer”. O número ao lado de “Chamados” no menu mostra quantos estão esperando.",
    publicos: ["mentoria", "organizacao"],
  },
  {
    pergunta: "Marcar ausente tira o aluno da equipe?",
    resposta: "Não. Ausência só registra que ele não estava no evento: o aluno continua inscrito e na equipe. Mudanças de equipe são com a organização.",
    publicos: ["mentoria", "organizacao"],
  },
  {
    pergunta: "Como dou acesso a um mentor?",
    resposta:
      "Em Pessoas, cadastre a pessoa com a função “Mentoria” e o e-mail dela (com a edição certa escolhida no topo). No primeiro acesso ela cria a senha com esse e-mail. Para conferir o que ela vê, use “Ver como”.",
    publicos: ["organizacao"],
  },
  {
    pergunta: "Onde fica a minha equipe no evento?",
    resposta: "Em “Minha equipe”, abaixo do nome, aparece o lugar no mapa (sala e bancada), assim que a organização distribuir as equipes.",
    publicos: ["aluno"],
  },
  {
    pergunta: "Como peço ajuda durante o evento?",
    resposta:
      "Em “Minha equipe”, no quadro “Precisa de ajuda?”, toque em “Estamos com uma dúvida” ou “Estamos com um problema” (dá para deixar um recado). A mentoria vê na hora, com a bancada de vocês piscando no mapa. Quando alguém estiver a caminho, aparece o nome de quem vem. Resolveram sozinhos? Toque em “Já resolvemos”.",
    publicos: ["aluno"],
  },
  {
    pergunta: "Como escolho o ícone da equipe?",
    resposta: "O líder (ou a organização) abre “Minha equipe” e toca em “Escolher um ícone para a equipe”. O ícone aparece no mapa do evento e nos cards da equipe.",
    publicos: ["aluno", "organizacao"],
  },
  // ------------------------------------------------ todos
  {
    pergunta: "Existe uma busca rápida?",
    resposta: "Sim: Ctrl+K (ou o botão de busca no topo) abre a busca de telas, equipes e pessoas.",
    publicos: ["aluno", "banca", "mentoria", "organizacao"],
  },
  {
    pergunta: "Esqueci a senha. E agora?",
    resposta: "Na tela de entrada, clique em “Esqueci a senha” e abra o link enviado ao seu e-mail, de preferência no mesmo navegador.",
    publicos: ["aluno", "banca", "mentoria", "organizacao"],
  },
];
