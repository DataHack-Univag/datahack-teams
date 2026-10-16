import { atenderChamado, reabrirChamado } from "@/modules/chamados/application/actions";
import { espera, ordemDeAtendimento, TIPOS_CHAMADO, type Chamado } from "@/modules/chamados/domain/tipos";
import { contarChamadosEncerrados, listarChamadosAtivos, listarChamadosEncerrados } from "@/modules/chamados/infra/repositorio";
import { HistoricoChamados } from "@/modules/chamados/ui/HistoricoChamados";
import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { listarEquipes } from "@/modules/equipes/infra/repositorio";
import { IconeEquipe } from "@/modules/equipes/ui/IconeEquipe";
import { locaisDasEquipes, ocupacao, type Alocacao, type Ocupacao } from "@/modules/mapa/domain/alocacao";
import type { Elemento, Sala } from "@/modules/mapa/domain/tipos";
import { carregarAlocacoes, carregarMapa } from "@/modules/mapa/infra/repositorio";
import { DesenhoSala, type Alerta } from "@/modules/mapa/ui/DesenhoSala";
import type { Cliente } from "@/shared/db/servidor";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { SubAbas } from "@/shared/ui/Pagina";
import { Selo } from "@/shared/ui/Selo";

/** Onde a equipe está no mapa: a sala (com o desenho) e o lugar dela. */
export type LocalNoMapa = { sala: Sala; elementos: Elemento[]; lugar: string };

/**
 * Pedidos de ajuda da edição para quem atende (mentoria e organização). Cada pedido é uma
 * linha: o pedido à esquerda e, ao lado, a sala da equipe com o lugar dela piscando
 * (heurísticas 1 e 6). Atualiza sozinha a cada 15 segundos. Na aba "Encerrados" ficam os pedidos
 * já resolvidos ou cancelados, para consultar depois.
 */
export async function TelaChamados({ cliente, edicao, aba, base }: { cliente: Cliente; edicao: Edicao; aba: "abertos" | "encerrados"; base: string }) {
  if (aba === "encerrados") {
    const [encerrados, ativos] = await Promise.all([listarChamadosEncerrados(cliente, edicao.id), listarChamadosAtivos(cliente, edicao.id)]);
    return (
      <>
        <AbasChamados ativa="encerrados" base={base} abertos={ativos.length} encerrados={encerrados.length} />
        <HistoricoChamados chamados={encerrados} />
      </>
    );
  }
  const [chamados, mapa, alocacoes, equipes, encerrados] = await Promise.all([
    listarChamadosAtivos(cliente, edicao.id),
    carregarMapa(cliente, edicao.id),
    carregarAlocacoes(cliente, edicao.id),
    listarEquipes(cliente, edicao.id),
    contarChamadosEncerrados(cliente, edicao.id),
  ]);
  const salas = mapa.pisos.flatMap((p) => p.salas);
  return (
    <>
      <AbasChamados ativa="abertos" base={base} abertos={chamados.length} encerrados={encerrados} />
      <PainelChamados
        chamados={chamados}
        locais={locaisDasEquipes(salas, mapa.elementos, alocacoes)}
        noMapa={localNoMapa(salas, mapa.elementos, alocacoes)}
        ocupacao={ocupacao(mapa.elementos, alocacoes, equipes.map((e) => ({ id: e.id, nome: e.nome, icone: e.icone })))}
      />
    </>
  );
}

/** Abertos (para atender agora) e Encerrados (para consultar). */
function AbasChamados({ ativa, base, abertos, encerrados }: { ativa: "abertos" | "encerrados"; base: string; abertos: number; encerrados: number }) {
  return (
    <SubAbas
      ativa={ativa}
      abas={[
        { id: "abertos", rotulo: "Abertos", href: base, contagem: abertos },
        { id: "encerrados", rotulo: "Encerrados", href: `${base}?aba=encerrados`, contagem: encerrados },
      ]}
    />
  );
}

/** Para cada equipe alocada: a sala onde ela está e o lugar ("elementoId:lugar"). */
function localNoMapa(salas: Sala[], elementos: Elemento[], alocacoes: Alocacao[]): Record<string, LocalNoMapa> {
  const r: Record<string, LocalNoMapa> = {};
  for (const a of alocacoes) {
    const el = elementos.find((e) => e.id === a.elemento_id);
    const sala = el && salas.find((s) => s.id === el.sala_id);
    if (sala) r[a.equipe_id] = { sala, elementos: elementos.filter((e) => e.sala_id === sala.id), lugar: `${a.elemento_id}:${a.lugar}` };
  }
  return r;
}

/** A parte visual da tela de chamados, sem buscar nada. */
export function PainelChamados({
  chamados,
  locais,
  noMapa,
  ocupacao: ocup,
}: {
  chamados: Chamado[];
  locais: Record<string, string>;
  noMapa: Record<string, LocalNoMapa>;
  ocupacao: Ocupacao;
}) {
  const lista = [...chamados].sort(ordemDeAtendimento);
  const abertos = chamados.filter((c) => c.situacao === "aberto").length;
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm" aria-live="polite">
          <span className="font-mono text-2xl font-semibold tabular-nums">{abertos}</span>{" "}
          <span className="text-suave">
            aguardando · {chamados.length - abertos} em atendimento · a lista se atualiza sozinha a cada 15 s
          </span>
        </p>
        <Legenda />
      </div>

      {!lista.length ? (
        <EstadoVazio icone="ok" titulo="Nenhum pedido de ajuda agora">
          Quando uma equipe pedir ajuda, ela aparece aqui com o lugar dela piscando no mapa.
        </EstadoVazio>
      ) : (
        <ul className="space-y-4">
          {lista.map((c) => (
            <LinhaChamado key={c.id} c={c} local={locais[c.equipe_id]} mapa={noMapa[c.equipe_id]} ocupacao={ocup} />
          ))}
        </ul>
      )}
    </>
  );
}

/** Um pedido numa linha só: o pedido e, ao lado, onde a equipe está. */
function LinhaChamado({ c, local, mapa, ocupacao: ocup }: { c: Chamado; local?: string; mapa?: LocalNoMapa; ocupacao: Ocupacao }) {
  const tipo = TIPOS_CHAMADO[c.tipo];
  const indo = c.situacao === "em_atendimento";
  const nome = c.equipe?.nome ?? "Equipe";
  const alerta: Alerta = indo ? "atendimento" : c.tipo;
  const cor = indo ? "border-l-emerald-500" : c.tipo === "problema" ? "border-l-red-500" : "border-l-amber-500";
  return (
    <li className={`card grid gap-4 border-l-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center ${cor}`}>
      <div className="min-w-0 space-y-3">
        <div className="flex items-start gap-3">
          <IconeEquipe equipe={{ nome, icone: c.equipe?.icone ?? null }} tamanho="size-11 text-xl" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <strong className="text-base">{nome}</strong>
              <Selo tom={indo ? "sucesso" : tipo.tom}>{indo ? "em atendimento" : tipo.rotulo}</Selo>
            </p>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Icone nome="mapa" className="size-4 text-marca" />
              {local ?? "sem lugar no mapa"}
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
      </div>

      {/* Onde a equipe está: só ela pisca, para achar de primeira. */}
      {mapa ? (
        <figure className="min-w-0 space-y-1 rounded-xl border border-borda bg-superficie-solida p-2">
          <figcaption className="px-1 text-xs font-semibold text-suave">{mapa.sala.nome}</figcaption>
          <DesenhoSala
            sala={mapa.sala}
            elementos={mapa.elementos}
            ocupacao={ocup}
            alertas={{ [c.equipe_id]: alerta }}
            idSvg={`chamado-${c.id}`}
            className="max-h-72"
            rotuloAcessivel={`${nome} em ${local ?? mapa.sala.nome}`}
          />
        </figure>
      ) : (
        <p className="rounded-xl border border-dashed border-borda p-4 text-sm text-suave">
          Esta equipe ainda não tem lugar no mapa. Distribua as equipes em Mapa → “Distribuir equipes”.
        </p>
      )}
    </li>
  );
}

function Legenda() {
  return (
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
  );
}
