import { describe, expect, it } from "vitest";
import {
  adicionarDoCatalogo,
  aplicarModelo,
  chaveDe,
  conferirFormulario,
  limparRespostas,
  MODELOS_FORMULARIO,
  tirarCampo,
  rotuloDoValor,
  validarRespostas,
  valoresDaLista,
  visiveis,
  type Campo,
  type PerguntaCatalogo,
} from "./campos";

const catalogo: PerguntaCatalogo[] = [
  { grupo: "Estudo", chave: "curso", rotulo: "Curso", tipo: "texto", obrigatorio: true, traz: [] },
  { grupo: "Estudo", chave: "semestre", rotulo: "Semestre", tipo: "numero", opcoes: { min: 1, max: 12 }, obrigatorio: true, traz: [] },
  { grupo: "Estudo", chave: "instituicao", rotulo: "Instituição", tipo: "instituicao", obrigatorio: true, traz: [] },
  { grupo: "Trabalho", chave: "trabalha", rotulo: "Está trabalhando?", tipo: "sim_nao", obrigatorio: true, traz: [] },
  {
    grupo: "Trabalho",
    chave: "cargo",
    rotulo: "Cargo",
    tipo: "escolha",
    opcoes: ["Estagiário", "Outro"],
    condicao: { campo: "trabalha", igual: true },
    obrigatorio: true,
    traz: ["trabalha", "cargo_outro"],
  },
  { grupo: "Trabalho", chave: "cargo_outro", rotulo: "Qual o seu cargo?", tipo: "texto", condicao: { campo: "cargo", igual: "Outro" }, obrigatorio: true, traz: [] },
  { grupo: "Evento", chave: "camiseta", rotulo: "Camiseta", tipo: "escolha", opcoes: ["P", "M", "G"], obrigatorio: true, traz: [] },
  { grupo: "LGPD", chave: "termo", rotulo: "Aceito", tipo: "aceite", obrigatorio: true, traz: [] },
];

describe("formulário da edição", () => {
  it("cargo traz junto 'trabalha' antes e 'cargo_outro' depois", () => {
    const campos = adicionarDoCatalogo([], catalogo, "cargo");
    expect(campos.map((c) => c.chave)).toEqual(["trabalha", "cargo", "cargo_outro"]);
    expect(conferirFormulario(campos)).toEqual([]);
    expect(tirarCampo(campos, "trabalha")).toEqual([]);
    expect(tirarCampo(campos, "cargo").map((c) => c.chave)).toEqual(["trabalha"]);
  });

  it("modelo é só a seleção inicial, com obrigatória ou opcional", () => {
    const campos = aplicarModelo(catalogo, { ...MODELOS_FORMULARIO[0].campos, camiseta: false });
    expect(campos.map((c) => [c.chave, c.obrigatorio])).toEqual([
      ["curso", true],
      ["semestre", true],
      ["camiseta", false],
    ]);
  });

  it("gera a chave a partir do texto", () => {
    expect(chaveDe("Tamanho da camiseta?", [])).toBe("tamanho_da_camiseta");
    expect(chaveDe("Curso", ["curso"])).toBe("curso_2");
    expect(chaveDe("2º idioma", [])).toBe("p_2_idioma");
  });
});

describe("respostas", () => {
  const campos: Campo[] = [
    ...adicionarDoCatalogo([], catalogo, "cargo"),
    { ...catalogo[1] },
    { ...catalogo[6], obrigatorio: false },
    { ...catalogo[7] },
  ];

  it("mostra a pergunta condicional só quando a condição vale", () => {
    expect([...visiveis(campos, {})]).toEqual(["trabalha", "semestre", "camiseta", "termo"]);
    expect(visiveis(campos, { trabalha: true, cargo: "Outro" }).has("cargo_outro")).toBe(true);
    // mudou para "não": o cargo some e não vai para o banco
    expect(limparRespostas(campos, { trabalha: false, cargo: "Outro", cargo_outro: "BI", semestre: 3 })).toEqual({ trabalha: false, semestre: 3 });
  });

  it("confere obrigatórias, faixas e opções (opcional pode ficar em branco)", () => {
    expect(validarRespostas(campos, {})).toEqual({
      trabalha: "Responda esta pergunta.",
      semestre: "Responda esta pergunta.",
      termo: "Marque para continuar.",
    });
    expect(validarRespostas(campos, { trabalha: true, cargo: "Outro", semestre: 15, camiseta: "XXL", termo: true })).toEqual({
      cargo_outro: "Responda esta pergunta.",
      semestre: "Informe um número entre 1 e 12.",
      camiseta: "Escolha uma das opções da lista.",
    });
    expect(validarRespostas(campos, { trabalha: false, semestre: 5, termo: true })).toEqual({});
  });

  it("instituição: só as da edição, e 'outra' quando o evento permite", () => {
    const so = [catalogo[2]];
    expect(validarRespostas(so, { instituicao: "a" }, { instituicoes: ["a", "b"] })).toEqual({});
    expect(validarRespostas(so, { instituicao: "c" }, { instituicoes: ["a", "b"] })).toEqual({ instituicao: "Escolha uma instituição da lista." });
    expect(validarRespostas(so, { instituicao: "outra" }, { aceitaOutra: false })).toEqual({ instituicao: "Este evento é só para as instituições participantes." });
  });
});

describe("listas", () => {
  const semestre: Campo = { chave: "semestre", rotulo: "Semestre", tipo: "numero", opcoes: { min: 1, max: 12, inteiro: true }, obrigatorio: true };
  it("semestre inteiro vira lista de 1 a 12; CR (decimal) continua campo de número", () => {
    expect(valoresDaLista(semestre)).toHaveLength(12);
    expect(rotuloDoValor(semestre, 3)).toBe("3º semestre");
    expect(valoresDaLista({ ...semestre, chave: "cr", opcoes: { min: 0, max: 10 } })).toBeNull();
    expect(validarRespostas([semestre], { semestre: 3.5 })).toEqual({ semestre: "Escolha um número inteiro." });
    expect(validarRespostas([semestre], { semestre: 4 })).toEqual({});
  });
});
