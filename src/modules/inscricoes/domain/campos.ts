// Formulário de inscrição parametrizável: cada edição escolhe as perguntas, e cada uma pode ser
// obrigatória ou opcional. As respostas ficam num pacote ({"curso": "SI", "semestre": 5}).
// A validação aqui é a mesma do banco (validar_respostas, migração 018): a tela avisa antes,
// o banco decide.

export type TipoCampo = "texto" | "texto_longo" | "numero" | "escolha" | "multipla" | "sim_nao" | "data" | "instituicao" | "aceite";

export type Condicao = { campo: string; igual: Valor };
export type Valor = string | number | boolean | string[];
export type Respostas = Record<string, Valor>;

export type Campo = {
  chave: string;
  rotulo: string;
  ajuda?: string | null;
  tipo: TipoCampo;
  /** escolha/multipla: lista de opções; numero: {min, max, inteiro} (inteiro com faixa curta vira lista). */
  opcoes?: string[] | { min?: number; max?: number; inteiro?: boolean } | null;
  condicao?: Condicao | null;
  obrigatorio: boolean;
  sensivel?: boolean;
};

/** Pergunta do banco de perguntas prontas. */
export type PerguntaCatalogo = Campo & { grupo: string; traz: string[] };

export const TIPOS_CAMPO: { valor: TipoCampo; rotulo: string }[] = [
  { valor: "texto", rotulo: "Texto curto" },
  { valor: "texto_longo", rotulo: "Texto longo" },
  { valor: "numero", rotulo: "Número" },
  { valor: "escolha", rotulo: "Escolha uma opção" },
  { valor: "multipla", rotulo: "Várias opções" },
  { valor: "sim_nao", rotulo: "Sim ou não" },
  { valor: "data", rotulo: "Data" },
  { valor: "instituicao", rotulo: "Instituição (da lista)" },
  { valor: "aceite", rotulo: "Caixa de aceite (termo)" },
];

export const rotuloTipo = (t: string) => TIPOS_CAMPO.find((x) => x.valor === t)?.rotulo ?? t;

const lista = (c: Campo) => (Array.isArray(c.opcoes) ? c.opcoes : []);
const faixa = (c: Campo) => (c.opcoes && !Array.isArray(c.opcoes) ? c.opcoes : {});

/** Número inteiro com faixa curta (ex.: semestre 1 a 12): a tela mostra uma lista para escolher. */
export function valoresDaLista(c: Campo): number[] | null {
  const { min, max, inteiro } = faixa(c);
  if (c.tipo !== "numero" || !inteiro || min === undefined || max === undefined || max < min || max - min > 40) return null;
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

/** Como cada valor aparece na lista ("3º semestre" para semestre, o número nos outros casos). */
export const rotuloDoValor = (c: Pick<Campo, "chave">, n: number) => (c.chave.includes("semestre") ? `${n}º semestre` : String(n));
const igual = (a: Valor | undefined, b: Valor) => JSON.stringify(a) === JSON.stringify(b);
const vazio = (c: Campo, v: Valor | undefined) =>
  v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (c.tipo === "aceite" && v !== true);

/** Quais perguntas estão à vista com estas respostas (uma condição só vale se a pergunta de origem estiver à vista). */
export function visiveis(campos: Campo[], respostas: Respostas): Set<string> {
  const vistos = new Set<string>();
  for (const c of campos) {
    if (!c.condicao || (vistos.has(c.condicao.campo) && igual(respostas[c.condicao.campo], c.condicao.igual))) vistos.add(c.chave);
  }
  return vistos;
}

/** Tira do pacote o que está escondido ou em branco (é o que vai para o banco). */
export function limparRespostas(campos: Campo[], respostas: Respostas): Respostas {
  const vistos = visiveis(campos, respostas);
  const limpo: Respostas = {};
  for (const c of campos) {
    const v = respostas[c.chave];
    if (vistos.has(c.chave) && !vazio(c, v)) limpo[c.chave] = typeof v === "string" ? v.trim() : v;
  }
  return limpo;
}

/**
 * Problemas das respostas, por pergunta (vazio = tudo certo). `instituicoes`: ids aceitos na
 * pergunta de instituição (null = qualquer uma); `aceitaOutra`: se vale "outra".
 */
export function validarRespostas(
  campos: Campo[],
  respostas: Respostas,
  { instituicoes = null, aceitaOutra = true }: { instituicoes?: string[] | null; aceitaOutra?: boolean } = {},
): Record<string, string> {
  const erros: Record<string, string> = {};
  const vistos = visiveis(campos, respostas);
  for (const c of campos) {
    if (!vistos.has(c.chave)) continue;
    const v = respostas[c.chave];
    if (vazio(c, v)) {
      if (c.obrigatorio) erros[c.chave] = c.tipo === "aceite" ? "Marque para continuar." : "Responda esta pergunta.";
      continue;
    }
    switch (c.tipo) {
      case "texto":
        if (typeof v !== "string" || v.length > 300) erros[c.chave] = "Use até 300 caracteres.";
        break;
      case "texto_longo":
        if (typeof v !== "string" || v.length > 2000) erros[c.chave] = "Use até 2000 caracteres.";
        break;
      case "numero": {
        const { min, max } = faixa(c);
        if (typeof v !== "number" || Number.isNaN(v) || (min !== undefined && v < min) || (max !== undefined && v > max))
          erros[c.chave] = `Informe um número entre ${min ?? "…"} e ${max ?? "…"}.`;
        else if (faixa(c).inteiro && !Number.isInteger(v)) erros[c.chave] = "Escolha um número inteiro.";
        break;
      }
      case "escolha":
        if (typeof v !== "string" || !lista(c).includes(v)) erros[c.chave] = "Escolha uma das opções da lista.";
        break;
      case "multipla":
        if (!Array.isArray(v) || v.some((x) => !lista(c).includes(x))) erros[c.chave] = "Escolha entre as opções da lista.";
        break;
      case "sim_nao":
        if (typeof v !== "boolean") erros[c.chave] = "Responda sim ou não.";
        break;
      case "data":
        if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) erros[c.chave] = "Informe a data pelo calendário.";
        break;
      case "instituicao":
        if (v === "outra" ? !aceitaOutra : typeof v !== "string" || (instituicoes !== null && !instituicoes.includes(v)))
          erros[c.chave] = v === "outra" ? "Este evento é só para as instituições participantes." : "Escolha uma instituição da lista.";
        break;
    }
  }
  return erros;
}

// ---------------------------------------------------------------- montar o formulário

/** Chave a partir do texto da pergunta ("Tamanho da camiseta" → "tamanho_da_camiseta"). */
export function chaveDe(rotulo: string, usadas: string[]): string {
  let base =
    rotulo
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "pergunta";
  if (!/^[a-z]/.test(base)) base = `p_${base}`;
  let c = base;
  for (let n = 2; usadas.includes(c); n++) c = `${base}_${n}`;
  return c;
}

/**
 * Adiciona uma pergunta do catálogo (e as que vêm junto, como "trabalha" e "cargo_outro" para
 * "cargo"), mantendo cada condição depois da pergunta de que depende.
 */
export function adicionarDoCatalogo(campos: Campo[], catalogo: PerguntaCatalogo[], chave: string): Campo[] {
  const p = catalogo.find((x) => x.chave === chave);
  if (!p || campos.some((c) => c.chave === chave)) return campos;
  const copia = (x: PerguntaCatalogo): Campo => ({
    chave: x.chave,
    rotulo: x.rotulo,
    ajuda: x.ajuda ?? null,
    tipo: x.tipo,
    opcoes: x.opcoes ?? null,
    condicao: x.condicao ?? null,
    obrigatorio: true,
    sensivel: x.sensivel ?? false,
  });
  const antes = p.traz.map((k) => catalogo.find((x) => x.chave === k)).filter((x): x is PerguntaCatalogo => !!x && x.condicao?.campo !== p.chave);
  const depois = p.traz.map((k) => catalogo.find((x) => x.chave === k)).filter((x): x is PerguntaCatalogo => !!x && x.condicao?.campo === p.chave);
  let novo = [...campos];
  for (const x of antes) if (!novo.some((c) => c.chave === x.chave)) novo.push(copia(x));
  novo.push(copia(p));
  for (const x of depois) if (!novo.some((c) => c.chave === x.chave)) novo.push(copia(x));
  novo = ordenarCondicoes(novo);
  return novo;
}

/** Tira a pergunta e as que dependem dela (direta ou indiretamente). */
export function tirarCampo(campos: Campo[], chave: string): Campo[] {
  const fora = new Set([chave]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const c of campos)
      if (c.condicao && fora.has(c.condicao.campo) && !fora.has(c.chave)) {
        fora.add(c.chave);
        mudou = true;
      }
  }
  return campos.filter((c) => !fora.has(c.chave));
}

/** Garante que toda pergunta condicional venha depois da pergunta de que depende. */
export function ordenarCondicoes(campos: Campo[]): Campo[] {
  const resultado: Campo[] = [];
  const pendentes = [...campos];
  while (pendentes.length) {
    const i = pendentes.findIndex((c) => !c.condicao || resultado.some((r) => r.chave === c.condicao!.campo) || !pendentes.some((p) => p.chave === c.condicao!.campo));
    resultado.push(...pendentes.splice(i === -1 ? 0 : i, 1));
  }
  return resultado;
}

/** Problemas de montagem do formulário (antes de salvar). */
export function conferirFormulario(campos: Campo[]): string[] {
  const erros: string[] = [];
  const vistas: string[] = [];
  for (const c of campos) {
    if (!c.rotulo.trim()) erros.push("Há uma pergunta sem texto.");
    if ((c.tipo === "escolha" || c.tipo === "multipla") && !lista(c).length) erros.push(`“${c.rotulo}” precisa de pelo menos uma opção.`);
    if (c.condicao && !vistas.includes(c.condicao.campo)) erros.push(`“${c.rotulo}” depende de uma pergunta que precisa vir antes dela.`);
    vistas.push(c.chave);
  }
  return erros;
}

/** Modelos prontos: só uma seleção inicial do catálogo (chave → obrigatória?). */
export const MODELOS_FORMULARIO: { id: string; rotulo: string; descricao: string; campos: Record<string, boolean> }[] = [
  { id: "universidade", rotulo: "Universidade (fechado)", descricao: "Curso e semestre, como no DATAHack Univag.", campos: { curso: true, semestre: true } },
  {
    id: "aberto",
    rotulo: "Evento aberto",
    descricao: "Cidade, escolaridade, instituição, trabalho e cargo, e o termo de uso dos dados.",
    campos: { cidade: true, escolaridade: true, situacao_estudo: true, instituicao: true, cargo: true, como_soube: false, termo: true },
  },
];

export function aplicarModelo(catalogo: PerguntaCatalogo[], modelo: Record<string, boolean>): Campo[] {
  let campos: Campo[] = [];
  for (const chave of Object.keys(modelo)) campos = adicionarDoCatalogo(campos, catalogo, chave);
  return campos.map((c) => (c.chave in modelo ? { ...c, obrigatorio: modelo[c.chave] } : c));
}
