// Perguntas da ajuda por público (heurística 10). Texto simples, sem jargão.

export type Publico = "aluno" | "banca" | "organizacao";
export type Topico = { pergunta: string; resposta: string; publicos: Publico[] };

export const TOPICOS: Topico[] = [
  // ------------------------------------------------ aluno
  {
    pergunta: "Onde vejo a minha equipe?",
    resposta: "Na aba “Minha equipe”: colegas, líder, repositório no GitHub e links de entrega. Quem monta as equipes é a organização.",
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
      "Na aba “Trocas”, escolha a equipe e envie o pedido. Qualquer integrante da equipe de destino pode aceitar; quem aceitar troca de lugar com você. Você pode cancelar enquanto estiver pendente.",
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
    resposta: "Abra a equipe e use “Ver como este aluno”, ou procure “Ver como” na busca rápida (Ctrl+K). Tudo que você fizer na simulação fica registrado como organização.",
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
  // ------------------------------------------------ todos
  {
    pergunta: "Existe uma busca rápida?",
    resposta: "Sim: Ctrl+K (ou o botão de busca no topo) abre a busca de telas, equipes e pessoas.",
    publicos: ["aluno", "banca", "organizacao"],
  },
  {
    pergunta: "Esqueci a senha. E agora?",
    resposta: "Na tela de entrada, clique em “Esqueci a senha” e abra o link enviado ao seu e-mail, de preferência no mesmo navegador.",
    publicos: ["aluno", "banca", "organizacao"],
  },
];
