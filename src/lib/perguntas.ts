/** Perguntas do desafio "Rota do Diploma" (as mesmas do dashboard dos alunos). */
export type Pergunta = {
  id: string;
  obrigatoria: boolean;
  titulo: string;
  texto: string;
  bases: string;
  colunas: string[];
};

export const PERGUNTAS: Pergunta[] = [
  {
    id: "P1",
    obrigatoria: true,
    titulo: "Quanto da turma fica pelo caminho?",
    texto:
      "Dos ingressantes de 2015 nos cursos presenciais de graduação de Mato Grosso, que percentual desistiu, concluiu e ainda estava no curso em 2024? Em que ano do curso a perda é maior?",
    bases: "Indicadores de Trajetória (coorte 2015)",
    colunas: ["TDA", "TCA", "TAP", "NU_ANO_REFERENCIA", "QT_INGRESSANTE"],
  },
  {
    id: "P2",
    obrigatoria: true,
    titulo: "Onde a rota mais se perde?",
    texto:
      "Quais cursos (rótulo CINE) e áreas têm a maior e a menor desistência acumulada em MT? Compare pelo menos uma coorte mais recente pelo mesmo ano do curso.",
    bases: "Indicadores de Trajetória (coortes 2015–2020)",
    colunas: ["NO_CINE_ROTULO", "NO_CINE_AREA_GERAL", "TDA", "QT_INGRESSANTE"],
  },
  {
    id: "P3",
    obrigatoria: true,
    titulo: "Pública × privada, presencial × EAD",
    texto:
      "Como a evasão anual e a distribuição das matrículas variam entre rede pública e privada (com e sem fins lucrativos) e entre presencial e EAD, de 2021 a 2024? Há algum ano atípico, e por quê?",
    bases: "Censo da Educação Superior · cursos 2021–2024",
    colunas: [
      "TP_REDE",
      "TP_CATEGORIA_ADMINISTRATIVA",
      "TP_MODALIDADE_ENSINO",
      "QT_MAT",
      "QT_SIT_DESVINCULADO",
      "QT_SIT_TRANSFERIDO",
    ],
  },
  {
    id: "P4",
    obrigatoria: true,
    titulo: "Qualidade retém?",
    texto:
      "Cursos com CPC mais alto (ciclo 2021–2023) têm desistência menor? Mostre a relação e discuta o que mais pode explicá-la.",
    bases: "CPC 2021–2023 + Indicadores de Trajetória",
    colunas: ["Código do Curso / CO_CURSO", "CPC (Faixa/Contínuo)", "TDA"],
  },
  {
    id: "P5",
    obrigatoria: true,
    titulo: "O funil das licenciaturas",
    texto:
      "Nas licenciaturas de MT, quanto da turma desiste e quanto dos concluintes atinge o padrão de proficiência no Enade 2025? Quais áreas formam pouco e com baixa proficiência?",
    bases: "Conceito Enade 2025 · Licenciaturas + Indicadores de Trajetória",
    colunas: ["Percentual de Concluintes … Padrão de Proficiência", "Área de Avaliação", "TDA", "TP_GRAU_ACADEMICO"],
  },
  {
    id: "B1",
    obrigatoria: false,
    titulo: "Desertos de ensino superior",
    texto:
      "Quantas vagas presenciais de graduação existem para cada 100 jovens de 18–24 anos em cada município de MT? Onde estão os municípios sem oferta?",
    bases: "Censo da Educação Superior 2024 + IBGE tabela 9514 (Censo 2022)",
    colunas: ["QT_VG_TOTAL", "CO_MUNICIPIO", "população por idade"],
  },
  {
    id: "B2",
    obrigatoria: false,
    titulo: "Financiamento e permanência",
    texto:
      "Qual o peso do FIES e do ProUni entre os ingressantes da rede privada de MT (2021–2024)? Cursos com mais financiados evadem menos?",
    bases: "Censo da Educação Superior · cursos 2021–2024",
    colunas: ["QT_ING", "QT_ING_FIES", "QT_ING_PROUNII", "QT_ING_PROUNIP"],
  },
];

/** Critérios da ficha que avaliam as respostas às perguntas (mostram o botão "Ver perguntas"). */
export const CRITERIOS_COM_PERGUNTAS = new Set(["respostas", "respondeu"]);
