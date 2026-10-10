// ARQUIVO GERADO por scripts/gerar_rubricas.mjs a partir de docs/rubricas.json
// (fonte: src/build_cronograma_rubrica.py). Não edite à mão: altere o Python e gere de novo.

export type Banca = "tecnica" | "negocio";
export type RubricaId = "TEC_F1" | "TEC_F2" | "TEC_F3" | "NEG";

export type Criterio = { id: string; nome: string; peso: number; descricao: string; niveis: string[] };
export type Rubrica = {
  id: RubricaId;
  nome: string;
  banca: Banca;
  bancaTexto: string;
  pesoFinal: number;
  momento: string;
  criterios: Criterio[];
};

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
    "id": "TEC_F1",
    "nome": "Técnica · Fase 1 · Exploração e estratégia",
    "banca": "tecnica",
    "bancaTexto": "técnica (organização)",
    "pesoFinal": 15,
    "momento": "Micro-pitch 1 (10:45–11:45) + commit da Entrega 1",
    "criterios": [
      {
        "id": "ambiente",
        "nome": "Ambiente e repositório",
        "peso": 10,
        "descricao": "Montado no laboratório às 8h: repositório público com todos como colaboradores, estrutura inicial, banco escolhido instalado (local ou nuvem).",
        "niveis": [
          "Sem repositório funcional ou equipe sem acesso.",
          "Repositório existe, mas sem estrutura ou faltando integrantes.",
          "Repositório organizado, todos com acesso, banco instalado.",
          "Além disso, .gitignore correto (dados fora do Git) e README inicial com o plano."
        ]
      },
      {
        "id": "fontes",
        "nome": "Entendimento das fontes",
        "peso": 25,
        "descricao": "Identificou arquivos principais × cópias/apoio, formatos, dicionários, chaves e granularidade.",
        "niveis": [
          "Não sabe o que há nos zips nem qual arquivo usar.",
          "Sabe quais arquivos usar, mas não percebeu formatos/granularidade.",
          "Formatos (CSV ; latin-1, xlsx com cabeçalho na linha 9), chave CO_CURSO e granularidade (coorte; EAD por polo) entendidos.",
          "Além disso, aponta armadilhas (EAD duplicada por polo, coortes com tempos diferentes, salto de 2023) antes de ingerir."
        ]
      },
      {
        "id": "exploratoria",
        "nome": "Análise exploratória",
        "peso": 25,
        "descricao": "Volumes, tipos, nulos, distribuições e anomalias iniciais.",
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
        "peso": 25,
        "descricao": "Escolha do banco/ferramenta justificada, camadas, idempotência planejada, tipos e plano de junções.",
        "niveis": [
          "Sem estratégia.",
          "Estratégia genérica (“vamos jogar no banco”).",
          "Banco justificado, camadas (bruto → tratado → analítico), tipos (códigos como texto) e junções planejados.",
          "Além disso, idempotência explícita (como reexecutar sem duplicar), controle de carga e estimativa de volume."
        ]
      },
      {
        "id": "pitch1",
        "nome": "Clareza do micro-pitch",
        "peso": 15,
        "descricao": "Explicou em 3 minutos o que encontrou e o que vai fazer.",
        "niveis": [
          "Não se entende o plano.",
          "Plano compreensível, mas confuso.",
          "Claro, objetivo, respondeu às perguntas.",
          "Claro e convincente; todos dominam o plano."
        ]
      }
    ]
  },
  {
    "id": "TEC_F2",
    "nome": "Técnica · Fase 2 · Ingestão, transformação e protótipo",
    "banca": "tecnica",
    "bancaTexto": "técnica (organização)",
    "pesoFinal": 20,
    "momento": "Micro-pitch 2 (14:15–15:15) + commit da Entrega 2",
    "criterios": [
      {
        "id": "ingestao",
        "nome": "Ingestão implementada",
        "peso": 20,
        "descricao": "Carga automatizada das bases necessárias no banco escolhido.",
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
          "Além disso, demonstrou: rodou duas vezes e conferiu contagens iguais."
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
          "Além disso, trata anomalias (salto de 2023) e tem checagens automatizadas."
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
        "nome": "Protótipo do dashboard",
        "peso": 20,
        "descricao": "Primeiras respostas visíveis e plano do que o dashboard vai mostrar.",
        "niveis": [
          "Nada para mostrar.",
          "Rascunho sem ligação clara com as perguntas.",
          "Primeiros números/gráficos de pelo menos 2 perguntas e plano do dashboard final.",
          "Protótipo funcional ligado ao banco, cobrindo a maioria das perguntas."
        ]
      }
    ]
  },
  {
    "id": "TEC_F3",
    "nome": "Técnica · Fase 3 · Repositório final e uso de IA",
    "banca": "tecnica",
    "bancaTexto": "técnica (organização)",
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
    "nome": "Negócio · Pitch final",
    "banca": "negocio",
    "bancaTexto": "jurados de negócio (3)",
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
  "Maior nota na rubrica Técnica F3.",
  "Maior nota em “Respondeu às perguntas” (Negócio).",
  "Maior nota em “Idempotência” (Técnica F2).",
  "Persistindo, decisão conjunta das bancas."
];
export const FORMULA = "Nota final = 15% × TEC_F1 + 20% × TEC_F2 + 25% × TEC_F3 + 40% × NEG + penalidades";
