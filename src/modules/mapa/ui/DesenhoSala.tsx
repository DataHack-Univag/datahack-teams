import type { PointerEvent as EventoPonteiro } from "react";
import { medida, TIPOS } from "@/modules/mapa/domain/catalogo";
import { lugaresDoElemento, type Ocupacao } from "@/modules/mapa/domain/alocacao";
import { caixa, type Elemento, type Sala } from "@/modules/mapa/domain/tipos";

// Desenho da sala em SVG, em centímetros (1 unidade = 1 cm): editor, miniaturas e croqui
// usam este mesmo desenho, então o croqui sai igual ao que se vê na tela e em escala.

const ESTILO: Record<(typeof TIPOS)[keyof typeof TIPOS]["estilo"], { fill: string; stroke: string; tracejado?: boolean }> = {
  equipe: { fill: "color-mix(in srgb, var(--marca) 18%, var(--superficie-solida))", stroke: "var(--marca)" },
  movel: { fill: "var(--superficie-solida)", stroke: "var(--borda-forte)" },
  estrutura: { fill: "color-mix(in srgb, var(--suave) 55%, transparent)", stroke: "var(--suave)" },
  abertura: { fill: "color-mix(in srgb, var(--verde) 45%, transparent)", stroke: "var(--verde)" },
  zona: { fill: "color-mix(in srgb, var(--magenta) 8%, transparent)", stroke: "var(--magenta)", tracejado: true },
  texto: { fill: "none", stroke: "none" },
};

/** Amostra da cor/traço de um tipo, para a legenda do croqui. */
export function AmostraTipo({ tipo }: { tipo: keyof typeof TIPOS }) {
  const est = ESTILO[TIPOS[tipo].estilo];
  return (
    <svg viewBox="0 0 24 16" className="inline-block h-3 w-5 align-[-1px]" aria-hidden>
      {TIPOS[tipo].estilo === "texto" ? (
        <text x="12" y="13" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)">
          A
        </text>
      ) : (
        <rect x="1" y="1" width="22" height="14" rx="2" fill={est.fill} stroke={est.stroke} strokeWidth="1.5" strokeDasharray={est.tracejado ? "4 3" : undefined} />
      )}
    </svg>
  );
}

/** Os lugares de uma bancada: divisões, quem está em cada um (ícone + nome) ou "livre". */
/** Cor do alerta de um lugar (pedido de ajuda da equipe). */
export type Alerta = "duvida" | "problema" | "atendimento";
const COR_ALERTA: Record<Alerta, string> = { duvida: "#f59e0b", problema: "#ef4444", atendimento: "#10b981" };

function Lugares({
  e,
  quem,
  fonte,
  aoTocar,
  destacado,
  alertas,
}: {
  e: Elemento;
  quem: Ocupacao[string];
  fonte: number;
  aoTocar?: (elementoId: string, lugar: number) => void;
  destacado?: string | null;
  alertas?: Record<string, Alerta>;
}) {
  const lugares = lugaresDoElemento(e);
  const c = caixa(e);
  const deitada = c.largura >= c.profundidade;
  return (
    <g>
      {e.rotulo && (
        <text x={c.x + 6} y={c.y + 6} fontSize={Math.max(9, fonte * 0.55)} fontWeight={700} fill="var(--suave)" dominantBaseline="hanging" pointerEvents="none">
          {e.rotulo}
        </text>
      )}
      {lugares.map((l, i) => {
        const equipe = quem[i];
        const chave = `${e.id}:${l.lugar}`;
        const menor = Math.min(l.largura, l.profundidade);
        const icone = Math.max(12, Math.min(fonte * 1.6, menor * 0.42));
        const nomeTam = Math.max(8, Math.min(fonte * 0.6, menor * 0.18));
        const cabem = Math.max(4, Math.floor(l.largura / (nomeTam * 0.58)));
        const nome = equipe ? (equipe.nome.length > cabem ? equipe.nome.slice(0, cabem - 1) + "…" : equipe.nome) : "livre";
        return (
          <g
            key={chave}
            data-lugar={chave}
            onClick={aoTocar ? () => aoTocar(e.id, l.lugar) : undefined}
            style={aoTocar ? { cursor: "pointer" } : undefined}
          >
            <title>{equipe ? `${equipe.nome} · ${e.rotulo ?? "bancada"}, lugar ${l.lugar}` : `${e.rotulo ?? "Bancada"}, lugar ${l.lugar}: livre`}</title>
            {equipe && alertas?.[equipe.id] && (
              // pedido de ajuda: o lugar pisca (para quem não prefere menos movimento)
              <rect
                x={l.x - 6}
                y={l.y - 6}
                width={l.largura + 12}
                height={l.profundidade + 12}
                rx={8}
                fill={COR_ALERTA[alertas[equipe.id]]}
                fillOpacity={0.25}
                stroke={COR_ALERTA[alertas[equipe.id]]}
                strokeWidth={6}
                className={alertas[equipe.id] === "atendimento" ? undefined : "motion-safe:animate-pulse"}
                pointerEvents="none"
              />
            )}
            <rect
              x={l.x + 3}
              y={l.y + 3}
              width={l.largura - 6}
              height={l.profundidade - 6}
              rx={4}
              fill={equipe ? "color-mix(in srgb, var(--marca) 22%, transparent)" : "transparent"}
              stroke={destacado === chave ? "var(--magenta)" : "transparent"}
              strokeWidth={destacado === chave ? 5 : 0}
            />
            {i > 0 && (
              // divisão entre um lugar e o anterior: vertical se a bancada está deitada, horizontal se em pé
              <line
                x1={deitada ? l.x : l.x + 4}
                y1={deitada ? l.y + 4 : l.y}
                x2={deitada ? l.x : l.x + l.largura - 4}
                y2={deitada ? l.y + l.profundidade - 4 : l.y}
                stroke="var(--marca)"
                strokeWidth={2}
                strokeDasharray="6 5"
                pointerEvents="none"
              />
            )}
            {equipe && (
              <text x={l.x + l.largura / 2} y={l.y + l.profundidade / 2 - nomeTam * 0.6} textAnchor="middle" dominantBaseline="central" fontSize={icone} pointerEvents="none">
                {equipe.icone ?? "●"}
              </text>
            )}
            <text
              x={l.x + l.largura / 2}
              y={equipe ? l.y + l.profundidade / 2 + icone * 0.55 : l.y + l.profundidade / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={nomeTam}
              fontWeight={equipe ? 700 : 400}
              fill={equipe ? "var(--foreground)" : "var(--suave)"}
              pointerEvents="none"
            >
              {nome}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function DesenhoSala({
  sala,
  elementos,
  selecionado,
  grade = false,
  fundo = false,
  legendas = true,
  aoPressionar,
  idSvg,
  className = "",
  rotuloAcessivel,
  ocupacao,
  aoTocarLugar,
  lugarDestacado,
  alertas,
}: {
  sala: Pick<Sala, "nome" | "largura_cm" | "profundidade_cm" | "fundo">;
  elementos: Elemento[];
  selecionado?: string | null;
  grade?: boolean;
  fundo?: boolean;
  /** Rótulos e medidas da sala (desligado nas miniaturas). */
  legendas?: boolean;
  aoPressionar?: (e: Elemento, ev: EventoPonteiro<SVGGElement>) => void;
  idSvg?: string;
  className?: string;
  rotuloAcessivel?: string;
  /** Equipes em cada lugar das bancadas (mostra os lugares divididos, com ícone e nome). */
  ocupacao?: Ocupacao;
  aoTocarLugar?: (elementoId: string, lugar: number) => void;
  /** "elementoId:lugar" em destaque (onde a equipe escolhida está ou vai). */
  lugarDestacado?: string | null;
  /** Equipes com pedido de ajuda: o lugar delas fica em destaque (por id da equipe). */
  alertas?: Record<string, Alerta>;
}) {
  const L = sala.largura_cm;
  const P = sala.profundidade_cm;
  const margem = legendas ? Math.max(40, Math.round(Math.max(L, P) * 0.06)) : 10;
  const fonte = Math.max(12, Math.min(30, Math.round(Math.max(L, P) / 40)));

  return (
    <svg
      id={idSvg}
      viewBox={`${-margem} ${-margem} ${L + margem * 2} ${P + margem * 2}`}
      className={`block w-full select-none ${className}`}
      role="img"
      aria-label={rotuloAcessivel ?? `Mapa da sala ${sala.nome}: ${medida(L)} por ${medida(P)}, ${elementos.length} elemento(s)`}
      fontFamily="DM Sans, system-ui, sans-serif"
    >
      {grade && (
        <defs>
          <pattern id={`grade-${idSvg ?? "sala"}`} width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="var(--borda)" strokeWidth="1" />
          </pattern>
        </defs>
      )}

      {/* chão da sala */}
      <rect x={0} y={0} width={L} height={P} fill="var(--superficie-solida)" />
      {fundo && sala.fundo && <image href={sala.fundo} x={0} y={0} width={L} height={P} preserveAspectRatio="none" opacity={0.35} />}
      {grade && <rect x={0} y={0} width={L} height={P} fill={`url(#grade-${idSvg ?? "sala"})`} />}
      <rect x={0} y={0} width={L} height={P} fill="none" stroke="var(--foreground)" strokeWidth={Math.max(4, fonte / 3)} />

      {elementos.map((e) => {
        const c = caixa(e);
        const tipo = TIPOS[e.tipo];
        const est = ESTILO[tipo.estilo];
        const ativo = e.id === selecionado;
        const comLugares = !!ocupacao && !!e.lugares && !!ocupacao[e.id];
        const texto = comLugares ? "" : (e.rotulo ?? (tipo.estilo === "equipe" ? tipo.rotulo : ""));
        const tamanho = Math.min(fonte, Math.max(9, Math.min(c.largura, c.profundidade) * 0.45));
        return (
          <g
            key={e.id}
            onPointerDown={aoPressionar ? (ev) => aoPressionar(e, ev) : undefined}
            style={aoPressionar ? { cursor: "grab" } : undefined}
            data-elemento={e.id}
          >
            <title>{`${tipo.rotulo}${e.rotulo ? ` ${e.rotulo}` : ""} · ${medida(e.largura_cm)} × ${medida(e.profundidade_cm)}${e.lugares ? ` · ${e.lugares} equipe(s)` : ""}`}</title>
            {tipo.estilo !== "texto" && (
              <rect
                x={c.x}
                y={c.y}
                width={c.largura}
                height={c.profundidade}
                rx={tipo.estilo === "equipe" || tipo.estilo === "movel" ? 6 : 0}
                fill={est.fill}
                stroke={ativo ? "var(--magenta)" : est.stroke}
                strokeWidth={ativo ? 5 : 2}
                strokeDasharray={est.tracejado ? "12 8" : undefined}
              />
            )}
            {texto && (
              <text
                x={c.x + c.largura / 2}
                y={c.y + c.profundidade / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tipo.estilo === "texto" ? fonte : tamanho}
                fontWeight={600}
                fill="var(--foreground)"
                pointerEvents="none"
              >
                {texto}
              </text>
            )}
            {comLugares && (
              <Lugares e={e} quem={ocupacao![e.id]} fonte={fonte} aoTocar={aoTocarLugar} destacado={lugarDestacado} alertas={alertas} />
            )}
            {!comLugares && legendas && e.lugares && e.lugares > 1 && c.profundidade > tamanho * 2.6 && (
              <text
                x={c.x + c.largura / 2}
                y={c.y + c.profundidade / 2 + tamanho}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tamanho * 0.7}
                fill="var(--suave)"
                pointerEvents="none"
              >
                {e.lugares} equipes
              </text>
            )}
            {ativo && <rect x={c.x - 8} y={c.y - 8} width={c.largura + 16} height={c.profundidade + 16} fill="none" stroke="var(--magenta)" strokeWidth={2} strokeDasharray="6 6" pointerEvents="none" />}
          </g>
        );
      })}

      {legendas && (
        <g fontSize={fonte} fill="var(--suave)">
          <text x={L / 2} y={-margem / 2} textAnchor="middle" dominantBaseline="central">
            {medida(L)}
          </text>
          <text x={-margem / 2} y={P / 2} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${-margem / 2} ${P / 2})`}>
            {medida(P)}
          </text>
          {/* régua de 1 m: dá a escala em qualquer impressão */}
          <g transform={`translate(0 ${P + margem / 2})`}>
            <rect x={0} y={-3} width={100} height={6} fill="var(--foreground)" />
            <text x={110} y={0} dominantBaseline="central" fontSize={fonte * 0.8}>
              1 m
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
