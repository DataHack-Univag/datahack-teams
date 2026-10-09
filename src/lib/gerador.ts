// Algoritmo de formação de equipes equilibradas (portado de datahack-equipes.html).
//
// 1. Semestre e nota são normalizados para 0–1 dentro da turma.
// 2. score = peso_sem × semestre + peso_nota × nota. Quem não tem nota recebe uma
//    nota estimada só para o cálculo (nunca exibida).
// 3. Distribuição em serpentina (1→N, N→1) espalha os maiores scores.
// 4. Busca local com recozimento (40.000 trocas) aproxima score, semestre e nota
//    de cada equipe da média geral, penalizando mesmo semestre/curso/sem nota juntos.
// 5. O resultado é comparado com 200 sorteios aleatórios.

export type AlunoGerador = {
  email: string;
  nome: string;
  sem: number;
  nota: number | null;
  semNota: boolean;
  curso: string;
};

export type Imputacao = "med" | "semmed" | "min";

export type OpcoesGerador = {
  usarNota: boolean;
  /** 0–1: peso do semestre (o restante vai para a nota). */
  pesoSem: number;
  imputacao: Imputacao;
  tamanho: number;
  semente: string;
  variacao: number;
};

type Pessoa = AlunoGerador & { id: number; sn: number; nn: number; score: number };

export type EquipeGerada = {
  n: number;
  m: Pessoa[];
  score: number;
  sem: number;
  nota: number;
  semNota: number;
  distinct: number;
  cursos: number;
};

export type ResultadoGerador = {
  P: Pessoa[];
  equipes: EquipeGerada[];
  G: { score: number; sn: number; nn: number };
  tamanhos: number[];
  nosso: number;
  aleatorio: number;
  pesoSem: number;
};

// ---------- RNG determinístico ----------
function hashStr(s: string) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- utilitários ----------
export const media = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

function mediana(a: number[]) {
  if (!a.length) return NaN;
  const b = [...a].sort((x, y) => x - y);
  const m = b.length >> 1;
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}

export const mediaReal = (m: AlunoGerador[]) => {
  const r = m.filter((p) => !p.semNota).map((p) => p.nota as number);
  return r.length ? media(r) : NaN;
};

/** Sobras viram equipes de +1. */
export function tamanhosEquipes(n: number, base: number) {
  base = Math.max(2, base | 0);
  const g = Math.floor(n / base);
  if (g < 1) return [n];
  const r = n - g * base;
  const sizes = Array(g).fill(base) as number[];
  for (let i = 0; i < r; i++) sizes[i % g]++;
  return sizes;
}

export function composicao(tamanhos: number[]) {
  const c: Record<number, number> = {};
  tamanhos.forEach((x) => (c[x] = (c[x] || 0) + 1));
  return Object.keys(c)
    .map(Number)
    .sort((a, b) => b - a)
    .map((x) => `${c[x]} de ${x}`)
    .join(" + ");
}

// nota usada no cálculo para quem não tem nota (nunca exibida)
function notaImputada(s: AlunoGerador, reais: number[], lista: AlunoGerador[], politica: Imputacao) {
  if (!reais.length) return 0;
  if (politica === "min") return Math.min(...reais);
  if (politica === "semmed") {
    const mesmo = lista.filter((x) => x.sem === s.sem && !x.semNota).map((x) => x.nota as number);
    if (mesmo.length >= 3) return mediana(mesmo);
  }
  return mediana(reais);
}

function enriquecer(lista: AlunoGerador[], pesoSem: number, politica: Imputacao): Pessoa[] {
  const reais = lista.filter((s) => !s.semNota).map((s) => s.nota as number);
  const notaCalc = lista.map((s) => (s.semNota ? notaImputada(s, reais, lista, politica) : (s.nota as number)));
  const sems = lista.map((s) => s.sem);
  const sMin = Math.min(...sems),
    sMax = Math.max(...sems),
    nMin = Math.min(...notaCalc),
    nMax = Math.max(...notaCalc);
  return lista.map((s, i) => {
    const sn = sMax > sMin ? (s.sem - sMin) / (sMax - sMin) : 0.5;
    const nn = nMax > nMin ? (notaCalc[i] - nMin) / (nMax - nMin) : 0.5;
    return { ...s, id: i, sn, nn, score: pesoSem * sn + (1 - pesoSem) * nn };
  });
}

function custo(teams: number[][], P: Pessoa[], G: ResultadoGerador["G"], pesoSem: number) {
  let c = 0,
    dup = 0;
  for (const t of teams) {
    let sc = 0,
      sn = 0,
      nn = 0,
      miss = 0;
    const cnt: Record<number, number> = {},
      cur: Record<string, number> = {};
    for (const i of t) {
      const p = P[i];
      sc += p.score;
      sn += p.sn;
      nn += p.nn;
      cnt[p.sem] = (cnt[p.sem] || 0) + 1;
      if (p.semNota) miss++;
      if (p.curso) cur[p.curso] = (cur[p.curso] || 0) + 1;
    }
    for (const k in cur) {
      const m = cur[k];
      dup += (0.8 * m * (m - 1)) / 2;
    }
    dup += (1.5 * miss * (miss - 1)) / 2;
    const k = t.length;
    c += 100 * (sc / k - G.score) ** 2 + 40 * pesoSem * (sn / k - G.sn) ** 2 + 40 * (1 - pesoSem) * (nn / k - G.nn) ** 2;
    for (const s in cnt) {
      const m = cnt[s];
      dup += (m * (m - 1)) / 2;
    }
  }
  return c + 0.002 * dup;
}

function dispersao(teams: number[][], P: Pessoa[]) {
  const m = teams.map((t) => t.reduce((a, i) => a + P[i].score, 0) / t.length);
  const mu = media(m);
  return Math.sqrt(media(m.map((x) => (x - mu) ** 2)));
}

function resolver(P: Pessoa[], sizes: number[], pesoSem: number, rng: () => number) {
  const G = { score: media(P.map((p) => p.score)), sn: media(P.map((p) => p.sn)), nn: media(P.map((p) => p.nn)) };
  // serpentina
  const ordem = P.map((p) => p.id).sort((a, b) => P[b].score - P[a].score || rng() - 0.5);
  const teams: number[][] = sizes.map(() => []);
  let dir = 1,
    ti = 0;
  const avancar = () => {
    ti += dir;
    if (ti >= sizes.length) {
      ti = sizes.length - 1;
      dir = -1;
    } else if (ti < 0) {
      ti = 0;
      dir = 1;
    }
  };
  for (const id of ordem) {
    let guard = 0;
    while (teams[ti].length >= sizes[ti] && guard++ < sizes.length * 2) avancar();
    teams[ti].push(id);
    avancar();
  }
  // busca local com recozimento leve
  let cost = custo(teams, P, G, pesoSem),
    best = teams.map((t) => t.slice()),
    bestC = cost;
  const iters = 40000;
  let T = 0.002;
  for (let it = 0; it < iters; it++) {
    const a = Math.floor(rng() * teams.length);
    const b = Math.floor(rng() * teams.length);
    if (a === b) continue;
    const ia = Math.floor(rng() * teams[a].length),
      ib = Math.floor(rng() * teams[b].length);
    const x = teams[a][ia];
    teams[a][ia] = teams[b][ib];
    teams[b][ib] = x;
    const nc = custo(teams, P, G, pesoSem);
    if (nc <= cost || rng() < Math.exp((cost - nc) / T)) {
      cost = nc;
      if (nc < bestC) {
        bestC = nc;
        best = teams.map((t) => t.slice());
      }
    } else {
      teams[b][ib] = teams[a][ia];
      teams[a][ia] = x;
    }
    T *= 0.99985;
  }
  return { teams: best, G };
}

function linhaDeBase(P: Pessoa[], sizes: number[], rng: () => number, runs: number) {
  let tot = 0;
  for (let r = 0; r < runs; r++) {
    const ids = P.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    let k = 0;
    const teams = sizes.map((s) => ids.slice(k, (k += s)));
    tot += dispersao(teams, P);
  }
  return tot / runs;
}

/** Monta as equipes. Mesma semente + variação = mesmo resultado. */
export function gerarEquipes(alunos: AlunoGerador[], o: OpcoesGerador): ResultadoGerador {
  const pesoSem = o.usarNota ? o.pesoSem : 1;
  const tamanhos = tamanhosEquipes(alunos.length, o.tamanho || 5);
  const P = enriquecer(alunos, pesoSem, o.imputacao);
  const rng = mulberry32(hashStr(o.semente + "|" + o.variacao));
  const { teams, G } = resolver(P, tamanhos, pesoSem, rng);
  const nosso = dispersao(teams, P);
  const aleatorio = linhaDeBase(P, tamanhos, mulberry32(7), 200);
  const equipes = teams.map((t, i) => {
    const m = t.map((id) => P[id]).sort((a, b) => a.sem - b.sem || (b.nota ?? -1) - (a.nota ?? -1));
    return {
      n: i + 1,
      m,
      score: media(m.map((p) => p.score)),
      sem: media(m.map((p) => p.sem)),
      nota: mediaReal(m),
      semNota: m.filter((p) => p.semNota).length,
      distinct: new Set(m.map((p) => p.sem)).size,
      cursos: new Set(m.map((p) => p.curso).filter(Boolean)).size,
    };
  });
  return { P, equipes, G, tamanhos, nosso, aleatorio, pesoSem };
}
