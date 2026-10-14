import { medida, TIPOS, TIPOS_ELEMENTO } from "@/modules/mapa/domain/catalogo";
import { carregarMapa } from "@/modules/mapa/infra/repositorio";
import { BaixarSvg, BotaoImprimir } from "@/modules/mapa/ui/BaixarSvg";
import { AmostraTipo, DesenhoSala } from "@/modules/mapa/ui/DesenhoSala";
import { periodo } from "@/modules/edicoes/domain/tipos";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Croqui do evento para a universidade: todas as salas por piso, em escala, com legenda.
export default async function Croqui() {
  const { cliente, edicao } = await sessaoAtual();
  const mapa = await carregarMapa(cliente, edicao.id);
  const comSalas = mapa.pisos.filter((p) => p.salas.length);
  const usados = new Set(mapa.elementos.map((e) => e.tipo));

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Mapa", href: "/admin/mapa" }, { rotulo: "Croqui" }]}
        titulo="Croqui do evento"
        destaque="Croqui"
        descricao="Todas as salas em escala, prontas para mandar para a universidade."
        acoes={comSalas.length > 0 && <BotaoImprimir />}
      />
      {!comSalas.length ? (
        <EstadoVazio icone="mapa" titulo="Nenhuma sala no mapa">
          Crie e desenhe as salas em Mapa; o croqui sai daqui pronto.
        </EstadoVazio>
      ) : (
        <div data-imprimir className="space-y-8">
          <header className="space-y-1">
            <h2 className="text-2xl font-bold">{edicao.nome} · croqui</h2>
            <p className="text-sm text-suave">
              {periodo(edicao)}
              {edicao.local ? ` · ${edicao.local}` : ""} · medidas aproximadas, em metros
            </p>
          </header>
          {comSalas.map((p) => (
            <section key={p.id} className="space-y-4">
              {(comSalas.length > 1 || p.nome !== "Piso único") && <h2 className="text-xl font-semibold">{p.nome}</h2>}
              {p.salas.map((s) => {
                const elementos = mapa.elementos.filter((e) => e.sala_id === s.id);
                const lugares = elementos.reduce((t, e) => t + (e.lugares ?? 0), 0);
                return (
                  <article key={s.id} className="sala-croqui card space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-lg font-semibold">{s.nome}</h3>
                      <p className="text-xs text-suave">
                        {medida(s.largura_cm)} × {medida(s.profundidade_cm)} · {lugares} lugar(es) para equipes
                      </p>
                    </div>
                    <DesenhoSala sala={s} elementos={elementos} idSvg={`croqui-${s.id}`} className="mx-auto max-h-[70vh]" />
                    <BaixarSvg idSvg={`croqui-${s.id}`} nome={s.nome} />
                  </article>
                );
              })}
            </section>
          ))}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Legenda</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
              {TIPOS_ELEMENTO.filter((t) => usados.has(t)).map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <AmostraTipo tipo={t} />
                  {TIPOS[t].rotulo}
                  {TIPOS[t].temLugares ? " (com o número de equipes que cabem)" : ""}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Pagina>
  );
}
