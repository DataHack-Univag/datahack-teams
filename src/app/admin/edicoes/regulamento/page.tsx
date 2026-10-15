import { conferirRegulamento } from "@/modules/avaliacao/domain/regulamento";
import { carregarRegulamento } from "@/modules/avaliacao/infra/repositorio";
import { AjudaCalculo } from "@/modules/avaliacao/ui/AjudaCalculo";
import type { RegulamentoCanonico } from "@/modules/avaliacao/domain/regulamento";
import { EditorRegulamento, REGULAMENTO_VAZIO } from "@/modules/edicoes/ui/EditorRegulamento";
import { ImportarRegulamento, type ModeloRegulamento } from "@/modules/edicoes/ui/ImportarRegulamento";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Regulamento da avaliação da edição: fases, rubricas, critérios, níveis, penalidades e desempate.
export default async function RegulamentoEdicao() {
  const { cliente, edicao, edicoesOrganizadas } = await sessaoAtual();
  const [reg, fichas, modelos] = await Promise.all([
    carregarRegulamento(cliente, edicao.id),
    cliente.from("fichas").select("*", { count: "exact", head: true }).eq("edicao_id", edicao.id),
    // Regulamentos das outras edições, para usar como ponto de partida.
    Promise.all(
      edicoesOrganizadas
        .filter((e) => e.id !== edicao.id)
        .map(async (e): Promise<ModeloRegulamento | null> => {
          const { data } = await cliente.rpc("exportar_regulamento", { p_edicao: e.id });
          const r = data as { rubricas?: unknown[] } | null;
          return r?.rubricas?.length ? { rotulo: `Edição ${e.numero} · ${e.nome}`, json: JSON.stringify(data, null, 2) } : null;
        }),
    ).then((l) => l.filter((m): m is ModeloRegulamento => !!m)),
  ]);
  const temFichas = (fichas.count ?? 0) > 0;
  // O editor na tela começa com o regulamento atual (ou em branco, numa edição limpa).
  const atual = reg.rubricas.length ? ((await cliente.rpc("exportar_regulamento", { p_edicao: edicao.id })).data as RegulamentoCanonico | null) : null;
  const problemas = conferirRegulamento(reg);
  const nomeBanca = (c: string) => reg.bancas.find((b) => b.codigo === c)?.nome ?? c;

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Edições", href: "/admin/edicoes" }, { rotulo: "Regulamento" }]}
        titulo={`Regulamento · Edição ${edicao.numero}`}
        destaque="Regulamento"
        descricao={reg.formula || "Fases, rubricas, critérios, níveis, penalidades e desempate desta edição."}
        acoes={
          reg.rubricas.length > 0 && (
            <>
              <AjudaCalculo reg={reg} />
              <BotaoLink href="/admin/edicoes/regulamento/baixar" icone="baixar">
                Baixar regulamento (JSON)
              </BotaoLink>
            </>
          )
        }
      />

      {reg.rubricas.length === 0 ? (
        <>
          <EstadoVazio icone="avaliacao" titulo="Esta edição ainda não tem regulamento">
            Monte o regulamento (fases, rubricas, critérios, níveis, penalidades e desempate) em JSON, com a ajuda de uma IA ou a partir de outra edição, e importe abaixo.
          </EstadoVazio>
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold">Importar regulamento</h2>
            <ImportarRegulamento edicaoId={edicao.id} substituir={false} modelos={modelos} />
          </section>
          <details className="card group">
            <summary className="cursor-pointer font-semibold text-marca select-none">Ou monte na tela, fase por fase</summary>
            <div className="mt-4">
              <EditorRegulamento edicaoId={edicao.id} inicial={REGULAMENTO_VAZIO} substituir={false} />
            </div>
          </details>
        </>
      ) : (
        <>
          {problemas.length > 0 ? (
            <Aviso tom="erro" titulo="O regulamento tem inconsistências">
              <ul className="list-disc pl-5">
                {problemas.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Aviso>
          ) : (
            <Aviso tom="sucesso" titulo="Regulamento consistente">
              Rubricas somam 100% da nota final e os critérios de cada rubrica somam 100.
            </Aviso>
          )}
          {temFichas ? (
            <Aviso tom="info">
              Esta edição já tem fichas lançadas: pesos, fatores e a estrutura do regulamento ficam travados (mudariam notas já dadas). Os textos
              podem ser corrigidos.
            </Aviso>
          ) : (
            <details className="card group">
              <summary className="cursor-pointer font-semibold text-marca select-none">Trocar o regulamento (importar outro JSON)</summary>
              <p className="mt-2 text-sm text-suave">
                Enquanto não houver fichas, dá para trocar o regulamento quantas vezes precisar. Dica: baixe o atual, peça os ajustes para uma IA e
                cole o resultado aqui.
              </p>
              <div className="mt-3">
                <ImportarRegulamento edicaoId={edicao.id} substituir modelos={modelos} />
              </div>
            </details>
          )}
          {!temFichas && atual && (
            <details className="card group">
              <summary className="cursor-pointer font-semibold text-marca select-none">Editar na tela, fase por fase</summary>
              <div className="mt-4">
                <EditorRegulamento edicaoId={edicao.id} inicial={atual} substituir />
              </div>
            </details>
          )}

          <section className="card space-y-2">
            <h2 className="text-lg font-semibold">Níveis</h2>
            <p className="text-sm text-suave">{reg.niveis.map((n) => `${n.nome} (${Math.round(n.fator * 100)}%)`).join(" · ")}</p>
          </section>

          {reg.fases.map((f) => (
            <section key={f.id} className="card space-y-3">
              <h2 className="text-lg font-semibold">
                {f.nome} <span className="text-sm font-normal text-suave">· {f.peso}% da nota final</span>
              </h2>
              {reg.rubricas
                .filter((r) => r.fase === f.id)
                .map((r) => (
                  <details key={r.id} className="group rounded-xl border border-borda p-3">
                    <summary className="cursor-pointer list-none select-none">
                      <span className="font-semibold">{r.nome}</span>{" "}
                      <span className="text-sm text-suave">
                        · {r.pesoFinal}% · {nomeBanca(r.banca)} · {r.criterios.length} critérios{r.momento ? ` · ${r.momento}` : ""}
                      </span>
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-xs">
                        <thead>
                          <tr className="text-left text-suave">
                            <th className="py-1 pr-2 font-semibold">Critério (peso)</th>
                            {reg.niveis.map((n) => (
                              <th key={n.nome} className="py-1 pr-2 font-semibold">
                                {n.nome}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {r.criterios.map((c) => (
                            <tr key={c.id} className="border-t border-borda align-top">
                              <td className="py-1 pr-2">
                                <strong>{c.nome}</strong> ({c.peso})<span className="block text-suave">{c.descricao}</span>
                              </td>
                              {c.niveis.map((d, i) => (
                                <td key={i} className="py-1 pr-2 text-suave">
                                  {d}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
            </section>
          ))}

          <section className="card space-y-2 text-sm">
            <h2 className="text-lg font-semibold">Penalidades</h2>
            <ul className="space-y-1">
              {reg.penalidades.map((p) => (
                <li key={p.id} className="flex gap-2">
                  <span className="w-10 shrink-0 font-mono font-semibold text-red-600 dark:text-red-300">{p.pontos}</span>
                  <span className="text-suave">{p.texto}</span>
                </li>
              ))}
            </ul>
            <h2 className="pt-2 text-lg font-semibold">Desempate</h2>
            <ol className="list-decimal space-y-1 pl-5 text-suave">
              {reg.desempate.map((d) => (
                <li key={d.descricao}>{d.descricao}</li>
              ))}
            </ol>
            {reg.desclassificacao && (
              <p className="text-suave">
                <strong className="text-foreground">Desclassificação:</strong> {reg.desclassificacao}
              </p>
            )}
          </section>
        </>
      )}
    </Pagina>
  );
}
