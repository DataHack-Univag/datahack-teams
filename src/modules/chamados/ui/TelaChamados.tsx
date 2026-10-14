import { atenderChamado, reabrirChamado } from "@/modules/chamados/application/actions";
import { espera, ordemDeAtendimento, TIPOS_CHAMADO, type Chamado } from "@/modules/chamados/domain/tipos";
import { listarChamadosAtivos } from "@/modules/chamados/infra/repositorio";
import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import { IconeEquipe } from "@/modules/equipes/ui/IconeEquipe";
import { locaisDasEquipes, ocupacao, type Ocupacao } from "@/modules/mapa/domain/alocacao";
import type { Elemento, Sala } from "@/modules/mapa/domain/tipos";
import { carregarAlocacoes, carregarMapa } from "@/modules/mapa/infra/repositorio";
import { DesenhoSala, type Alerta } from "@/modules/mapa/ui/DesenhoSala";
import type { Cliente } from "@/shared/db/servidor";
import { AutoAtualizar } from "@/shared/ui/AutoAtualizar";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

/**
 * Pedidos de ajuda da edição para quem atende (mentoria e organização): a lista na ordem de
 * atendimento e o mapa com as bancadas que pediram ajuda piscando (heurísticas 1 e 6).
 * Atualiza sozinha a cada 15 segundos.
 */
export async function TelaChamados({ cliente, edicao }: { cliente: Cliente; edicao: Edicao }) {
  const [chamados, mapa, alocacoes, equipes] = await Promise.all([
    listarChamadosAtivos(cliente, edicao.id),
    carregarMapa(cliente, edicao.id),
    carregarAlocacoes(cliente, edicao.id),
    listarEquipes(cliente, edicao.id),
  ]);
  const salas = mapa.pisos.flatMap((p) => p.salas);
  const locais = locaisDasEquipes(salas, mapa.elementos, alocacoes);
  const ocup = ocupacao(mapa.elementos, alocacoes, equipes.map((e) => ({ id: e.id, nome: e.nome, icone: e.icone })));
  const alertas: Record<string, Alerta> = Object.fromEntries(chamados.map((c) => [c.equipe_id, c.situacao === "em_atendimento" ? "atendimento" : c.tipo]));
  // Salas com alguém pedindo ajuda (onde a equipe está alocada).
  const salaDaEquipe = new Map(alocacoes.map((a) => [a.equipe_id, mapa.elementos.find((e) => e.id === a.elemento_id)?.sala_id]));
  const salasComPedido = salas.filter((s) => chamados.some((c) => salaDaEquipe.get(c.equipe_id) === s.id));

  return (
    <PainelChamados
      chamados={chamados}
      locais={locais}
      salas={salasComPedido.map((s) => ({ sala: s, elementos: mapa.elementos.filter((e) => e.sala_id === s.id) }))}
      ocupacao={ocup}
      alertas={alertas}
    />
  );
}

/** A parte visual da tela de chamados (lista + salas com pedido), sem buscar nada. */
export function PainelChamados({
  chamados,
  locais,
  salas,
  ocupacao: ocup,
  alertas,
}: {
  chamados: Chamado[];
  locais: Record<string, string>;
  salas: { sala: Sala; elementos: Elemento[] }[];
  ocupacao: Ocupacao;
  alertas: Record<string, Alerta>;
}) {
  const lista = [...chamados].sort(ordemDeAtendimento);
  const abertos = chamados.filter((c) => c.situacao === "aberto").length;
  return (
    <>
      <AutoAtualizar segundos={15} />
      <p className="text-sm" aria-live="polite">
        <span className="font-mono text-2xl font-semibold tabular-nums">{abertos}</span>{" "}
        <span className="text-suave">
          aguardando · {chamados.length - abertos} em atendimento · a lista se atualiza sozinha a cada 15 s
        </span>
      </p>

      {!lista.length ? (
        <EstadoVazio icone="ok" titulo="Nenhum pedido de ajuda agora">
          Quando uma equipe pedir ajuda, ela aparece aqui e a bancada dela pisca no mapa.
        </EstadoVazio>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ul className="space-y-3">
            {lista.map((c) => {
              const tipo = TIPOS_CHAMADO[c.tipo];
              const indo = c.situacao === "em_atendimento";
              const nome = c.equipe?.nome ?? "Equipe";
              return (
                <li
                  key={c.id}
                  className={`card space-y-3 border-l-4 ${indo ? "border-l-emerald-500" : c.tipo === "problema" ? "border-l-red-500" : "border-l-amber-500"}`}
                >
                  <div className="flex items-start gap-3">
                    <IconeEquipe equipe={{ nome, icone: c.equipe?.icone ?? null }} tamanho="size-11 text-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <strong className="text-base">{nome}</strong>
                        <Selo tom={indo ? "sucesso" : tipo.tom}>{indo ? "em atendimento" : tipo.rotulo}</Selo>
                      </p>
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        <Icone nome="mapa" className="size-4 text-marca" />
                        {locais[c.equipe_id] ?? "sem lugar no mapa"}
                      </p>
                      <p className="text-xs text-suave">
                        Pediu {espera(c.aberto_em)}
                        {indo ? ` · ${c.atendente ?? "alguém"} está indo` : ""}
                      </p>
                    </div>
                  </div>
                  {c.mensagem && <p className="rounded-lg bg-marca-fundo px-3 py-2 text-sm">“{c.mensagem}”</p>}
                  <div className="flex flex-wrap gap-2">
                    {!indo && (
                      <Formulario action={atenderChamado} acaoDesfazer={reabrirChamado}>
                        <Ocultos valores={{ id: c.id, resolver: "0", equipe: nome }} />
                        <BotaoEnviar tamanho="pequeno" icone="avancar">
                          Vou atender
                        </BotaoEnviar>
                      </Formulario>
                    )}
                    <Formulario action={atenderChamado} acaoDesfazer={reabrirChamado}>
                      <Ocultos valores={{ id: c.id, resolver: "1", equipe: nome }} />
                      <BotaoEnviar variante="secundario" tamanho="pequeno" icone="ok">
                        Resolvido
                      </BotaoEnviar>
                    </Formulario>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-4">
            {salas.length ? (
              salas.map(({ sala: s, elementos }) => (
                <section key={s.id} className="card space-y-2 p-3 sm:p-4">
                  <h2 className="text-sm font-semibold">{s.nome}</h2>
                  <DesenhoSala sala={s} elementos={elementos} ocupacao={ocup} alertas={alertas} idSvg={`chamados-${s.id}`} />
                </section>
              ))
            ) : (
              <p className="card text-sm text-suave">As equipes que pediram ajuda ainda não têm lugar no mapa. Distribua as equipes em Mapa → “Distribuir equipes”.</p>
            )}
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-red-500" /> problema
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-amber-500" /> dúvida
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-emerald-500" /> alguém já está indo
              </span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
