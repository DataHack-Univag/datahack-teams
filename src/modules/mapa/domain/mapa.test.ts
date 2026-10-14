import { describe, expect, it } from "vitest";
import { locaisDasEquipes, lugaresDoElemento, ocupacao } from "./alocacao";
import { encaixar, medida, modeloPorId } from "./catalogo";
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
