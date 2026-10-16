// Perguntas da ajuda, por módulo e por público (heurística 10). Texto simples, sem jargão.
// Cada perfil vê o que é dele; a organização vê tudo (para poder orientar todo mundo).

export type Publico = "participante" | "banca" | "mentoria" | "organizacao";
export type Modulo = "Primeiros passos" | "Inscrição" | "Equipe" | "Durante o evento" | "Check-in" | "Avaliação" | "Mapa" | "Edições e configuração" | "Pessoas" | "Conta e sistema";
/** `so`: o tópico só aparece se a edição tiver o recurso (ex.: trocas de equipe). */
export type Topico = { pergunta: string; resposta: string; publicos: Publico[]; modulo: Modulo; so?: "trocas" };

/** Ordem dos módulos na tela. */
export const MODULOS: Modulo[] = ["Primeiros passos", "Inscrição", "Equipe", "Durante o evento", "Check-in", "Avaliação", "Mapa", "Pessoas", "Edições e configuração", "Conta e sistema"];

export const ROTULO_PUBLICO: Record<Publico, string> = { participante: "Participantes", banca: "Bancas", mentoria: "Mentoria", organizacao: "Organização" };

const TODOS: Publico[] = ["participante", "banca", "mentoria", "organizacao"];

export const TOPICOS: Topico[] = [
  // ------------------------------------------------ primeiros passos
  {
    modulo: "Primeiros passos",
    pergunta: "O que tem em cada tela?",
    resposta:
      "No menu de cima (no celular, na barra de baixo) ficam as telas do seu perfil. Participante: Minha equipe, Trocas (se a edição permitir), Materiais e Ajuda. Mentoria: Equipes, Pessoas, Chamados e Check-in. Bancas: Avaliar. Organização: Participantes, Durante o evento e Configurar. Em várias telas o botão “Ajuda” explica a tela aberta.",
    publicos: TODOS,
  },
  {
    modulo: "Primeiros passos",
    pergunta: "As telas se atualizam sozinhas?",
    resposta:
      "Sim. Quando algo muda (uma inscrição nova, um convite, um pedido de ajuda, a presença confirmada), a tela se atualiza na hora e aparece um aviso no canto, às vezes com o botão “Ver”. Se você estiver digitando ou com uma janela aberta, a tela espera você terminar.",
    publicos: TODOS,
  },
  {
    modulo: "Primeiros passos",
    pergunta: "Participei de uma edição anterior. Ainda consigo entrar?",
    resposta:
      "Sim, o seu login vale sempre. Você vê as edições de que participou (só para consulta) e, em “Suas edições”, a edição que está acontecendo agora. Se ainda não participa dela e as inscrições estiverem abertas, dá para se inscrever com a mesma conta. Uma faixa no topo avisa quando a edição aberta não é a atual.",
    publicos: ["participante", "banca", "mentoria"],
  },
  {
    modulo: "Primeiros passos",
    pergunta: "Como troco de edição?",
    resposta:
      "Pelo menu de edições no topo (com a logo e a cor de cada uma). A organização troca para administrar outra edição; os demais, para consultar as edições de que participaram. Trocar aqui muda só o que você vê.",
    publicos: TODOS,
  },

  // ------------------------------------------------ inscrição
  {
    modulo: "Inscrição",
    pergunta: "Como me inscrevo numa edição?",
    resposta:
      "Pelo link de inscrição que a organização divulga (ele também aparece na tela de entrada quando as inscrições estão abertas). Preencha nome e sobrenome, e-mail, uma senha e as perguntas da edição, leia o termo de uso dos dados até o fim e marque que aceita. Já participou de outra edição? Use o mesmo e-mail e a mesma senha.",
    publicos: ["participante", "organizacao"],
  },
  {
    modulo: "Inscrição",
    pergunta: "Quando as inscrições ficam abertas?",
    resposta:
      "Só na edição atual e dentro do prazo definido pela organização. Antes disso a página diz “As inscrições ainda não foram abertas” (ou a data em que abrem); depois do prazo, ou com a edição concluída, “As inscrições estão encerradas”.",
    publicos: ["participante", "organizacao"],
  },
  {
    modulo: "Inscrição",
    pergunta: "Como acompanho a minha inscrição?",
    resposta:
      "Entre com o seu e-mail e senha: a tela “Minha inscrição” mostra a situação (em análise, aprovada, lista de espera, com a sua posição na fila). Ela se atualiza sozinha quando a organização decide. Aprovada, é só entrar no sistema do evento.",
    publicos: ["participante"],
  },
  {
    modulo: "Inscrição",
    pergunta: "Por que preciso rolar o termo até o fim?",
    resposta: "Para garantir que você leu como os seus dados serão usados antes de aceitar. O “Li e aceito” libera quando você chega ao fim do texto.",
    publicos: ["participante", "organizacao"],
  },
  {
    modulo: "Inscrição",
    pergunta: "Como funciona a inscrição pública (evento aberto ou de várias instituições)?",
    resposta:
      "Em Participantes → Inscrições fica o link da página de inscrição da edição, para divulgar. A pessoa preenche nome, e-mail, uma senha e as perguntas do formulário, e já fica logada para acompanhar. Com aprovação automática, quem tem vaga entra na hora e o resto vai para a lista de espera (quando alguém cancela, o primeiro da fila entra). Com aprovação pela organização, cada inscrição espera em Inscrições até alguém aprovar, recusar ou pôr na espera. Nova inscrição chega com aviso na tela.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Inscrição",
    pergunta: "Como mudo para aprovar as inscrições à mão?",
    resposta:
      "Em Configurar → Edições, no quadro “Inscrições” da edição, troque “Aprovação” para “Pela organização”. Vale para as próximas inscrições; as que já entraram continuam como estão. No mesmo quadro ficam as vagas e o prazo (abrem em / fecham em).",
    publicos: ["organizacao"],
  },
  {
    modulo: "Inscrição",
    pergunta: "Como escolho o que perguntar na inscrição?",
    resposta:
      "Em Configurar → Formulário de inscrição. Comece de um modelo (Universidade ou Evento aberto) ou adicione perguntas prontas (curso, semestre, cargo, camiseta, restrição alimentar…) e crie as suas. Para cada uma, escolha se é obrigatória ou opcional, a ordem e o tipo (texto, lista, número…). A prévia ao lado mostra o formulário como o candidato vê. Cada edição tem o seu formulário.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Inscrição",
    pergunta: "Onde cadastro o termo de uso dos dados (LGPD)?",
    resposta:
      "Em Participantes → Inscrições, no fim da página, em “Termo de uso dos dados”. Cada vez que você salva um texto diferente, vira uma nova versão, e o sistema guarda qual versão cada pessoa aceitou. Com termo cadastrado, a pergunta pronta “Li e aceito o uso dos meus dados” não aparece: o aceite do termo vale por ela.",
    publicos: ["organizacao"],
  },

  // ------------------------------------------------ equipe
  {
    modulo: "Equipe",
    pergunta: "Onde vejo a minha equipe?",
    resposta: "Na aba “Minha equipe”: colegas, líder, repositório no GitHub e links de entrega. Dependendo da edição, quem monta as equipes é a organização ou os próprios participantes.",
    publicos: ["participante"],
  },
  {
    modulo: "Equipe",
    pergunta: "Como monto a minha equipe (quando os participantes formam as equipes)?",
    resposta:
      "Em “Minha equipe”, dê um nome, convide os colegas e envie. Cada colega confirma no sistema; com todos confirmados, a organização aprova. Quem propõe começa como líder e pode desistir enquanto a proposta não for analisada. Você recebe um aviso na tela quando a organização decidir.",
    publicos: ["participante"],
  },
  {
    modulo: "Equipe",
    pergunta: "Recebi um convite para uma equipe. E agora?",
    resposta: "O convite aparece em “Minha equipe” (e chega com aviso na tela). Confirme para entrar ou recuse. Enquanto o convite estiver aguardando, você não pode entrar em outra equipe.",
    publicos: ["participante"],
  },
  {
    modulo: "Equipe",
    pergunta: "Como cadastro o repositório da equipe?",
    resposta: "O líder (ou a organização) cola o endereço do GitHub em “Dados da equipe”. O repositório precisa ser público; o sistema avisa se não conseguir abrir.",
    publicos: ["participante", "organizacao"],
  },
  {
    modulo: "Equipe",
    pergunta: "Como envio o link do pitch, do dashboard ou do vídeo?",
    resposta: "Em “Links de entrega”, escolha o tipo, cole o link e salve. Dá para remover e desfazer logo em seguida.",
    publicos: ["participante", "organizacao"],
  },
  {
    modulo: "Equipe",
    pergunta: "Como escolho o ícone da equipe?",
    resposta: "O líder (ou a organização) abre “Minha equipe” e toca em “Escolher um ícone para a equipe”. O ícone aparece no mapa do evento e nos cards da equipe.",
    publicos: ["participante", "organizacao"],
  },
  {
    modulo: "Equipe",
    pergunta: "Quero mudar de equipe. Como faço?",
    resposta:
      "Na aba “Trocas”, escolha a equipe e envie o pedido. Qualquer integrante da equipe de destino pode aceitar; quem aceitar troca de lugar com você. Você pode cancelar enquanto estiver pendente, e recebe um aviso quando o pedido for respondido.",
    publicos: ["participante"],
    so: "trocas",
  },
  {
    modulo: "Equipe",
    pergunta: "Por que não consigo editar nada?",
    resposta: "A organização bloqueia a edição no fim do prazo de entregas, e as edições anteriores ficam só para consulta. Você continua vendo tudo; fale com a organização se precisar alterar algo.",
    publicos: ["participante"],
  },
  {
    modulo: "Equipe",
    pergunta: "Como monto as equipes?",
    resposta:
      "Em Equipes → Gerador: escolha o tamanho, gere combinações equilibradas por semestre e nota, compare e cadastre a escolhida. Também dá para criar uma equipe à mão. Se os participantes propõem as equipes, as propostas chegam em Equipes → Propostas (com aviso na tela) e o painel mostra quem já convidou, quem foi convidado e quem está livre.",
    publicos: ["organizacao"],
  },

  // ------------------------------------------------ durante o evento
  {
    modulo: "Durante o evento",
    pergunta: "Onde estão os desafios e as bases de dados?",
    resposta: "Na aba “Materiais”. Os mais importantes também aparecem em destaque na tela da equipe. Material novo chega com aviso.",
    publicos: ["participante"],
  },
  {
    modulo: "Durante o evento",
    pergunta: "Onde fica a minha equipe no evento?",
    resposta: "Em “Minha equipe”, abaixo do nome, aparece o lugar no mapa (sala e bancada), assim que a organização distribuir as equipes.",
    publicos: ["participante"],
  },
  {
    modulo: "Durante o evento",
    pergunta: "Como peço ajuda durante o evento?",
    resposta:
      "Em “Minha equipe”, no quadro “Precisa de ajuda?”, toque em “Estamos com uma dúvida” ou “Estamos com um problema” (dá para deixar um recado). A mentoria vê na hora, com a bancada de vocês piscando no mapa. Quando alguém estiver a caminho, aparece um aviso e o nome de quem vem. Resolveram sozinhos? Toque em “Já resolvemos”.",
    publicos: ["participante"],
  },
  {
    modulo: "Durante o evento",
    pergunta: "Como atendo os pedidos de ajuda?",
    resposta:
      "Em “Chamados” aparecem as equipes que pediram ajuda, na ordem: problemas primeiro, depois quem espera há mais tempo, com o lugar no mapa. Pedido novo chega com aviso. Toque em “Vou atender” (a equipe vê que você está indo) e, no fim, em “Resolvido”. Errou? Use “Desfazer”. Os pedidos resolvidos ou cancelados ficam na aba “Encerrados”, com quem atendeu e quanto tempo levou; dá para reabrir um resolvido por engano.",
    publicos: ["mentoria", "organizacao"],
  },
  {
    modulo: "Durante o evento",
    pergunta: "O que a mentoria vê no sistema?",
    resposta:
      "Em “Equipes”, todas as equipes da edição: integrantes, líder, quem está presente, repositório e links de entrega. Em “Pessoas”, os participantes com curso, equipe e presença. Notas e fichas das bancas ficam só com a organização e as bancas.",
    publicos: ["mentoria", "organizacao"],
  },
  {
    modulo: "Durante o evento",
    pergunta: "Como cadastro os materiais (desafios, bases)?",
    resposta: "Em Durante o evento → Materiais: título, link e categoria. Marque “destaque” para aparecer também na tela da equipe. Os participantes recebem um aviso quando entra material novo.",
    publicos: ["organizacao"],
  },

  // ------------------------------------------------ check-in
  {
    modulo: "Check-in",
    pergunta: "Onde está o meu QR code de entrada?",
    resposta:
      "No topo de “Minha equipe”, na edição atual. Mostre o QR na porta (ou diga o código de 8 letras que aparece embaixo dele). Quando a entrada for marcada, o QR some e aparece “Presença confirmada”, na hora. Dica: tire um print antes de chegar, caso a internet esteja ruim.",
    publicos: ["participante"],
  },
  {
    modulo: "Check-in",
    pergunta: "Como funciona o check-in por QR code?",
    resposta:
      "Na porta, a mentoria ou a organização abre Check-in, toca em “Abrir câmera” e aponta para o QR do participante: a tela mostra o nome, a equipe e marca a presença na hora (verde), ou avisa que a pessoa já tinha entrado (azul). Se a câmera não ler, dá para digitar o código de 8 letras. Na aba “Lista” ficam todos os participantes: quem entrou (com horário e quem marcou), quem está faltando (dá para marcar ali) e quem foi marcado ausente; ela se atualiza sozinha a cada leitura.",
    publicos: ["organizacao", "mentoria"],
  },
  {
    modulo: "Check-in",
    pergunta: "Como faço a chamada sem QR?",
    resposta:
      "Pela equipe: em “Equipes”, cada equipe tem os integrantes com “Presente” e “Ausente” e o atalho “Marcar todos presentes” (na organização, abra “Presença” no card da equipe). Pela lista: em “Pessoas”, use a busca e o filtro “Sem registro” para ver quem falta. Errou? Toque em “Desfazer” no aviso ou marque de novo.",
    publicos: ["mentoria", "organizacao"],
  },
  {
    modulo: "Check-in",
    pergunta: "Marcar ausente tira o participante da equipe?",
    resposta: "Não. Ausência só registra que a pessoa não estava no evento: ela continua inscrita e na equipe. Mudanças de equipe são com a organização.",
    publicos: ["mentoria", "organizacao"],
  },
  {
    modulo: "Check-in",
    pergunta: "O que é o selo “Ausente” em Pessoas?",
    resposta:
      "É quem estava inscrito mas não compareceu ao evento (marcado na chamada ou no check-in). A pessoa continua na edição, na equipe e no histórico: ausência não é remoção. Use o filtro “Ausentes no evento” para ver a lista.",
    publicos: ["organizacao"],
  },

  // ------------------------------------------------ avaliação
  {
    modulo: "Avaliação",
    pergunta: "Como avalio uma equipe?",
    resposta:
      "Em “Avaliar”, abra a equipe e marque um nível em cada critério. A descrição de cada nível aparece no próprio botão. Salve ao final; dá para voltar e alterar enquanto a avaliação estiver aberta.",
    publicos: ["banca", "organizacao"],
  },
  {
    modulo: "Avaliação",
    pergunta: "Posso salvar uma ficha pela metade?",
    resposta: "Pode. O sistema avisa quais critérios faltam e a ficha fica marcada como “incompleta” na lista até você terminar.",
    publicos: ["banca", "organizacao"],
  },
  {
    modulo: "Avaliação",
    pergunta: "Existem atalhos de teclado na ficha?",
    resposta: "Sim: 1 a 4 marcam o nível do critério selecionado, ↑ e ↓ mudam de critério e Ctrl+S salva. Aperte “?” para ver todos os atalhos.",
    publicos: ["banca", "organizacao"],
  },
  {
    modulo: "Avaliação",
    pergunta: "Como a nota final é calculada?",
    resposta:
      "Cada rubrica vale de 0 a 100 (peso do critério × nível). Com mais de um avaliador, usa-se a média por critério. As rubricas somam com os pesos do regulamento e as penalidades são descontadas. O botão “Como a nota é calculada?” mostra a regra completa.",
    publicos: ["banca", "organizacao", "participante"],
  },
  {
    modulo: "Avaliação",
    pergunta: "Como encerro a avaliação?",
    resposta: "Na aba Avaliação, use “Encerrar avaliação”. As bancas passam a só consultar as fichas; a organização ainda edita e pode reabrir. As notas aparecem na Avaliação e no Ranking conforme as bancas lançam.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Avaliação",
    pergunta: "Como mostro o ranking no telão?",
    resposta: "Na aba Ranking, escolha Top 3, Top 5 ou Todos e use o modo revelação: cada clique revela uma posição, da última para a primeira.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Avaliação",
    pergunta: "Como exporto as planilhas?",
    resposta: "Use o botão “Exportar” em Equipes (integrantes e links) ou em Avaliação (ranking, analítico, dados brutos e por avaliador). Os arquivos abrem direto no Excel.",
    publicos: ["organizacao"],
  },

  // ------------------------------------------------ mapa
  {
    modulo: "Mapa",
    pergunta: "Como monto o mapa do evento (croqui)?",
    resposta:
      "Em Durante o evento → Mapa (no celular, Mais → Mapa), crie cada sala com as medidas aproximadas e toque em “Desenhar” (o editor ocupa a tela toda). Escolha um modelo pronto (bancada de laboratório para 2 equipes, mesa, porta, telão…), arraste para o lugar e puxe as alças para o tamanho que quiser. Para mexer em vários de uma vez: Shift ou Ctrl + clique, um retângulo no vazio ou “Selecionar vários”. Zoom: roda do mouse, pinça com dois dedos ou os botões no canto (0 ajusta à tela); para mover a vista, segure Espaço e arraste, use a “Mão” ou dois dedos. Salas iguais? Desenhe uma e use “Duplicar sala”. O croqui sai em “Croqui”, pronto para imprimir ou salvar em PDF.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Mapa",
    pergunta: "Como coloco as equipes nas bancadas do mapa?",
    resposta:
      "Em Mapa → “Distribuir equipes”. No computador, arraste a equipe da lista até um lugar da bancada; no celular, toque na equipe e depois no lugar. Soltar num lugar ocupado troca as duas equipes. Toda mudança tem “Desfazer”, e o histórico de onde cada equipe esteve fica guardado. A equipe recebe um aviso com o lugar dela. Para imprimir com as equipes: Croqui → “Com as equipes”.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Mapa",
    pergunta: "Tenho um desenho no papel. Dá para importar?",
    resposta:
      "Sim, de dois jeitos. Em Mapa → “Importar um desenho”, copie as instruções, mande para uma IA junto com a foto do desenho e cole o JSON que ela devolver: o sistema confere antes de importar. Ou abra a sala e, em “Medidas e fundo da sala”, ponha a foto como fundo e desenhe as bancadas por cima. PDF não é lido direto: tire um print da planta.",
    publicos: ["organizacao"],
  },

  // ------------------------------------------------ pessoas
  {
    modulo: "Pessoas",
    pergunta: "Como vejo exatamente o que um participante vê?",
    resposta:
      "Em Pessoas (ou na equipe), abra a pessoa e use “Ver como”, ou procure “Ver como” na busca rápida (Ctrl+K). Vendo como participante, o que você fizer fica registrado como organização; vendo como banca, as fichas ficam só para consulta. Dá para conferir as telas de bancas e mentoria sem criar contas falsas.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Pessoas",
    pergunta: "Como dou acesso a um mentor ou a uma banca?",
    resposta:
      "Em Pessoas, cadastre a pessoa com a função certa (Mentoria, Banca técnica, Banca de negócio…) e o e-mail dela, com a edição certa escolhida no topo. No primeiro acesso ela cria a senha com esse e-mail. Para conferir o que ela vê, use “Ver como”.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Pessoas",
    pergunta: "Por que não existe “apagar”?",
    resposta:
      "Para nada se perder entre edições: remover uma equipe, um link, uma ficha ou uma pessoa arquiva o registro, e toda alteração fica no histórico. As listas mostram só o que está ativo.",
    publicos: ["organizacao"],
  },

  // ------------------------------------------------ edições e configuração
  {
    modulo: "Edições e configuração",
    pergunta: "Como preparo a próxima edição do evento?",
    resposta:
      "Em Configurar → Edições → “Nova edição”, crie a edição copiando o regulamento e a organização da anterior. Ajuste datas, formato e regras das equipes, cadastre participantes e bancas em Pessoas (com a edição nova escolhida no topo) e, quando o evento começar, use “Tornar a edição atual”. Só a edição atual recebe inscrições pelo site.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Edições e configuração",
    pergunta: "Como faço um evento de outra instituição, de várias ou aberto a todos?",
    resposta:
      "Em Configurar → Edições → “Acesso e marca da edição”, escolha quem pode participar: fechado (lista da organização), instituições escolhidas ou aberto a todos. Marque as instituições (cadastradas em Configurar → Instituições) e dê à edição um nome público, uma cor e uma logo (PNG, JPG ou SVG). A cor pinta o sistema inteiro (claro e escuro) e a logo aparece no topo das telas, no login e no menu de edições.",
    publicos: ["organizacao"],
  },
  {
    modulo: "Edições e configuração",
    pergunta: "Como cadastro as fases e as rubricas de uma edição?",
    resposta:
      "Em Configurar → Regulamento. Toque em “Copiar instruções para a IA”, mande para uma IA dizendo como serão as fases, as bancas e o que avaliar (ou escolha “Começar de um modelo”) e cole o JSON que ela devolver. O sistema confere a estrutura e os pesos antes de gravar. Enquanto não houver fichas, dá para trocar o regulamento quantas vezes precisar; o anterior fica no histórico.",
    publicos: ["organizacao"],
  },

  // ------------------------------------------------ conta e sistema
  {
    modulo: "Conta e sistema",
    pergunta: "Existe uma busca rápida?",
    resposta: "Sim: Ctrl+K (ou o botão de busca no topo) abre a busca de telas, equipes e pessoas.",
    publicos: TODOS,
  },
  {
    modulo: "Conta e sistema",
    pergunta: "Esqueci a senha. E agora?",
    resposta: "Na tela de entrada, clique em “Esqueci a senha” e abra o link enviado ao seu e-mail, de preferência no mesmo navegador.",
    publicos: TODOS,
  },
  {
    modulo: "Conta e sistema",
    pergunta: "Como mudo para o tema escuro?",
    resposta: "Pelo botão de sol/lua no topo. As cores seguem a cor da edição nos dois temas.",
    publicos: TODOS,
  },
];
