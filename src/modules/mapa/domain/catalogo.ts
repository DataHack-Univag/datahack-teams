// Catálogo do mapa: os tipos que o banco aceita e os modelos prontos que a tela oferece.
// Medidas em centímetros (o mapa inteiro é em cm, para o croqui sair em escala).

export type TipoElemento =
  | "bancada"
  | "mesa"
  | "cadeira"
  | "mesa_organizacao"
  | "porta"
  | "janela"
  | "parede"
  | "coluna"
  | "quadro"
  | "palco"
  | "area"
  | "texto";

/** Como cada tipo aparece no desenho e no editor. */
export const TIPOS: Record<TipoElemento, { rotulo: string; temLugares: boolean; estilo: "movel" | "equipe" | "estrutura" | "abertura" | "zona" | "texto" }> = {
  bancada: { rotulo: "Bancada", temLugares: true, estilo: "equipe" },
  mesa: { rotulo: "Mesa", temLugares: true, estilo: "equipe" },
  cadeira: { rotulo: "Cadeira", temLugares: false, estilo: "movel" },
  mesa_organizacao: { rotulo: "Mesa da organização", temLugares: false, estilo: "movel" },
  porta: { rotulo: "Porta", temLugares: false, estilo: "abertura" },
  janela: { rotulo: "Janela", temLugares: false, estilo: "abertura" },
  parede: { rotulo: "Parede", temLugares: false, estilo: "estrutura" },
  coluna: { rotulo: "Coluna", temLugares: false, estilo: "estrutura" },
  quadro: { rotulo: "Quadro / telão", temLugares: false, estilo: "movel" },
  palco: { rotulo: "Palco / pitch", temLugares: false, estilo: "zona" },
  area: { rotulo: "Área", temLugares: false, estilo: "zona" },
  texto: { rotulo: "Texto", temLugares: false, estilo: "texto" },
};

export const TIPOS_ELEMENTO = Object.keys(TIPOS) as TipoElemento[];

/** Modelo pronto do catálogo: um tipo com medidas e lugares já preenchidos. */
export type Modelo = {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoElemento;
  largura_cm: number;
  profundidade_cm: number;
  lugares?: number;
  /** Prefixo do rótulo automático (B1, B2...). */
  prefixo?: string;
  grupo: "Equipes" | "Móveis" | "Sala";
};

export const MODELOS: Modelo[] = [
  { id: "bancada-lab-2", nome: "Bancada de laboratório", descricao: "3,2 × 0,8 m · cabem 2 equipes", tipo: "bancada", largura_cm: 320, profundidade_cm: 80, lugares: 2, prefixo: "B", grupo: "Equipes" },
  { id: "bancada-1", nome: "Bancada curta", descricao: "1,6 × 0,8 m · 1 equipe", tipo: "bancada", largura_cm: 160, profundidade_cm: 80, lugares: 1, prefixo: "B", grupo: "Equipes" },
  { id: "mesa-grupo", nome: "Mesa de grupo", descricao: "1,2 × 1,2 m · 1 equipe", tipo: "mesa", largura_cm: 120, profundidade_cm: 120, lugares: 1, prefixo: "M", grupo: "Equipes" },
  { id: "mesa-dupla", nome: "Mesona", descricao: "2,4 × 1,2 m · 2 equipes", tipo: "mesa", largura_cm: 240, profundidade_cm: 120, lugares: 2, prefixo: "M", grupo: "Equipes" },
  { id: "cadeira", nome: "Cadeira", descricao: "0,45 × 0,45 m", tipo: "cadeira", largura_cm: 45, profundidade_cm: 45, grupo: "Móveis" },
  { id: "mesa-org", nome: "Mesa da organização", descricao: "1,8 × 0,7 m", tipo: "mesa_organizacao", largura_cm: 180, profundidade_cm: 70, grupo: "Móveis" },
  { id: "quadro", nome: "Quadro / telão", descricao: "2 m de largura", tipo: "quadro", largura_cm: 200, profundidade_cm: 10, grupo: "Móveis" },
  { id: "palco", nome: "Palco / área de pitch", descricao: "4 × 2,5 m", tipo: "palco", largura_cm: 400, profundidade_cm: 250, grupo: "Móveis" },
  { id: "porta", nome: "Porta", descricao: "0,9 m", tipo: "porta", largura_cm: 90, profundidade_cm: 10, grupo: "Sala" },
  { id: "janela", nome: "Janela", descricao: "1,2 m", tipo: "janela", largura_cm: 120, profundidade_cm: 10, grupo: "Sala" },
  { id: "parede", nome: "Parede", descricao: "3 m (puxe para o tamanho)", tipo: "parede", largura_cm: 300, profundidade_cm: 15, grupo: "Sala" },
  { id: "coluna", nome: "Coluna", descricao: "0,4 × 0,4 m", tipo: "coluna", largura_cm: 40, profundidade_cm: 40, grupo: "Sala" },
  { id: "area", nome: "Área marcada", descricao: "Café, entrada, apoio…", tipo: "area", largura_cm: 300, profundidade_cm: 200, grupo: "Sala" },
  { id: "texto", nome: "Texto", descricao: "Uma legenda no mapa", tipo: "texto", largura_cm: 150, profundidade_cm: 40, grupo: "Sala" },
];

export const modeloPorId = (id: string) => MODELOS.find((m) => m.id === id);

/** Encaixe na grade: o mapa anda de 10 em 10 cm (alinhado sem esforço, heurística 5). */
export const GRADE_CM = 10;
export const encaixar = (v: number) => Math.round(v / GRADE_CM) * GRADE_CM;

/** "3,2 m", "80 cm": como as medidas aparecem para as pessoas. */
export function medida(cm: number): string {
  if (cm < 100) return `${cm} cm`;
  return `${(cm / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m`;
}
