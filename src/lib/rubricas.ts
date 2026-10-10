// ARQUIVO GERADO por scripts/gerar_rubricas.mjs a partir de docs/rubricas_v2.json
// (fonte: src/build_cronograma_rubrica.py). Não edite à mão: altere o Python e gere de novo.

/** Quem avalia: professores (pitches F1/F2), organização (mesa F1/F2 e F3) e negócio (pitch final). */
export type Banca = "professores" | "organizacao" | "negocio";
export type RubricaId = "F1_PITCH" | "F1_MESA" | "F2_PITCH" | "F2_MESA" | "F3_REPO" | "NEG";
export type FaseId = "F1" | "F2" | "F3" | "NEG";

export type Criterio = { id: string; nome: string; peso: number; descricao: string; niveis: string[] };
export type Rubrica = {
  id: RubricaId;
  fase: FaseId;
  parte: string;
  /** Rótulo curto para abas e tabelas (ex.: "F1 · Pitch"). */
  curto: string;
  nome: string;
  banca: Banca;
  bancaTexto: string;
  pesoFinal: number;
  momento: string;
  criterios: Criterio[];
};
export type Fase = { id: FaseId; nome: string; peso: number; partes: RubricaId[] };

/** Níveis de cada critério e o fator aplicado ao peso. */
export const NIVEIS = [
  {
    "nome": "Insuficiente",
    "fator": 0
  },
  {
    "nome": "Básico",
    "fator": 0.5
  },
  {
    "nome": "Proficiente",
    "fator": 0.8
  },
  {
    "nome": "Excelente",
    "fator": 1
  }
] as const;

export const RUBRICAS: Rubrica[] = [
  {
    "id": "F1_PITCH",
    "fase": "F1",
    "parte": "pitch",
    "curto": "F1 · Pitch",
    "nome": "Fase 1 · Pitch · Exploração e estratégia",
    "banca": "professores",
    "bancaTexto": "Banca de professores de tecnologia",
    "pesoFinal": 6,
    "momento": "10:45–11:45, pitch de 3 + 2 min",
    "criterios": [
      {
        "id": "problema",
        "nome": "Entendimento do desafio",
        "peso": 20,
        "descricao": "A equipe explica com as próprias palavras o que vai responder e por que isso importa.",
        "niveis": [
          "Não sabe dizer o que vai responder.",
          "Repete o enunciado, sem mostrar entendimento.",
          "Explica o problema e quais perguntas vai atacar primeiro.",
          "Explica o problema, prioriza as perguntas e diz o que espera encontrar."
        ]
      },
      {
        "id": "escolhas",
        "nome": "Justificativa das escolhas",
        "peso": 25,
        "descricao": "Consegue explicar, em linguagem clara, por que escolheu o banco, as ferramentas e a forma de organizar os dados.",
        "niveis": [
          "Não justifica (“porque sim”, “porque a IA sugeriu”).",
          "Justificativa genérica, sem ligação com os dados do desafio.",
          "Justifica cada escolha pelo volume, formato dos arquivos ou facilidade da equipe.",
          "Compara alternativas e explica o que perdeu e o que ganhou com cada escolha."
        ]
      },
      {
        "id": "raciocinio",
        "nome": "Raciocínio sobre os dados",
        "peso": 25,
        "descricao": "O que a equipe descobriu olhando os arquivos e que riscos ou armadilhas já percebeu.",
        "niveis": [
          "Ainda não olhou os dados.",
          "Descreve os arquivos, sem tirar conclusão.",
          "Aponta o que cada base tem, como elas se ligam e ao menos uma dificuldade.",
          "Antecipa armadilhas concretas e diz como vai lidar com cada uma."
        ]
      },
      {
        "id": "plano",
        "nome": "Plano para as próximas fases",
        "peso": 15,
        "descricao": "O plano é realista para o tempo do evento e está dividido entre os integrantes.",
        "niveis": [
          "Sem plano.",
          "Plano vago ou irreal para o tempo.",
          "Plano claro, com etapas e responsáveis.",
          "Plano claro, priorizado e com plano B se algo der errado."
        ]
      },
      {
        "id": "comunicacao",
        "nome": "Comunicação e domínio da equipe",
        "peso": 15,
        "descricao": "Clareza, uso do tempo e segurança nas respostas; o domínio é da equipe, não de uma pessoa só.",
        "niveis": [
          "Não se entende ou estoura o tempo.",
          "Compreensível, mas confuso ou dependente de uma pessoa.",
          "Claro, no tempo, responde bem às perguntas.",
          "Claro e seguro; qualquer integrante responde."
        ]
      }
    ]
  },
  {
    "id": "F1_MESA",
    "fase": "F1",
    "parte": "mesa",
    "curto": "F1 · Mesa",
    "nome": "Fase 1 · Mesa · Ambiente, exploração e estratégia",
    "banca": "organizacao",
    "bancaTexto": "Organizadores (avaliação técnica)",
    "pesoFinal": 9,
    "momento": "10:45–11:45, ~5 min na mesa + commit da Entrega 1",
    "criterios": [
      {
        "id": "ambiente",
        "nome": "Ambiente e repositório",
        "peso": 15,
        "descricao": "Montado no laboratório às 8h: repositório público com todos como colaboradores, estrutura inicial, banco escolhido instalado (local ou nuvem).",
        "niveis": [
          "Sem repositório funcional ou equipe sem acesso.",
          "Repositório existe, mas sem estrutura ou faltando integrantes.",
          "Repositório organizado, todos com acesso, banco instalado e acessível.",
          "Além disso, .gitignore correto (dados fora do Git) e README inicial com o plano."
        ]
      },
      {
        "id": "fontes",
        "nome": "Entendimento das fontes",
        "peso": 30,
        "descricao": "Identificou arquivos principais × cópias/apoio, formatos, dicionários, chaves e granularidade.",
        "niveis": [
          "Não sabe o que há nos zips nem qual arquivo usar.",
          "Sabe quais arquivos usar, mas não percebeu formatos/granularidade.",
          "Formatos (CSV ; latin-1, xlsx com cabeçalho fora da 1ª linha), chave CO_CURSO e granularidade (coorte; EAD por polo) entendidos.",
          "Além disso, aponta armadilhas (EAD duplicada por polo, coortes com tempos diferentes, valores que saltam num ano) antes de ingerir."
        ]
      },
      {
        "id": "exploratoria",
        "nome": "Análise exploratória",
        "peso": 25,
        "descricao": "Volumes, tipos, nulos, distribuições e anomalias iniciais, com evidência no repositório.",
        "niveis": [
          "Não fez exploração.",
          "Contou linhas/colunas, sem olhar qualidade.",
          "Tipos, nulos, valores suprimidos (--, SC) e distribuições das variáveis-chave.",
          "Exploração orientada às perguntas, com hipóteses e anomalias registradas."
        ]
      },
      {
        "id": "estrategia",
        "nome": "Estratégia de ingestão e transformação",
        "peso": 30,
        "descricao": "Banco/ferramenta, camadas, idempotência planejada, tipos e plano de junções, documentados (ex.: docs/estrategia.md).",
        "niveis": [
          "Sem estratégia.",
          "Estratégia genérica (“vamos jogar no banco”).",
          "Camadas (bruto → tratado → analítico), tipos (códigos como texto) e junções planejados.",
          "Além disso, idempotência explícita (como reexecutar sem duplicar), controle de carga e estimativa de volume."
        ]
      }
    ]
  },
  {
    "id": "F2_PITCH",
    "fase": "F2",
    "parte": "pitch",
    "curto": "F2 · Pitch",
    "nome": "Fase 2 · Pitch · Ingestão, transformação e protótipo",
    "banca": "professores",
    "bancaTexto": "Banca de professores de tecnologia",
    "pesoFinal": 8,
    "momento": "14:15–15:15, pitch de 3 + 2 min",
    "criterios": [
      {
        "id": "evolucao",
        "nome": "Evolução desde a Fase 1",
        "peso": 15,
        "descricao": "O que mudou no plano, o que deu errado e como a equipe resolveu.",
        "niveis": [
          "Não sabe dizer o que fez desde a Fase 1.",
          "Lista o que fez, sem refletir.",
          "Mostra o avanço e explica os ajustes de rota.",
          "Mostra o avanço, explica os ajustes e o que aprendeu com eles."
        ]
      },
      {
        "id": "pipeline",
        "nome": "Explicação do pipeline",
        "peso": 25,
        "descricao": "Explica, sem jargão desnecessário, o caminho do arquivo baixado até a tabela que responde às perguntas.",
        "niveis": [
          "Não consegue explicar.",
          "Explica partes soltas, sem o caminho completo.",
          "Explica o caminho completo, em ordem, de forma compreensível.",
          "Explica o caminho completo e como garante que os números estão certos."
        ]
      },
      {
        "id": "respostas",
        "nome": "Primeiras respostas",
        "peso": 25,
        "descricao": "Já existem números que respondem a alguma pergunta, com fonte e cuidado na interpretação.",
        "niveis": [
          "Nenhum número.",
          "Números sem dizer de onde vêm ou o que significam.",
          "Números para pelo menos 2 perguntas, com fonte e interpretação correta.",
          "Números para a maioria das perguntas, com ressalvas (associação ≠ causa, anual × turma)."
        ]
      },
      {
        "id": "dashboard",
        "nome": "Plano do dashboard",
        "peso": 20,
        "descricao": "O que o dashboard vai mostrar, para quem, e por que esses gráficos.",
        "niveis": [
          "Sem plano.",
          "Plano genérico (“vamos fazer uns gráficos”).",
          "Plano organizado pelas perguntas, com o público definido.",
          "Plano claro, com rascunho ou protótipo e escolhas de visualização justificadas."
        ]
      },
      {
        "id": "comunicacao",
        "nome": "Comunicação e domínio da equipe",
        "peso": 15,
        "descricao": "Clareza, uso do tempo e segurança nas respostas; o domínio é da equipe, não de uma pessoa só.",
        "niveis": [
          "Não se entende ou estoura o tempo.",
          "Compreensível, mas confuso ou dependente de uma pessoa.",
          "Claro, no tempo, responde bem às perguntas.",
          "Claro e seguro; qualquer integrante responde."
        ]
      }
    ]
  },
  {
    "id": "F2_MESA",
    "fase": "F2",
    "parte": "mesa",
    "curto": "F2 · Mesa",
    "nome": "Fase 2 · Mesa · Ingestão, transformação e protótipo",
    "banca": "organizacao",
    "bancaTexto": "Organizadores (avaliação técnica)",
    "pesoFinal": 12,
    "momento": "14:15–15:15, ~5 min na mesa + commit da Entrega 2",
    "criterios": [
      {
        "id": "ingestao",
        "nome": "Ingestão implementada",
        "peso": 25,
        "descricao": "Carga automatizada das bases necessárias no banco escolhido, vista funcionando na mesa.",
        "niveis": [
          "Sem ingestão, ou feita à mão (copiar/colar, importação manual).",
          "Parte das bases carregada, com passos manuais.",
          "Todas as bases necessárias carregadas por código, com encoding e cabeçalho corretos.",
          "Carga parametrizada, registro do que foi carregado (log/controle) e tratamento de erros."
        ]
      },
      {
        "id": "idempotencia",
        "nome": "Idempotência",
        "peso": 20,
        "descricao": "Rodar a carga/transformação de novo não duplica nem altera o resultado.",
        "niveis": [
          "Reexecutar duplica linhas ou quebra.",
          "Funciona só apagando tudo à mão antes.",
          "Reexecução segura (truncate-and-load, upsert ou controle de arquivos carregados).",
          "Além disso, demonstrou na mesa: rodou duas vezes e conferiu contagens iguais."
        ]
      },
      {
        "id": "transformacao",
        "nome": "Transformação e qualidade",
        "peso": 25,
        "descricao": "Limpeza, filtros, junções e checagens.",
        "niveis": [
          "Erros que mudam o resultado (códigos como número, nulos como zero, EAD somada sem agregar).",
          "Limpeza correta, mas sem checagens (taxa de junção, linhas antes/depois).",
          "Filtro de graduação, agregação por curso, junções com taxa de match, células < 10 suprimidas.",
          "Além disso, trata anomalias e tem checagens automatizadas."
        ]
      },
      {
        "id": "modelagem",
        "nome": "Modelagem e arquitetura",
        "peso": 15,
        "descricao": "Como os dados estão organizados para responder às perguntas.",
        "niveis": [
          "Tudo numa tabela só, sem critério.",
          "Tabelas separadas, sem lógica clara.",
          "Camadas definidas e modelo analítico que atende às perguntas (ex.: fatos por curso/coorte).",
          "Modelo justificado (granularidade, chaves), documentado em docs/arquitetura.md."
        ]
      },
      {
        "id": "prototipo",
        "nome": "Protótipo ligado aos dados",
        "peso": 15,
        "descricao": "O protótipo mostrado no pitch lê de fato das tabelas transformadas.",
        "niveis": [
          "Sem protótipo.",
          "Protótipo com números digitados ou de planilha à parte.",
          "Protótipo lê das tabelas do pipeline para pelo menos 2 perguntas.",
          "Protótipo ligado ao pipeline cobrindo a maioria das perguntas."
        ]
      }
    ]
  },
  {
    "id": "F3_REPO",
    "fase": "F3",
    "parte": "mesa",
    "curto": "F3 · Repositório",
    "nome": "Fase 3 · Repositório final e uso de IA",
    "banca": "organizacao",
    "bancaTexto": "Organizadores (avaliação técnica)",
    "pesoFinal": 25,
    "momento": "Em paralelo ao pitch final (17:15–19:15), no commit das 17:00",
    "criterios": [
      {
        "id": "reprodutibilidade",
        "nome": "Reprodutibilidade de ponta a ponta",
        "peso": 20,
        "descricao": "Seguindo o README, alguém de fora roda do zero e chega aos mesmos números.",
        "niveis": [
          "Não roda.",
          "Roda com ajustes (caminhos absolutos, dependências faltando, ordem não documentada).",
          "Roda do zero seguindo o README, e gera as extrações em outputs/ que alimentam o dashboard.",
          "Um comando (ou ordem numerada) roda tudo, do download ao dashboard; dependências fixadas; saídas determinísticas."
        ]
      },
      {
        "id": "codigo",
        "nome": "Qualidade do código e da arquitetura",
        "peso": 20,
        "descricao": "Organização, legibilidade, separação de etapas, coerência com a estratégia.",
        "niveis": [
          "Ilegível ou um notebook caótico.",
          "Organizado em partes, com muita repetição.",
          "Etapas separadas, nomes claros, comentários onde importa.",
          "Modular, limpo, coerente com a arquitetura documentada."
        ]
      },
      {
        "id": "corretude",
        "nome": "Corretude das respostas",
        "peso": 20,
        "descricao": "Os números do dashboard conferem com o código e com o gabarito da organização.",
        "niveis": [
          "Números errados ou não rastreáveis no código.",
          "Ordem de grandeza certa, erros de método.",
          "Números corretos para as perguntas obrigatórias.",
          "Corretos, incluindo bônus, com ressalvas metodológicas bem colocadas."
        ]
      },
      {
        "id": "ia",
        "nome": "Uso de IA e domínio técnico",
        "peso": 25,
        "descricao": "Pasta prompts/ completa e o que as conversas mostram sobre o conhecimento do aluno.",
        "niveis": [
          "Sem pasta prompts/, conversas omitidas, ou só pedidos de “faz pra mim”.",
          "Conversas presentes, mas o aluno só aceita respostas, sem demonstrar entendimento.",
          "Conversas mostram o aluno usando conceitos certos (ingestão, idempotência, chaves, camadas) e conferindo o que a IA gera.",
          "Aluno conduz a IA com domínio: compara abordagens, discute arquitetura, corrige erros da IA e registra as decisões."
        ]
      },
      {
        "id": "documentacao",
        "nome": "Validação e documentação",
        "peso": 15,
        "descricao": "Checagens, dicionário das variáveis criadas e decisões registradas.",
        "niveis": [
          "Sem documentação.",
          "README mínimo.",
          "README completo, variáveis derivadas explicadas, checagens registradas.",
          "Além disso, decisões e limitações documentadas e testes/asserts no código."
        ]
      }
    ]
  },
  {
    "id": "NEG",
    "fase": "NEG",
    "parte": "negocio",
    "curto": "Negócio",
    "nome": "Negócio · Pitch final",
    "banca": "negocio",
    "bancaTexto": "Jurados de negócio (3)",
    "pesoFinal": 40,
    "momento": "Pitch final (17:15–19:15)",
    "criterios": [
      {
        "id": "respondeu",
        "nome": "Respondeu às perguntas",
        "peso": 30,
        "descricao": "As perguntas do desafio (P1–P5) foram respondidas de forma direta, com número e fonte?",
        "niveis": [
          "Respondeu 0–1 pergunta, ou falou do tema sem responder.",
          "Respondeu 2–3 perguntas.",
          "Respondeu as 5 obrigatórias.",
          "Respondeu as 5 obrigatórias e ao menos 1 bônus (B1/B2)."
        ]
      },
      {
        "id": "solidez",
        "nome": "Clareza e solidez das respostas",
        "peso": 20,
        "descricao": "As respostas são claras, convincentes e mostram de onde vem cada número?",
        "niveis": [
          "Respostas vagas ou contraditórias.",
          "Respostas claras, mas sem mostrar de onde vêm.",
          "Claras e sustentadas por dados, com limitações citadas.",
          "Muito claras, sustentadas e com a dúvida certa levantada (o que os dados não dizem)."
        ]
      },
      {
        "id": "dashboard",
        "nome": "Dashboard e visualização",
        "peso": 20,
        "descricao": "O dashboard é fácil de entender, ajuda a responder às perguntas e funciona na sala da banca?",
        "niveis": [
          "Confuso, ou não abriu na sala da banca (só o plano B salvou parte).",
          "Funciona, mas é difícil de ler.",
          "Claro, organizado pelas perguntas, gráficos adequados.",
          "Claro, bonito e útil; dá vontade de usar."
        ]
      },
      {
        "id": "valor",
        "nome": "Valor e recomendações",
        "peso": 20,
        "descricao": "O que um gestor (IES, governo) faria com isso?",
        "niveis": [
          "Sem recomendação.",
          "Recomendações genéricas.",
          "Pelo menos uma recomendação concreta, ligada aos achados.",
          "Recomendações priorizadas, viáveis e com público definido."
        ]
      },
      {
        "id": "comunicacao",
        "nome": "Comunicação",
        "peso": 10,
        "descricao": "Narrativa no tempo e segurança nas respostas à banca.",
        "niveis": [
          "Estoura o tempo ou não se entende.",
          "Compreensível, desorganizado.",
          "Clara, no tempo, responde bem.",
          "Envolvente; todo o time domina o trabalho."
        ]
      }
    ]
  }
];

/** Fases (F1 = pitch + mesa, F2 = pitch + mesa, F3, Negócio) e o peso de cada uma na nota final. */
export const FASES: Fase[] = [
  {
    "id": "F1",
    "nome": "Fase 1 · Exploração e estratégia",
    "peso": 15,
    "partes": [
      "F1_PITCH",
      "F1_MESA"
    ]
  },
  {
    "id": "F2",
    "nome": "Fase 2 · Ingestão e protótipo",
    "peso": 20,
    "partes": [
      "F2_PITCH",
      "F2_MESA"
    ]
  },
  {
    "id": "F3",
    "nome": "Fase 3 · Repositório final",
    "peso": 25,
    "partes": [
      "F3_REPO"
    ]
  },
  {
    "id": "NEG",
    "nome": "Negócio · Pitch final",
    "peso": 40,
    "partes": [
      "NEG"
    ]
  }
];

/** Divisão das fases 1 e 2 entre pitch (professores) e mesa (organizadores), em %. */
export const DIVISAO_FASES_1_2 = {"mesa":60,"pitch":40};

export const BANCAS: Record<Banca, string> = {
  "professores": "Banca de professores de tecnologia",
  "organizacao": "Organizadores (avaliação técnica)",
  "negocio": "Jurados de negócio (3)"
};

export const PENALIDADES: { id: string; pontos: number; texto: string }[] = [
  {
    "id": "causalidade",
    "pontos": -5,
    "texto": "Afirmar causalidade (“X causa evasão”) em vez de associação."
  },
  {
    "id": "celulas",
    "pontos": -3,
    "texto": "Expor células com menos de 10 alunos em tabela ou gráfico."
  },
  {
    "id": "acesso",
    "pontos": -5,
    "texto": "Repositório ou link do pitch sem acesso na hora da entrega (10 min de tolerância para corrigir)."
  },
  {
    "id": "planob",
    "pontos": -3,
    "texto": "Entrega final sem plano B (PDF/vídeo do dashboard)."
  },
  {
    "id": "tempo",
    "pontos": -2,
    "texto": "Estourar em mais de 1 min o tempo do pitch final."
  }
];

export const DESCLASSIFICACAO = "Sem entrega final até 17:00, plágio entre equipes ou dados que não sejam públicos.";
export const DESEMPATE: string[] = [
  "Maior nota na rubrica F3 · Repositório final.",
  "Maior nota em “Respondeu às perguntas” (Negócio).",
  "Maior nota em “Idempotência” (F2 · Mesa).",
  "Persistindo, decisão conjunta das bancas."
];
export const FORMULA = "Nota final = 6% × F1_PITCH + 9% × F1_MESA + 8% × F2_PITCH + 12% × F2_MESA + 25% × F3_REPO + 40% × NEG + penalidades";
