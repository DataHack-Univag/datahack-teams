"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { aplicarEquipes } from "@/app/actions";
import {
  composicao,
  gerarEquipes,
  media,
  mediaReal,
  tamanhosEquipes,
  type AlunoGerador,
  type Imputacao,
  type ResultadoGerador,
} from "@/lib/gerador";

export type AlunoComEquipe = AlunoGerador & { temEquipe: boolean };

const fmt = (v: number, d = 1) => (isNaN(v) ? "—" : v.toFixed(d).replace(".", ","));
const pad = (n: number) => String(n).padStart(2, "0");
const reduzido = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const PASSOS = (n: number) => [
  `Lendo ${n} inscritos…`,
  "Normalizando semestre e nota…",
  "Testando 40.000 trocas entre equipes…",
  "Comparando com 200 sorteios aleatórios…",
];

/**
 * Gerador de equipes com o visual "arena de dados" do datahack-equipes.html.
 * Lê os participantes do banco, monta as equipes e cadastra a combinação no sistema.
 * A nota individual nunca aparece: só médias de turma e de equipe, e só sob pedido.
 */
export function Gerador({
  alunos,
  totalEquipes,
  semSemestre,
}: {
  alunos: AlunoComEquipe[];
  totalEquipes: number;
  semSemestre: string[];
}) {
  const router = useRouter();
  const nSemEquipe = alunos.filter((a) => !a.temEquipe).length;

  // ---------------------------------------------------------------- estado
  const [fonte, setFonte] = useState<"sem_equipe" | "todos">(nSemEquipe > 0 ? "sem_equipe" : "todos");
  const [usarNota, setUsarNota] = useState(true);
  const [peso, setPeso] = useState(50);
  const [imputacao, setImputacao] = useState<Imputacao>("med");
  const [tamanho, setTamanho] = useState(5);
  const [semente, setSemente] = useState("datahack2026");
  const [variacao, setVariacao] = useState(0);
  const [mostrarMedias, setMostrarMedias] = useState(false);
  const [resultado, setResultado] = useState<ResultadoGerador | null>(null);
  const [turmaGerada, setTurmaGerada] = useState<AlunoComEquipe[]>([]);
  const [passo, setPasso] = useState<string | null>(null);
  const [status, setStatus] = useState<{ texto: string; erro?: boolean }>({ texto: "" });
  const [menu, setMenu] = useState(false);
  const [telao, setTelao] = useState(false);
  const [tema, setTema] = useState<"dark" | "light" | null>(null);
  const [salvo, setSalvo] = useState<{ ok?: string; erro?: string } | null>(null);
  const [confirmarSubst, setConfirmarSubst] = useState(false);
  const [salvando, iniciarSalvar] = useTransition();
  const kpisRef = useRef<HTMLElement>(null);
  const kpisTRef = useRef<HTMLElement>(null);

  const turmaAtual = useMemo(
    () => (fonte === "todos" ? alunos : alunos.filter((a) => !a.temEquipe)),
    [alunos, fonte],
  );
  // Depois de gerar, o perfil mostrado é o da turma que foi usada (não muda com o refresh).
  const turma = resultado ? turmaGerada : turmaAtual;
  const tamanhos = tamanhosEquipes(turma.length, tamanho);
  const oculto = usarNota && !mostrarMedias;
  const nf = (v: number) => (isNaN(v) ? "—" : oculto ? "•••" : fmt(v));
  const substitui = fonte === "todos";
  const inicio = substitui ? 1 : totalEquipes + 1;
  const nomeEquipe = (n: number) => `Equipe ${pad(n + inicio - 1)}`;

  // ---------------------------------------------------------------- tema (preferência do navegador)
  useEffect(() => {
    try {
      const t = localStorage.getItem("dh-theme");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (t === "dark" || t === "light") setTema(t);
    } catch {}
  }, []);
  const escuro = () => (tema ? tema === "dark" : !window.matchMedia?.("(prefers-color-scheme: light)").matches);
  function alternarTema() {
    const prox = escuro() ? "light" : "dark";
    setTema(prox);
    try {
      localStorage.setItem("dh-theme", prox);
    } catch {}
  }

  // ---------------------------------------------------------------- animação de contagem dos KPIs
  useEffect(() => contarAte(kpisRef.current), [fonte]);
  useEffect(() => {
    if (resultado) contarAte(kpisTRef.current);
  }, [resultado]);

  // Esc fecha o menu no celular.
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  // Qualquer mudança de critério descarta a combinação atual.
  function mudar<T>(set: (v: T) => void, msg = "Critério alterado. Clique em Gerar equipes para refazer.") {
    return (v: T) => {
      set(v);
      if (resultado) setStatus({ texto: msg });
      setResultado(null);
      setSalvo(null);
      setConfirmarSubst(false);
    };
  }

  // ---------------------------------------------------------------- gerar
  function gerar(novaVariacao: number) {
    const base = turmaAtual;
    if (base.length < 2) {
      setStatus({ texto: "É preciso pelo menos 2 participantes.", erro: true });
      return;
    }
    setVariacao(novaVariacao);
    setSalvo(null);
    setConfirmarSubst(false);
    const calcular = () => {
      const r = gerarEquipes(base, {
        usarNota,
        pesoSem: peso / 100,
        imputacao,
        tamanho,
        semente,
        variacao: novaVariacao,
      });
      setTurmaGerada(base);
      setResultado(r);
      const semN = base.filter((a) => a.semNota).length;
      setStatus({
        texto:
          `Equipes geradas ${usarNota ? `com peso ${peso}% semestre / ${100 - peso}% nota` : "só por semestre"} · semente "${semente}"${novaVariacao ? ` · variação ${novaVariacao}` : ""}.` +
          (usarNota && semN ? ` ${semN} aluno(s) sem nota entraram com nota estimada só para o cálculo.` : ""),
      });
      if (window.matchMedia?.("(max-width:900px)").matches) setMenu(false);
      requestAnimationFrame(() =>
        document.getElementById("teamsTop")?.scrollIntoView({ behavior: reduzido() ? "auto" : "smooth", block: "start" }),
      );
    };

    if (reduzido()) return calcular();
    // Overlay com os passos (o cálculo em si leva ~0,2 s; a pausa é para o efeito no telão).
    const passos = PASSOS(base.length);
    let k = 0;
    setPasso(passos[0]);
    const tick = setInterval(() => {
      k = Math.min(k + 1, passos.length - 1);
      setPasso(passos[k]);
    }, 300);
    setTimeout(() => {
      calcular();
      clearInterval(tick);
      setTimeout(() => setPasso(null), 120);
    }, 1250);
  }

  // ---------------------------------------------------------------- cadastrar
  function cadastrar() {
    if (!resultado) return;
    if (substitui && totalEquipes > 0 && !confirmarSubst) {
      setSalvo({ erro: "Marque a confirmação: as equipes atuais serão apagadas." });
      return;
    }
    iniciarSalvar(async () => {
      const r = await aplicarEquipes(
        resultado.equipes.map((t) => ({ nome: nomeEquipe(t.n), emails: t.m.map((p) => p.email) })),
        substitui,
      );
      setSalvo(r);
      if (r?.ok) router.refresh();
    });
  }

  // ---------------------------------------------------------------- copiar / telão
  function copiar(texto: string, btn: HTMLButtonElement) {
    const antigo = btn.textContent;
    const feito = () => {
      btn.textContent = "Copiado";
      setTimeout(() => (btn.textContent = antigo), 1400);
    };
    navigator.clipboard?.writeText(texto).then(feito, () =>
      setStatus({ texto: "Não foi possível copiar automaticamente.", erro: true }),
    );
  }

  function alternarTelao() {
    const on = !telao;
    setTelao(on);
    try {
      if (on) document.documentElement.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch {}
  }

  // ---------------------------------------------------------------- dados do perfil
  const porSemestre = contar(turma.map((a) => a.sem)).sort((a, b) => a[0] - b[0]);
  const porCurso = contar(turma.map((a) => a.curso).filter(Boolean)).sort((a, b) => b[1] - a[1]);
  const nCursos = porCurso.length;
  const semNota = turma.filter((a) => a.semNota).length;
  const pct = (v: number) => Math.round((v / Math.max(1, turma.length)) * 100) + "%";
  const mostraCR = usarNota && !oculto;
  const crDe = (g: AlunoGerador[]) => {
    if (!mostraCR) return null;
    if (g.filter((p) => !p.semNota).length < 3) return <em>CR —</em>;
    const v = mediaReal(g);
    return <em>{isNaN(v) ? "s/ nota" : "CR " + fmt(v)}</em>;
  };

  const titulo = resultado ? (
    <>
      <span className="grad-text">{resultado.equipes.length} equipes</span> <small>{turma.length} alunos</small>
    </>
  ) : (
    <>
      <span className="grad-text">{turma.length} inscritos</span> <small>aguardando equipes</small>
    </>
  );

  return (
    <div className="arena" data-theme={tema ?? undefined}>
      {/* Fontes do layout original (se não carregarem, cai na fonte do sistema). */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;600&display=swap"
        precedence="default"
      />
      <RedeDados tema={tema} />

      <div className={`app${telao ? " telao" : ""}`}>
        {/* ================================================ menu lateral */}
        <aside className={`side${menu ? " open" : ""}`} aria-label="Controles">
          <div className="side-head">
            <div className="logo">
              <span className="logo-plate">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-datahack.png" alt="DATAHack Univag" />
              </span>
              <small>Formação de equipes</small>
            </div>
            <button className="ghost icon close-side" onClick={() => setMenu(false)} aria-label="Fechar menu">
              <IconeX />
            </button>
          </div>

          <div className="side-body">
            <section className="group">
              <div className="group-h">
                <b>1</b> Participantes
              </div>
              <Seg
                nome="fonte"
                valor={fonte}
                onChange={mudar(setFonte)}
                opcoes={[
                  { v: "sem_equipe", r: `Sem equipe (${nSemEquipe})` },
                  { v: "todos", r: `Todos (${alunos.length})` },
                ]}
              />
              <span className="hint">
                {substitui
                  ? "Refaz todas as equipes. Ao cadastrar, as equipes atuais são substituídas."
                  : "Só quem ainda não tem equipe. As equipes atuais continuam como estão."}
              </span>
            </section>

            <section className="group">
              <div className="group-h">
                <b>2</b> Critério
              </div>
              <Seg
                nome="modo"
                valor={usarNota ? "both" : "sem"}
                onChange={(v) => mudar(setUsarNota)(v === "both")}
                opcoes={[
                  { v: "both", r: "Semestre + nota" },
                  { v: "sem", r: "Só semestre" },
                ]}
              />
              {usarNota && (
                <div className="group">
                  <div className="field">
                    <label htmlFor="wSem">Peso semestre × nota</label>
                    <input
                      type="range"
                      id="wSem"
                      min={0}
                      max={100}
                      value={peso}
                      onChange={(e) => mudar(setPeso)(+e.target.value)}
                    />
                    <div className="weights">
                      <span>
                        Semestre <b>{peso}%</b>
                      </span>
                      <span>
                        Nota <b>{100 - peso}%</b>
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="imp">
                      Aluno sem nota <span className="hint">ex.: calouro sem prova</span>
                    </label>
                    <select id="imp" value={imputacao} onChange={(e) => mudar(setImputacao)(e.target.value as Imputacao)}>
                      <option value="med">Nota neutra (mediana da turma)</option>
                      <option value="semmed">Mediana do próprio semestre</option>
                      <option value="min">Nota mínima da turma</option>
                    </select>
                  </div>
                </div>
              )}
            </section>

            <section className="group">
              <div className="group-h">
                <b>3</b> Equipes
              </div>
              <div className="row2">
                <div className="field">
                  <label htmlFor="size">Tamanho base</label>
                  <input
                    type="number"
                    id="size"
                    min={2}
                    max={20}
                    value={tamanho}
                    onChange={(e) =>
                      mudar(setTamanho, "Tamanho alterado. Clique em Gerar equipes para refazer.")(
                        Math.max(2, Math.min(20, +e.target.value || 2)),
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="seed">Semente</label>
                  <input type="text" id="seed" value={semente} onChange={(e) => mudar(setSemente)(e.target.value)} />
                </div>
              </div>
              <span className="hint">Sobras viram equipes de +1. A mesma semente sempre gera o mesmo resultado.</span>
            </section>
          </div>

          <div className="side-foot">
            {resultado ? (
              <button className="primary" onClick={() => gerar(variacao + 1)}>
                Nova combinação
              </button>
            ) : (
              <button className="primary" onClick={() => gerar(0)} disabled={turma.length < 2}>
                Gerar equipes
              </button>
            )}
            <div className={`status${status.erro ? " err" : ""}`} role="status">
              {status.texto || `${turma.length} inscritos prontos. Clique em Gerar equipes quando quiser.`}
            </div>
          </div>
        </aside>
        <div className={`backdrop${menu ? " on" : ""}`} onClick={() => setMenu(false)} />

        {/* ================================================ palco */}
        <main className="main">
          <div className="topbar">
            <button className="open-side" onClick={() => setMenu(true)} aria-label="Abrir controles">
              <IconeMenu />
              Ajustes
            </button>
            <h2>{titulo}</h2>
            <div className="tools">
              {usarNota && resultado && (
                <button
                  className="toggle"
                  aria-pressed={mostrarMedias}
                  onClick={() => setMostrarMedias((m) => !m)}
                  title="Mostra só médias de turma, grupo e equipe. Nota individual nunca aparece."
                >
                  {mostrarMedias ? "Ocultar médias" : "Mostrar médias"}
                </button>
              )}
              <button
                disabled={!resultado}
                onClick={(e) =>
                  resultado &&
                  copiar(
                    resultado.equipes
                      .map(
                        (t) =>
                          `${nomeEquipe(t.n)}\n` +
                          t.m.map((p) => `- ${p.nome} (${p.curso ? p.curso + ", " : ""}${p.sem}º sem)`).join("\n"),
                      )
                      .join("\n\n"),
                    e.currentTarget,
                  )
                }
              >
                Copiar lista
              </button>
              <button
                disabled={!resultado}
                onClick={(e) =>
                  resultado &&
                  copiar(
                    "equipe;nome;email;curso;semestre\n" +
                      resultado.equipes
                        .flatMap((t) => t.m.map((p) => `${nomeEquipe(t.n)};${p.nome};${p.email};${p.curso};${p.sem}`))
                        .join("\n"),
                    e.currentTarget,
                  )
                }
              >
                Copiar CSV
              </button>
              <button className="icon" id="telaoBtn" aria-pressed={telao} onClick={alternarTelao} title="Modo telão" aria-label="Modo telão">
                <IconeTelao />
              </button>
              <button className="icon" onClick={alternarTema} title="Alternar tema claro/escuro" aria-label="Alternar tema claro/escuro">
                <IconeTema tema={tema} />
              </button>
            </div>
          </div>

          <div className="content">
            {!resultado && (
              <section className="hero">
                <span className="hero-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-datahack.png" alt="DATAHack Univag" />
                </span>
                <span className="chip">
                  <i />
                  DATAHack Univag 2026 · 09–10 out · Várzea Grande – MT
                </span>
                <h3>
                  Transforme dados em <span className="grad-text">decisão</span>
                </h3>
                <p>
                  Até a formação das equipes é decidida por dados. Cada inscrito recebe um score ponderado por semestre e
                  nota, e o algoritmo monta equipes com força parecida e mistura de semestres e cursos. A nota de cada
                  aluno nunca aparece na tela: só médias de turma e de equipe, e só quando alguém pede para mostrar.
                </p>
                <ol className="steps">
                  {[
                    "Os inscritos já vêm do cadastro de participantes.",
                    "Escolha o critério e o peso entre semestre e nota.",
                    "Gere, projete no telão e cadastre as equipes no sistema.",
                  ].map((t, i) => (
                    <li key={i} style={{ "--i": i } as React.CSSProperties}>
                      <b className="grad-text">{pad(i + 1)}</b>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {semSemestre.length > 0 && (
              <div className="avisos">
                <div className="aviso">
                  {semSemestre.length} aluno(s) sem semestre cadastrado ficaram de fora: {semSemestre.join(", ")}.{" "}
                  <Link href="/admin/participantes" style={{ textDecoration: "underline" }}>
                    Corrigir em Participantes
                  </Link>
                  .
                </div>
              </div>
            )}

            <div className="results">
              <div className="sec-h">
                <h2>
                  Perfil da <span className="grad-text">turma</span>
                </h2>
                <span className="hint">calculado direto do cadastro de participantes</span>
              </div>

              <section className="kpis" ref={kpisRef} aria-label="Resumo dos inscritos">
                <div className="kpi">
                  <div className="v">{turma.length}</div>
                  <div className="l">inscritos</div>
                </div>
                <div className="kpi">
                  <div className="v">{new Set(turma.map((a) => a.sem)).size}</div>
                  <div className="l">semestres diferentes</div>
                </div>
                {nCursos > 0 && (
                  <div className="kpi">
                    <div className="v">{nCursos}</div>
                    <div className="l">cursos</div>
                  </div>
                )}
                <div className="kpi">
                  <div className="v">{turma.length ? fmt(media(turma.map((a) => a.sem))) + "º" : "—"}</div>
                  <div className="l">semestre médio</div>
                </div>
                {usarNota && (
                  <div className="kpi">
                    <div className="v">{oculto ? <span className="masked">•••</span> : fmt(mediaReal(turma))}</div>
                    <div className="l">nota média{semNota ? ` · ${semNota} sem nota` : ""}</div>
                  </div>
                )}
                <div className="kpi hl">
                  <div className="v">{turma.length >= 2 ? tamanhos.length : 0}</div>
                  <div className="l">equipes previstas ({composicao(tamanhos)})</div>
                </div>
              </section>

              <section className="dash" aria-label="Perfil dos inscritos">
                <div className="dash-card">
                  <div className="dash-h">
                    <h3>Inscritos por semestre</h3>
                    {porSemestre.length > 0 && (
                      <span className="hint">
                        mais inscritos: {maior(porSemestre)[0]}º ({pct(maior(porSemestre)[1])})
                      </span>
                    )}
                  </div>
                  <Barras
                    linhas={porSemestre.map(([k, v]) => [`${k}º`, v, crDe(turma.filter((p) => p.sem === k))])}
                  />
                </div>
                <div className="dash-card">
                  <div className="dash-h">
                    <h3>Inscritos por curso</h3>
                    {porCurso.length > 0 && (
                      <span className="hint">
                        {nCursos} cursos · {porCurso[0][0]} lidera com {pct(porCurso[0][1])}
                      </span>
                    )}
                  </div>
                  <Barras linhas={porCurso.map(([k, v]) => [k, v, crDe(turma.filter((p) => p.curso === k))])} />
                </div>
              </section>

              {!resultado && (
                <section className="ready">
                  <div>
                    <h3>
                      Turma carregada. Agora, as <span className="grad-text">equipes</span>.
                    </h3>
                    <p>
                      {turma.length} inscritos viram {turma.length >= 2 ? tamanhos.length : 0} equipes (
                      {composicao(tamanhos)}). Confira o critério no menu e clique para revelar o resultado.
                    </p>
                  </div>
                  <button className="primary" onClick={() => gerar(0)} disabled={turma.length < 2}>
                    Gerar equipes
                  </button>
                </section>
              )}

              {resultado && (
                <div className="teams-wrap">
                  <div className="sec-h" id="teamsTop">
                    <h2>
                      Equilíbrio das <span className="grad-text">equipes</span>
                    </h2>
                    <span className="hint">
                      {usarNota ? `peso ${peso}% semestre · ${100 - peso}% nota` : "só semestre"} · semente &quot;
                      {semente}&quot;{variacao ? ` · variação ${variacao}` : ""}
                    </span>
                  </div>

                  <MetricasEquipes r={resultado} ref={kpisTRef} />

                  {/* ------------------------------------ cadastrar esta combinação */}
                  <section className="ready salvar">
                    {salvo?.ok ? (
                      <>
                        <div>
                          <h3>
                            Combinação <span className="grad-text">cadastrada</span>!
                          </h3>
                          <p>{salvo.ok}</p>
                        </div>
                        <div className="ok">
                          <Link href="/admin">Ver equipes no sistema →</Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h3>
                            Gostou? <span className="grad-text">Cadastre esta combinação</span>.
                          </h3>
                          <p>
                            {resultado.equipes.length} equipes ({nomeEquipe(1)} a {nomeEquipe(resultado.equipes.length)})
                            com {turma.length} alunos. Cada aluno passa a ver a própria equipe ao entrar e cadastra o
                            repositório GitHub. Não gostou? Use <b>Nova combinação</b> no menu.
                          </p>
                        </div>
                        <div className="opts">
                          {substitui && totalEquipes > 0 && (
                            <label className="opt">
                              <input
                                type="checkbox"
                                checked={confirmarSubst}
                                onChange={(e) => setConfirmarSubst(e.target.checked)}
                              />
                              <span>
                                Apagar as {totalEquipes} equipe(s) atuais (com repositórios e links) e substituir por estas.
                              </span>
                            </label>
                          )}
                          <div className="acoes">
                            <button className="primary" onClick={cadastrar} disabled={salvando}>
                              {salvando ? "Cadastrando…" : "Cadastrar estas equipes"}
                            </button>
                            <button onClick={() => gerar(variacao + 1)} disabled={salvando}>
                              Nova combinação
                            </button>
                          </div>
                          {salvo?.erro && <p className="erro">{salvo.erro}</p>}
                        </div>
                      </>
                    )}
                  </section>

                  <Matriz r={resultado} usarNota={usarNota} nf={nf} />

                  <section style={{ display: "grid", gap: 14 }}>
                    <div className="sec-h">
                      <h2>
                        As <span className="grad-text">equipes</span>
                      </h2>
                      <span className="hint">barra = score médio · traço rosa = média geral</span>
                    </div>
                    <div className="teams">
                      {resultado.equipes.map((t, i) => (
                        <CardEquipe key={`${variacao}-${t.n}`} t={t} i={i} nome={nomeEquipe(t.n)} r={resultado} usarNota={usarNota} nf={nf} />
                      ))}
                    </div>
                  </section>

                  <details className="method">
                    <summary>Como a decisão é tomada</summary>
                    <ol>
                      <li>Semestre e nota são normalizados para 0–1 dentro da turma.</li>
                      <li>
                        Cada aluno ganha <code>score = peso_sem × semestre + peso_nota × nota</code>. Quem ainda não tem
                        nota recebe uma nota estimada só para o cálculo (por padrão a mediana da turma), que nunca aparece
                        na tela.
                      </li>
                      <li>Uma distribuição em serpentina (1→N, N→1) espalha os maiores scores.</li>
                      <li>
                        Um otimizador testa 40.000 trocas e mantém as que aproximam o score, o semestre e a nota de cada
                        equipe da média geral, penalizando alunos do mesmo semestre, do mesmo curso ou sem nota na mesma
                        equipe.
                      </li>
                      <li>O resultado é comparado com 200 sorteios aleatórios para mostrar o ganho.</li>
                    </ol>
                  </details>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {passo && (
        <div className="overlay" role="status" aria-live="polite">
          <div className="ov-box">
            <div className="ring" aria-hidden="true" />
            <div className="ov-title">
              Formando <span className="grad-text">equipes</span>
            </div>
            <div className="ov-step">{passo}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================ partes

function contar<T extends string | number>(xs: T[]): [T, number][] {
  const m = new Map<T, number>();
  xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m.entries()];
}

const maior = <T,>(rows: [T, number][]) => rows.reduce((a, b) => (b[1] > a[1] ? b : a));

/** Anima os números dos KPIs de 0 até o valor (como no HTML original). */
function contarAte(container: HTMLElement | null) {
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

function Seg<T extends string>({
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

function Barras({ linhas }: { linhas: [string, number, React.ReactNode][] }) {
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

function MetricasEquipes({ r, ref }: { r: ResultadoGerador; ref: React.Ref<HTMLElement> }) {
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

function Matriz({ r, usarNota, nf }: { r: ResultadoGerador; usarNota: boolean; nf: (v: number) => string }) {
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

function CardEquipe({
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

/** Fundo animado: rede de dados (pontos ligados por linhas), como no HTML original. */
function RedeDados({ tema }: { tema: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const cx = cv?.getContext("2d");
    if (!cv || !cx) return;
    let nodes: { x: number; y: number; vx: number; vy: number }[] = [];
    let W = 0,
      H = 0,
      raf = 0;
    const cor = () =>
      getComputedStyle(cv.closest(".arena") ?? document.documentElement).getPropertyValue("--net").trim() ||
      "140,160,255";
    let NET = cor();

    const dimensionar = () => {
      const DPR = Math.min(2, window.devicePixelRatio || 1);
      W = innerWidth;
      H = innerHeight;
      cv.width = W * DPR;
      cv.height = H * DPR;
      cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.round(Math.min(70, (W * H) / 22000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    };
    const desenhar = () => {
      cx.clearRect(0, 0, W, H);
      const L = 130;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < L) {
            cx.strokeStyle = `rgba(${NET},${(1 - d / L) * 0.35})`;
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(a.x, a.y);
            cx.lineTo(b.x, b.y);
            cx.stroke();
          }
        }
      }
      for (const a of nodes) {
        cx.fillStyle = `rgba(${NET},.7)`;
        cx.beginPath();
        cx.arc(a.x, a.y, 1.6, 0, 6.283);
        cx.fill();
      }
    };
    const loop = () => {
      for (const a of nodes) {
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
      }
      desenhar();
      raf = requestAnimationFrame(loop);
    };

    dimensionar();
    // Espera o tema aplicar antes de ler a cor.
    requestAnimationFrame(() => {
      NET = cor();
      if (reduzido()) desenhar();
      else loop();
    });
    const aoRedimensionar = () => {
      dimensionar();
      if (reduzido()) desenhar();
    };
    const aoOcultar = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduzido()) loop();
    };
    addEventListener("resize", aoRedimensionar);
    document.addEventListener("visibilitychange", aoOcultar);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", aoRedimensionar);
      document.removeEventListener("visibilitychange", aoOcultar);
    };
  }, [tema]);

  return <canvas id="bgfx" ref={ref} aria-hidden="true" />;
}

// ---------------------------------------------------------------- ícones (mesmos do HTML)

function IconeX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function IconeMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

function IconeTelao() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

function IconeTema({ tema }: { tema: string | null }) {
  // Sol no escuro (vai para o claro), lua no claro.
  const [escuro, setEscuro] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEscuro(tema ? tema === "dark" : !window.matchMedia?.("(prefers-color-scheme: light)").matches);
  }, [tema]);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {escuro ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      ) : (
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      )}
    </svg>
  );
}
