import { describe, expect, it } from "vitest";
import { locaisDasEquipes, lugaresDoElemento, ocupacao } from "./alocacao";
import { encaixar, medida, modeloPorId } from "./catalogo";
import { arrastarVista, caixaDoGrupo, caixaEntre, deslocamentoDoGrupo, medidasDaCaixa, redimensionar, tocados, zoomEm } from "./edicao";
import { caixa, conferirMapa, dentroDaSala, fileira, proximoRotulo } from "./tipos";

const sala = { largura_cm: 800, profundidade_cm: 600 };
const bancada = modeloPorId("bancada-lab-2")!;

describe("mapa", () => {
  it("encaixa de 10 em 10 cm e mostra medidas em metros", () => {
    expect(encaixar(134)).toBe(130);
    expect(encaixar(136)).toBe(140);
    expect(medida(320)).toBe("3,2 m");
    expect(medida(45)).toBe("45 cm");
  });

  it("girar 90° troca largura e profundidade na sala", () => {
    expect(caixa({ x_cm: 0, y_cm: 0, largura_cm: 320, profundidade_cm: 80, rotacao: 90 })).toMatchObject({ largura: 80, profundidade: 320 });
    expect(caixa({ x_cm: 0, y_cm: 0, largura_cm: 320, profundidade_cm: 80, rotacao: 180 })).toMatchObject({ largura: 320, profundidade: 80 });
  });

  it("não deixa o elemento sair da sala ao arrastar", () => {
    const e = { largura_cm: 320, profundidade_cm: 80, rotacao: 0 };
    expect(dentroDaSala(sala, e, -50, -50)).toEqual({ x: 0, y: 0 });
    expect(dentroDaSala(sala, e, 900, 700)).toEqual({ x: 480, y: 520 });
  });

  it("numera as bancadas pulando os rótulos que já existem", () => {
    expect(proximoRotulo("B", ["B1", "B3"])).toBe("B2");
    expect(proximoRotulo("B", ["B1", "B3"], 1)).toBe("B4");
    expect(proximoRotulo(undefined, [])).toBeNull();
  });

  it("monta uma fileira de bancadas numeradas, uma embaixo da outra", () => {
    const f = fileira({ modelo: bancada, quantidade: 3, direcao: "vertical", espacoCm: 100, xCm: 50, yCm: 50, rotulos: ["B1"] });
    expect(f.map((e) => [e.rotulo, e.x_cm, e.y_cm, e.lugares])).toEqual([
      ["B2", 50, 50, 2],
      ["B3", 50, 230, 2],
      ["B4", 50, 410, 2],
    ]);
  });

  it("confere o JSON importado e diz onde está o problema", () => {
    const ok = { pisos: [{ nome: "Térreo", salas: [{ nome: "Lab 1", largura_m: 8, profundidade_m: 6, elementos: [{ tipo: "bancada", x_m: 1, y_m: 1, largura_m: 3.2, profundidade_m: 0.8, lugares: 2 }] }] }] };
    expect(conferirMapa(ok)).toEqual([]);
    expect(conferirMapa({})[0]).toContain("pisos");
    const ruim = { pisos: [{ nome: "Térreo", salas: [{ nome: "Lab 1", largura_m: 8, profundidade_m: 6, elementos: [{ tipo: "sofa", x_m: 1, y_m: 1, largura_m: 1, profundidade_m: 1 }, { tipo: "mesa", x_m: 20, y_m: 1, largura_m: 1, profundidade_m: 1 }] }] }] };
    const erros = conferirMapa(ruim);
    expect(erros[0]).toContain("“sofa” não existe");
    expect(erros[1]).toContain("fora da sala");
  });
});

describe("equipes no mapa", () => {
  const b1 = { id: "b1", sala_id: "s1", tipo: "bancada" as const, rotulo: "B1", x_cm: 100, y_cm: 100, largura_cm: 320, profundidade_cm: 80, rotacao: 0, lugares: 2 };
  const m1 = { ...b1, id: "m1", rotulo: "M1", lugares: 1 };

  it("divide a bancada em lugares iguais no lado mais comprido (também girada)", () => {
    expect(lugaresDoElemento(b1).map((l) => [l.x, l.y, l.largura, l.profundidade])).toEqual([
      [100, 100, 160, 80],
      [260, 100, 160, 80],
    ]);
    expect(lugaresDoElemento({ ...b1, rotacao: 90 }).map((l) => [l.x, l.y, l.largura, l.profundidade])).toEqual([
      [100, 100, 80, 160],
      [100, 260, 80, 160],
    ]);
  });

  it("monta quem está em cada lugar e o local de cada equipe", () => {
    const equipes = [
      { id: "e1", nome: "DataMind", icone: "🧠" },
      { id: "e2", nome: "Pandas", icone: null },
    ];
    const alocacoes = [
      { equipe_id: "e1", elemento_id: "b1", lugar: 2 },
      { equipe_id: "e2", elemento_id: "m1", lugar: 1 },
    ];
    expect(ocupacao([b1, m1], alocacoes, equipes).b1.map((e) => e?.nome ?? null)).toEqual([null, "DataMind"]);
    expect(locaisDasEquipes([{ id: "s1", nome: "Lab 1" }], [b1, m1], alocacoes)).toEqual({ e1: "Lab 1 · B1 (lugar 2)", e2: "Lab 1 · M1" });
  });
});

describe("editor do mapa", () => {
  const sala800 = { largura_cm: 800, profundidade_cm: 600 };
  const c = { x: 100, y: 100, largura: 320, profundidade: 80 };

  it("redimensiona pela alça, encaixando na grade, sem sumir nem sair da sala", () => {
    expect(redimensionar(c, "l", 47, 0, sala800)).toEqual({ x: 100, y: 100, largura: 370, profundidade: 80 });
    expect(redimensionar(c, "so", -33, 21, sala800)).toEqual({ x: 70, y: 100, largura: 350, profundidade: 100 });
    expect(redimensionar(c, "n", 0, 500, sala800)).toMatchObject({ profundidade: 10 });
    expect(redimensionar(c, "l", 9999, 0, sala800)).toMatchObject({ largura: 700 });
  });

  it("guarda as medidas de antes do giro", () => {
    expect(medidasDaCaixa({ rotacao: 90 }, { x: 0, y: 0, largura: 80, profundidade: 320 })).toEqual({ x_cm: 0, y_cm: 0, largura_cm: 320, profundidade_cm: 80 });
  });

  it("move o grupo junto sem deixar ninguém sair da sala", () => {
    const grupo = { x: 50, y: 50, largura: 700, profundidade: 100 };
    expect(deslocamentoDoGrupo(grupo, 200, -100, sala800)).toEqual({ dx: 50, dy: -50 });
  });

  it("seleciona com o retângulo os itens que ele toca", () => {
    const a = { id: "a", sala_id: "s", tipo: "mesa" as const, rotulo: null, x_cm: 0, y_cm: 0, largura_cm: 100, profundidade_cm: 100, rotacao: 0, lugares: 1 };
    const b = { ...a, id: "b", x_cm: 400 };
    expect(tocados([a, b], caixaEntre({ x: 450, y: 50 }, { x: 90, y: 10 }))).toEqual(["a", "b"]);
    expect(tocados([a, b], caixaEntre({ x: 150, y: 0 }, { x: 300, y: 300 }))).toEqual([]);
    expect(caixaDoGrupo([a, b])).toEqual({ x: 0, y: 0, largura: 500, profundidade: 100 });
  });
});

describe("zoom do editor", () => {
  const inteira = { x: -50, y: -50, largura: 900, profundidade: 700 };

  it("aproxima mantendo o ponto do mouse no lugar, com limites", () => {
    const v = zoomEm(inteira, 0.5, { x: 400, y: 300 }, inteira);
    expect(v).toEqual({ x: 175, y: 125, largura: 450, profundidade: 350 });
    expect(zoomEm(inteira, 0.01, { x: 0, y: 0 }, inteira).largura).toBe(100);
    expect(zoomEm(inteira, 10, { x: 0, y: 0 }, inteira).largura).toBe(2700);
  });

  it("arrastar a vista acompanha o gesto", () => {
    expect(arrastarVista(inteira, 100, -20)).toMatchObject({ x: -150, y: -30 });
  });
});
