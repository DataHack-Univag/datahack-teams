import { encaixar, TIPOS, TIPOS_ELEMENTO, type Modelo, type TipoElemento } from "./catalogo";

// Mapa do evento por edição: piso > sala > elementos (tudo em centímetros).

export type Piso = { id: string; nome: string; ordem: number };

export type Sala = {
  id: string;
  piso_id: string;
  nome: string;
  largura_cm: number;
  profundidade_cm: number;
  fundo: string | null;
  ordem: number;
};

export type Elemento = {
  id: string;
  sala_id: string;
  tipo: TipoElemento;
  rotulo: string | null;
  x_cm: number;
  y_cm: number;
  largura_cm: number;
  profundidade_cm: number;
  rotacao: number;
  lugares: number | null;
};

/** Medidas do elemento como ele aparece (girado 90/270 troca largura e profundidade). */
export function caixa(e: Pick<Elemento, "x_cm" | "y_cm" | "largura_cm" | "profundidade_cm" | "rotacao">) {
  const deitado = e.rotacao % 180 === 90;
  return {
    x: e.x_cm,
    y: e.y_cm,
    largura: deitado ? e.profundidade_cm : e.largura_cm,
    profundidade: deitado ? e.largura_cm : e.profundidade_cm,
  };
}

/** Mantém o elemento dentro da sala (ao arrastar ou ao criar). */
export function dentroDaSala(sala: Pick<Sala, "largura_cm" | "profundidade_cm">, e: Pick<Elemento, "largura_cm" | "profundidade_cm" | "rotacao">, x: number, y: number) {
  const c = caixa({ ...e, x_cm: x, y_cm: y });
  return {
    x: Math.min(Math.max(0, encaixar(x)), Math.max(0, sala.largura_cm - c.largura)),
    y: Math.min(Math.max(0, encaixar(y)), Math.max(0, sala.profundidade_cm - c.profundidade)),
  };
}

/** Próximo rótulo livre com o prefixo do modelo: B1, B2, B3... */
export function proximoRotulo(prefixo: string | undefined, existentes: (string | null)[], deslocamento = 0): string | null {
  if (!prefixo) return null;
  const usados = new Set(existentes.filter(Boolean).map((r) => r!.toUpperCase()));
  let n = 1;
  let pulados = 0;
  for (;;) {
    if (!usados.has(`${prefixo}${n}`.toUpperCase())) {
      if (pulados === deslocamento) return `${prefixo}${n}`;
      pulados++;
    }
    n++;
  }
}

/** Fileira de elementos iguais: N peças a partir de (x, y), com um espaço entre elas. */
export function fileira({
  modelo,
  quantidade,
  direcao,
  espacoCm,
  xCm,
  yCm,
  rotulos,
}: {
  modelo: Modelo;
  quantidade: number;
  direcao: "horizontal" | "vertical";
  espacoCm: number;
  xCm: number;
  yCm: number;
  rotulos: (string | null)[];
}) {
  return Array.from({ length: quantidade }, (_, i) => {
    const passo = (direcao === "horizontal" ? modelo.largura_cm : modelo.profundidade_cm) + espacoCm;
    return {
      tipo: modelo.tipo,
      rotulo: proximoRotulo(modelo.prefixo, rotulos, i),
      x_cm: encaixar(xCm + (direcao === "horizontal" ? passo * i : 0)),
      y_cm: encaixar(yCm + (direcao === "vertical" ? passo * i : 0)),
      largura_cm: modelo.largura_cm,
      profundidade_cm: modelo.profundidade_cm,
      rotacao: 0,
      lugares: modelo.lugares ?? null,
    };
  });
}

// ---------------------------------------------------------------- importação (JSON em metros)

/** Formato de importação/exportação: o mesmo que pessoas e IAs escrevem. */
export type MapaCanonico = {
  pisos: {
    nome: string;
    salas: {
      nome: string;
      largura_m: number;
      profundidade_m: number;
      elementos?: { tipo: string; rotulo?: string; x_m: number; y_m: number; largura_m: number; profundidade_m: number; rotacao?: number; lugares?: number }[];
    }[];
  }[];
};

/**
 * Confere o JSON antes de importar e devolve os problemas em português, com o lugar de
 * cada um (heurística 9). Lista vazia = pode importar.
 */
export function conferirMapa(m: unknown): string[] {
  const erros: string[] = [];
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const mapa = m as MapaCanonico;
  if (!mapa || !Array.isArray(mapa.pisos) || !mapa.pisos.length) return ["O JSON precisa de uma lista “pisos” com pelo menos um piso."];
  mapa.pisos.forEach((p, ip) => {
    const ondeP = `Piso ${ip + 1}${p?.nome ? ` (“${p.nome}”)` : ""}`;
    if (!p?.nome?.trim()) erros.push(`${ondeP}: falta o “nome”.`);
    if (!Array.isArray(p?.salas) || !p.salas.length) erros.push(`${ondeP}: falta a lista “salas”.`);
    (p?.salas ?? []).forEach((s, is) => {
      const ondeS = `${ondeP}, sala ${is + 1}${s?.nome ? ` (“${s.nome}”)` : ""}`;
      if (!s?.nome?.trim()) erros.push(`${ondeS}: falta o “nome”.`);
      if (!num(s?.largura_m) || !num(s?.profundidade_m) || s.largura_m < 1 || s.profundidade_m < 1 || s.largura_m > 100 || s.profundidade_m > 100)
        erros.push(`${ondeS}: “largura_m” e “profundidade_m” precisam ser números entre 1 e 100 (metros).`);
      (s?.elementos ?? []).forEach((e, ie) => {
        const ondeE = `${ondeS}, elemento ${ie + 1}`;
        if (!TIPOS_ELEMENTO.includes(e?.tipo as TipoElemento)) {
          erros.push(`${ondeE}: tipo “${e?.tipo}” não existe. Use: ${TIPOS_ELEMENTO.join(", ")}.`);
          return;
        }
        if (![e.x_m, e.y_m, e.largura_m, e.profundidade_m].every(num)) erros.push(`${ondeE}: “x_m”, “y_m”, “largura_m” e “profundidade_m” precisam ser números.`);
        else if (e.largura_m <= 0 || e.profundidade_m <= 0) erros.push(`${ondeE}: largura e profundidade precisam ser maiores que zero.`);
        else if (num(s.largura_m) && num(s.profundidade_m) && (e.x_m < -0.5 || e.y_m < -0.5 || e.x_m > s.largura_m || e.y_m > s.profundidade_m))
          erros.push(`${ondeE} (${TIPOS[e.tipo as TipoElemento].rotulo}): está fora da sala (x_m e y_m medem a partir do canto de cima à esquerda).`);
        if (e.lugares !== undefined && (!Number.isInteger(e.lugares) || e.lugares < 1 || e.lugares > 20)) erros.push(`${ondeE}: “lugares” precisa ser um número inteiro de 1 a 20.`);
        if (e.rotacao !== undefined && ![0, 90, 180, 270].includes(e.rotacao)) erros.push(`${ondeE}: “rotacao” só pode ser 0, 90, 180 ou 270.`);
      });
    });
  });
  return erros.slice(0, 12);
}

/** Texto para colar numa IA junto com o desenho da sala: ela devolve o JSON no formato certo. */
export function instrucoesParaIA(): string {
  return `Transforme o desenho anexo (planta ou rascunho de salas do evento) em JSON, exatamente neste formato e sem nenhum texto fora do JSON:

{
  "pisos": [
    { "nome": "Térreo",
      "salas": [
        { "nome": "Lab 1", "largura_m": 8, "profundidade_m": 6,
          "elementos": [
            { "tipo": "porta", "x_m": 0, "y_m": 2.5, "largura_m": 0.9, "profundidade_m": 0.1, "rotacao": 90 },
            { "tipo": "bancada", "rotulo": "B1", "x_m": 1, "y_m": 1, "largura_m": 3.2, "profundidade_m": 0.8, "lugares": 2 }
          ] }
      ] }
  ]
}

Regras:
- Medidas em metros. x_m e y_m são o canto de cima à esquerda do elemento, medidos a partir do canto de cima à esquerda da sala (x para a direita, y para baixo).
- largura_m é a medida na horizontal e profundidade_m na vertical, antes de girar. "rotacao" (opcional) só pode ser 0, 90, 180 ou 270.
- "tipo" só pode ser: ${TIPOS_ELEMENTO.join(", ")}.
- "lugares" (só para bancada e mesa) é quantas equipes cabem nela. Bancada de laboratório comum: 3,2 × 0,8 m com 2 lugares.
- Use "rotulo" para numerar as bancadas e mesas (B1, B2...). Se o desenho não tiver medidas, estime pelo tamanho de uma porta (0,9 m).`;
}
