"use client";

// Partes visuais do gerador de equipes (arena de dados do datahack-equipes.html).

import { type ResultadoGerador, composicao } from "@/modules/gerador/domain/algoritmo";

export const fmt = (v: number, d = 1) => (isNaN(v) ? "—" : v.toFixed(d).replace(".", ","));
export const pad = (n: number) => String(n).padStart(2, "0");
export const reduzido = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function contar<T extends string | number>(xs: T[]): [T, number][] {
  const m = new Map<T, number>();
  xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m.entries()];
}

export const maior = <T,>(rows: [T, number][]) => rows.reduce((a, b) => (b[1] > a[1] ? b : a));

/** Anima os números dos KPIs de 0 até o valor (como no HTML original). */
export function contarAte(container: HTMLElement | null) {
  if (!container || reduzido()) return;
  container.querySelectorAll<HTMLElement>(".v").forEach((el) => {
    if (el.querySelector(".masked")) return;
    const txt = el.textContent ?? "";
    const m = txt.match(/\d+(?:,\d+)?/);
    if (!m || m.index === undefined) return;
    const dec = (m[0].split(",")[1] || "").length;
    const alvo = parseFloat(m[0].replace(",", "."));
    const pre = txt.slice(0, m.index);
    const pos = txt.slice(m.index + m[0].length);
    const t0 = performance.now();
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - t0) / 900);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + (alvo * e).toFixed(dec).replace(".", ",") + pos;
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
}

export function Seg<T extends string>({
  nome,
  valor,
  onChange,
  opcoes,
}: {
  nome: string;
  valor: T;
  onChange: (v: T) => void;
  opcoes: { v: T; r: string }[];
}) {
  return (
    <div className="seg" role="radiogroup">
      {opcoes.map((o) => (
        <span key={o.v} style={{ display: "contents" }}>
          <input
            type="radio"
            name={nome}
            id={`${nome}-${o.v}`}
            value={o.v}
            checked={valor === o.v}
            onChange={() => onChange(o.v)}
          />
          <label htmlFor={`${nome}-${o.v}`}>{o.r}</label>
        </span>
      ))}
    </div>
  );
}

export function Barras({ linhas }: { linhas: [string, number, React.ReactNode][] }) {
  if (!linhas.length) return <p className="hint">Sem dados.</p>;
  const max = Math.max(...linhas.map((l) => l[1]));
  return (
    <div className="hbars">
      {linhas.map(([k, v, extra]) => (
        <div key={k} className={`hb${v === max ? " top" : ""}`}>
          <span className="hb-k">{k}</span>
          <span className="hb-t">
            <i style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className="hb-v">
            {v}
            {extra}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MetricasEquipes({ r, ref }: { r: ResultadoGerador; ref: React.Ref<HTMLElement> }) {
  const sems = r.equipes.map((t) => t.sem);
  const ganho = r.aleatorio / Math.max(r.nosso, 1e-6);
  return (
    <section className="kpis" ref={ref} aria-label="Métricas de equilíbrio">
      <div className="kpi">
        <div className="v">{r.equipes.length}</div>
        <div className="l">equipes ({composicao(r.tamanhos)})</div>
      </div>
      <div className="kpi">
        <div className="v">
          {fmt(Math.min(...sems))}º–{fmt(Math.max(...sems))}º
        </div>
        <div className="l">faixa do semestre médio das equipes</div>
      </div>
      <div className="kpi">
        <div className="v">±{fmt(r.nosso * 100, 2)}</div>
        <div className="l">desvio do score entre equipes (0–100)</div>
      </div>
      <div className="kpi hl">
        <div className="v">{ganho >= 100 ? ">100" : fmt(ganho, 1)}×</div>
        <div className="l">mais equilibrado que sorteio aleatório (±{fmt(r.aleatorio * 100, 1)})</div>
      </div>
    </section>
  );
}

export function Matriz({ r, usarNota, nf }: { r: ResultadoGerador; usarNota: boolean; nf: (v: number) => string }) {
  const sems = [...new Set(r.P.map((p) => p.sem))].sort((a, b) => a - b);
  const cursos = [...new Set(r.P.map((p) => p.curso).filter(Boolean))].sort();
  const maxS = Math.max(1, ...r.equipes.flatMap((t) => sems.map((s) => t.m.filter((p) => p.sem === s).length)));
  const maxC = Math.max(1, ...r.equipes.flatMap((t) => cursos.map((c) => t.m.filter((p) => p.curso === c).length)));
  const cel = (key: string, c: number, mx: number, sep = false) => (
    <td
      key={key}
      className={sep ? "sep" : ""}
      style={{
        background: c ? `color-mix(in srgb, var(--accent) ${Math.round(18 + (62 * c) / mx)}%, transparent)` : "transparent",
        color: c ? undefined : "var(--muted)",
      }}
    >
      {c || "·"}
    </td>
  );
  return (
    <section className="card">
      <div className="card-h">
        <h3>Mapa equipe × semestre{cursos.length ? " × curso" : ""}</h3>
        <span className="hint">quantos alunos de cada grupo caíram em cada equipe</span>
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="row">Equipe</th>
              {sems.map((s) => (
                <th key={s}>{s}º</th>
              ))}
              {cursos.map((c, i) => (
                <th key={c} className={i ? "" : "sep"}>
                  {c}
                </th>
              ))}
              <th>sem. méd.</th>
              {usarNota && <th>nota méd.</th>}
            </tr>
          </thead>
          <tbody>
            {r.equipes.map((t) => (
              <tr key={t.n}>
                <th className="row">{pad(t.n)}</th>
                {sems.map((s) => cel(`s${s}`, t.m.filter((p) => p.sem === s).length, maxS))}
                {cursos.map((c, i) => cel(`c${c}`, t.m.filter((p) => p.curso === c).length, maxC, i === 0))}
                <td className="stat">{fmt(t.sem)}º</td>
                {usarNota && <td className="stat">{nf(t.nota)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CardEquipe({
  t,
  i,
  nome,
  r,
  usarNota,
  nf,
}: {
  t: ResultadoGerador["equipes"][number];
  i: number;
  nome: string;
  r: ResultadoGerador;
  usarNota: boolean;
  nf: (v: number) => string;
}) {
  const sMin = Math.min(...r.P.map((p) => p.sem));
  const sMax = Math.max(...r.P.map((p) => p.sem));
  const maxScore = Math.max(...r.equipes.map((e) => e.score), r.G.score) * 1.15 || 1;
  const cor = (sem: number) => {
    const k = sMax > sMin ? (sem - sMin) / (sMax - sMin) : 0.5;
    return `color-mix(in srgb, color-mix(in oklab, var(--cy) ${Math.round((1 - k) * 100)}%, var(--mg)) 26%, transparent)`;
  };
  const numero = nome.replace(/^Equipe\s*/, "");
  return (
    <article className="team" style={{ "--i": i } as React.CSSProperties}>
      <div className="team-h">
        <h3>
          <small>Equipe</small>
          {numero}
        </h3>
        <span className="n">
          {t.m.length} pessoas · {t.distinct} sem.
          {t.cursos > 0 && (
            <>
              <br />
              {t.cursos} curso{t.cursos > 1 ? "s" : ""}
            </>
          )}
        </span>
      </div>
      <ul>
        {t.m.map((p) => (
          <li key={p.email}>
            <span className="sem" style={{ background: cor(p.sem) }}>
              {p.sem}º
            </span>
            <span className="nm">
              {p.nome}
              {p.curso && <span className="cur">{p.curso}</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="bar" title={`score médio ${fmt(t.score * 100)}`}>
        <i style={{ width: `${(t.score / maxScore) * 100}%` }} />
        <u style={{ left: `${(r.G.score / maxScore) * 100}%` }} />
      </div>
      <div className="team-f">
        <span>
          sem. médio<b>{fmt(t.sem)}º</b>
        </span>
        {usarNota ? (
          <>
            <span>
              nota média<b>{nf(t.nota)}</b>
            </span>
            <span>
              score<b>{fmt(t.score * 100)}</b>
            </span>
          </>
        ) : (
          <>
            <span>
              integrantes<b>{t.m.length}</b>
            </span>
            <span>
              semestres<b>{t.distinct}</b>
            </span>
          </>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- ícones (mesmos do HTML)

export function IconeX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconeMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function IconeTelao() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}
