"use client";

import { useState } from "react";
import { salvarFormulario } from "@/modules/inscricoes/application/actions";
import {
  adicionarDoCatalogo,
  aplicarModelo,
  chaveDe,
  conferirFormulario,
  limparRespostas,
  MODELOS_FORMULARIO,
  rotuloTipo,
  tirarCampo,
  TIPOS_CAMPO,
  validarRespostas,
  type Campo,
  type PerguntaCatalogo,
  type Respostas,
  type TipoCampo,
} from "@/modules/inscricoes/domain/campos";
import { FormularioDinamico, type OpcaoInstituicao } from "@/modules/inscricoes/ui/FormularioDinamico";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

/**
 * Montar o formulário de inscrição da edição: escolher as perguntas (do banco de perguntas ou
 * novas), a ordem e se cada uma é obrigatória ou opcional. A prévia ao lado é o formulário de
 * verdade, para testar como o candidato vê (heurísticas 1, 2 e 6).
 */
export function EditorFormulario({
  edicaoId,
  inicial,
  catalogo,
  instituicoes,
  aceitaOutra,
  inscricoes,
}: {
  edicaoId: string;
  inicial: Campo[];
  catalogo: PerguntaCatalogo[];
  instituicoes: OpcaoInstituicao[];
  aceitaOutra: boolean;
  inscricoes: number;
}) {
  const [campos, setCampos] = useState<Campo[]>(inicial);
  const [salvo, setSalvo] = useState(JSON.stringify(inicial));
  const [aberta, setAberta] = useState<string | null>(null);
  const [modelo, setModelo] = useState<string | null>(null);
  const [nova, setNova] = useState<{ rotulo: string; tipo: TipoCampo }>({ rotulo: "", tipo: "texto" });
  const [respostas, setRespostas] = useState<Respostas>({});
  const [testou, setTestou] = useState(false);

  const json = JSON.stringify(campos);
  const mudou = json !== salvo;
  const problemas = conferirFormulario(campos);
  const erros = testou ? validarRespostas(campos, respostas, { instituicoes: instituicoes.map((i) => i.id), aceitaOutra }) : {};
  const naoUsadas = catalogo.filter((p) => !campos.some((c) => c.chave === p.chave) && !(p.condicao && catalogo.some((x) => x.traz.includes(p.chave))));
  const grupos = [...new Set(naoUsadas.map((p) => p.grupo))];

  const mudar = (chave: string, f: (c: Campo) => Campo) => setCampos((cs) => cs.map((c) => (c.chave === chave ? f(c) : c)));
  const mover = (i: number, d: -1 | 1) =>
    setCampos((cs) => {
      const n = [...cs];
      const j = i + d;
      if (j < 0 || j >= n.length) return cs;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const dependentes = (chave: string) => campos.length - tirarCampo(campos, chave).length - 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-5">
        {/* ------------------------------------------------ modelos */}
        <section className="card space-y-3">
          <div>
            <h2 className="font-semibold">Começar de um modelo</h2>
            <p className="text-xs text-suave">Só uma seleção inicial: depois dá para tirar, pôr e mudar cada pergunta.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {MODELOS_FORMULARIO.map((m) => (
              <button key={m.id} type="button" onClick={() => setModelo(m.id)} className="btn-secundario min-h-9 px-3 text-xs" title={m.descricao}>
                <Icone nome="copiar" className="size-4" /> {m.rotulo}
              </button>
            ))}
            <button type="button" onClick={() => setModelo("vazio")} className="btn-secundario min-h-9 px-3 text-xs">
              <Icone nome="fechar" className="size-4" /> Só nome e e-mail
            </button>
          </div>
          {modelo && (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <span className="flex-1">
                {campos.length ? `Isto troca as ${campos.length} pergunta(s) da tela pelas do modelo.` : "Aplicar o modelo?"} Nada é gravado até você salvar.
              </span>
              <button
                type="button"
                className="btn-primario min-h-9 px-3 text-xs"
                onClick={() => {
                  setCampos(modelo === "vazio" ? [] : aplicarModelo(catalogo, MODELOS_FORMULARIO.find((m) => m.id === modelo)!.campos));
                  setModelo(null);
                  setRespostas({});
                }}
              >
                Aplicar
              </button>
              <button type="button" className="btn-secundario min-h-9 px-3 text-xs" onClick={() => setModelo(null)}>
                Cancelar
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------------------------ perguntas da edição */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Perguntas desta edição ({campos.length})</h2>
            <p className="text-xs text-suave">Nome e e-mail sempre são pedidos (são o cadastro e o login).</p>
          </div>
          {!campos.length && <p className="card text-sm text-suave">Nenhuma pergunta além de nome e e-mail. Adicione abaixo ou comece de um modelo.</p>}
          <ol className="space-y-2">
            {campos.map((c, i) => {
              const pai = c.condicao ? campos.find((x) => x.chave === c.condicao!.campo) : null;
              const editando = aberta === c.chave;
              return (
                <li key={c.chave} className={`card space-y-3 p-3 ${pai ? "ml-6 border-l-4 border-l-marca/40" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-suave">{i + 1}.</span>
                    <input
                      aria-label={`Texto da pergunta ${i + 1}`}
                      className="campo min-h-9 min-w-0 flex-1 py-1 text-sm font-semibold"
                      value={c.rotulo}
                      maxLength={200}
                      onChange={(e) => mudar(c.chave, (x) => ({ ...x, rotulo: e.target.value }))}
                    />
                    <select
                      aria-label={`Obrigatória ou opcional: ${c.rotulo}`}
                      className="campo min-h-9 w-auto py-1 text-xs"
                      value={c.obrigatorio ? "1" : "0"}
                      onChange={(e) => mudar(c.chave, (x) => ({ ...x, obrigatorio: e.target.value === "1" }))}
                    >
                      <option value="1">Obrigatória</option>
                      <option value="0">Opcional</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="selo bg-marca-fundo text-marca">{rotuloTipo(c.tipo)}</span>
                    {pai && (
                      <span className="selo bg-superficie text-suave">
                        só se “{pai.rotulo}” = {String(c.condicao!.igual === true ? "Sim" : c.condicao!.igual === false ? "Não" : c.condicao!.igual)}
                      </span>
                    )}
                    {c.sensivel && <span className="selo bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">sensível</span>}
                    <span className="ml-auto flex gap-1">
                      <BotaoIcone rotulo="Subir" icone="voltar" girar onClick={() => mover(i, -1)} desativado={i === 0} />
                      <BotaoIcone rotulo="Descer" icone="avancar" girar onClick={() => mover(i, 1)} desativado={i === campos.length - 1} />
                      <BotaoIcone rotulo={editando ? "Fechar detalhes" : "Detalhes"} icone="editar" onClick={() => setAberta(editando ? null : c.chave)} ativo={editando} />
                      <BotaoIcone
                        rotulo={dependentes(c.chave) ? `Tirar (e ${dependentes(c.chave)} que dependem dela)` : "Tirar"}
                        icone="lixo"
                        onClick={() => setCampos((cs) => tirarCampo(cs, c.chave))}
                      />
                    </span>
                  </div>
                  {editando && <Detalhes campo={c} aoMudar={(f) => mudar(c.chave, f)} />}
                </li>
              );
            })}
          </ol>
        </section>

        {/* ------------------------------------------------ adicionar */}
        <section className="card space-y-4">
          <h2 className="font-semibold">Adicionar perguntas</h2>
          {grupos.map((g) => (
            <div key={g} className="space-y-1.5">
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">{g}</p>
              <div className="flex flex-wrap gap-2">
                {naoUsadas
                  .filter((p) => p.grupo === g)
                  .map((p) => (
                    <button
                      key={p.chave}
                      type="button"
                      className="btn-secundario min-h-9 px-3 text-xs"
                      title={p.traz.length ? `Traz junto: ${p.traz.map((k) => catalogo.find((x) => x.chave === k)?.rotulo ?? k).join(", ")}` : p.ajuda ?? undefined}
                      onClick={() => setCampos((cs) => adicionarDoCatalogo(cs, catalogo, p.chave))}
                    >
                      <Icone nome="mais_novo" className="size-4" /> {p.rotulo}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {!grupos.length && <p className="text-xs text-suave">Todas as perguntas prontas já estão no formulário.</p>}
          <div className="space-y-2 border-t border-borda pt-3">
            <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Pergunta nova (só desta edição)</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="rotulo">Texto da pergunta</span>
                <input className="campo" maxLength={200} value={nova.rotulo} placeholder="Ex.: Qual linguagem você mais usa?" onChange={(e) => setNova({ ...nova, rotulo: e.target.value })} />
              </label>
              <label>
                <span className="rotulo">Tipo de resposta</span>
                <select className="campo" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value as TipoCampo })}>
                  {TIPOS_CAMPO.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-secundario min-h-11 px-4"
                disabled={!nova.rotulo.trim()}
                onClick={() => {
                  const chave = chaveDe(nova.rotulo, campos.map((c) => c.chave));
                  const opcoes = nova.tipo === "escolha" || nova.tipo === "multipla" ? ["Opção 1", "Opção 2"] : nova.tipo === "numero" ? {} : null;
                  setCampos((cs) => [...cs, { chave, rotulo: nova.rotulo.trim(), tipo: nova.tipo, opcoes, obrigatorio: true }]);
                  setNova({ rotulo: "", tipo: "texto" });
                  // Escolha precisa das opções: já abre os detalhes.
                  if (opcoes) setAberta(chave);
                }}
              >
                <Icone nome="mais_novo" className="size-4" /> Adicionar
              </button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ salvar */}
        <Formulario
          action={salvarFormulario}
          className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-borda bg-[var(--background)] p-3 shadow-lg lg:bottom-3"
          aoSucesso={() => setSalvo(json)}
          confirmar={
            inscricoes > 0
              ? `${inscricoes} pessoa(s) já estão inscritas. Pergunta tirada fica arquivada com as respostas antigas; pergunta nova vale para as próximas inscrições.`
              : undefined
          }
          tituloConfirmar="Salvar o formulário?"
          rotuloConfirmar="Salvar"
          perigo={false}
        >
          <Ocultos valores={{ id: edicaoId, campos: json }} />
          {problemas.length > 0 ? (
            <p role="alert" className="flex-1 text-xs text-red-600 dark:text-red-400">
              {problemas.join(" ")}
            </p>
          ) : (
            <p className="flex-1 text-xs text-suave">{mudou ? "Há mudanças não salvas." : "Tudo salvo."}</p>
          )}
          <BotaoEnviar icone="ok" desativado={!mudou || problemas.length > 0}>
            Salvar formulário
          </BotaoEnviar>
        </Formulario>
      </div>

      {/* ------------------------------------------------ prévia */}
      <aside className="h-fit space-y-3 lg:sticky lg:top-20">
        <div className="card space-y-4">
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Prévia</p>
            <h2 className="font-semibold">O que o candidato vê</h2>
            <p className="text-xs text-suave">Responda para testar as perguntas que aparecem conforme a resposta. Nada é gravado.</p>
          </div>
          <div className="space-y-4 rounded-xl border border-dashed border-borda p-3">
            <div>
              <span className="rotulo">Nome completo</span>
              <input className="campo" disabled placeholder="Vem do cadastro" />
            </div>
            <div>
              <span className="rotulo">E-mail</span>
              <input className="campo" disabled placeholder="nome@gmail.com" />
            </div>
            <FormularioDinamico
              campos={campos}
              valores={respostas}
              aoMudar={(k, v) => setRespostas((r) => ({ ...Object.fromEntries(Object.entries(r).filter(([x]) => x !== k)), ...(v === undefined ? {} : { [k]: v }) }))}
              erros={erros}
              instituicoes={instituicoes}
              aceitaOutra={aceitaOutra}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secundario min-h-9 px-3 text-xs" onClick={() => setTestou(true)}>
              <Icone nome="ok" className="size-4" /> Testar envio
            </button>
            <button
              type="button"
              className="btn-secundario min-h-9 px-3 text-xs"
              onClick={() => {
                setRespostas({});
                setTestou(false);
              }}
            >
              <Icone nome="desfazer" className="size-4" /> Limpar
            </button>
          </div>
          {testou && (
            <div role="status" className={`rounded-xl p-3 text-xs ${Object.keys(erros).length ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"}`}>
              {Object.keys(erros).length ? (
                `A inscrição seria recusada: ${Object.keys(erros).length} pergunta(s) com problema (veja acima).`
              ) : (
                <>
                  A inscrição seria aceita. Respostas gravadas:
                  <pre className="mt-1 font-mono text-[11px] whitespace-pre-wrap">{JSON.stringify(limparRespostas(campos, respostas), null, 1)}</pre>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/** Ajuda, opções, faixa do número e se a resposta é sensível. */
function Detalhes({ campo: c, aoMudar }: { campo: Campo; aoMudar: (f: (c: Campo) => Campo) => void }) {
  const lista = Array.isArray(c.opcoes) ? c.opcoes : [];
  const faixa = c.opcoes && !Array.isArray(c.opcoes) ? c.opcoes : {};
  // O texto das opções fica local enquanto digita (linhas em branco no meio não somem).
  const [opcoes, setOpcoes] = useState(lista.join("\n"));
  return (
    <div className="grid gap-3 rounded-xl bg-superficie/60 p-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="rotulo">
          Texto de ajuda <span className="font-normal text-suave">(opcional)</span>
        </span>
        <input className="campo" maxLength={500} value={c.ajuda ?? ""} placeholder="Aparece embaixo da pergunta" onChange={(e) => aoMudar((x) => ({ ...x, ajuda: e.target.value || null }))} />
      </label>
      {(c.tipo === "escolha" || c.tipo === "multipla") && (
        <label className="sm:col-span-2">
          <span className="rotulo">Opções (uma por linha)</span>
          <textarea
            className="campo font-mono text-xs"
            rows={Math.min(10, Math.max(3, lista.length + 1))}
            value={opcoes}
            onChange={(e) => {
              setOpcoes(e.target.value);
              const novas = [...new Set(e.target.value.split("\n").map((o) => o.trim()).filter(Boolean))];
              aoMudar((x) => ({ ...x, opcoes: novas }));
            }}
          />
          {c.chave === "cargo" && <span className="mt-1 block text-xs text-suave">Mantenha “Outro”: é ele que abre a pergunta “Qual o seu cargo?”.</span>}
        </label>
      )}
      {c.tipo === "numero" && (
        <>
          <label>
            <span className="rotulo">Mínimo</span>
            <input
              type="number"
              className="campo"
              value={faixa.min ?? ""}
              onChange={(e) => aoMudar((x) => ({ ...x, opcoes: { ...faixa, min: e.target.value === "" ? undefined : Number(e.target.value) } }))}
            />
          </label>
          <label>
            <span className="rotulo">Máximo</span>
            <input
              type="number"
              className="campo"
              value={faixa.max ?? ""}
              onChange={(e) => aoMudar((x) => ({ ...x, opcoes: { ...faixa, max: e.target.value === "" ? undefined : Number(e.target.value) } }))}
            />
          </label>
        </>
      )}
      <label className="flex items-start gap-3 sm:col-span-2">
        <input type="checkbox" checked={!!c.sensivel} onChange={(e) => aoMudar((x) => ({ ...x, sensivel: e.target.checked }))} className="mt-0.5 size-5 accent-[var(--marca)]" />
        <span className="text-sm">
          <strong className="font-semibold">Resposta sensível</strong>
          <span className="block text-xs text-suave">Só a organização vê (mentoria e bancas não). Use para telefone, saúde, alimentação.</span>
        </span>
      </label>
    </div>
  );
}

function BotaoIcone({
  rotulo,
  icone,
  onClick,
  desativado,
  ativo,
  girar,
}: {
  rotulo: string;
  icone: "voltar" | "avancar" | "editar" | "lixo";
  onClick: () => void;
  desativado?: boolean;
  ativo?: boolean;
  girar?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desativado}
      title={rotulo}
      aria-label={rotulo}
      className={`btn-secundario size-9 min-h-9 p-0 disabled:opacity-30 ${ativo ? "bg-marca-fundo" : ""}`}
    >
      <Icone nome={icone} className={`size-4 ${girar ? "rotate-90" : ""}`} />
    </button>
  );
}
