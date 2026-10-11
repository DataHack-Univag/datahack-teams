import Link from "next/link";
import { notFound } from "next/navigation";
import { nomeBanca, rubricasDaBanca, situacaoFicha } from "@/modules/avaliacao/domain/bancas";
import { carregarRegulamento, listarFichas } from "@/modules/avaliacao/infra/repositorio";
import { FichaAvaliacao } from "@/modules/avaliacao/ui/FichaAvaliacao";
import { liderDa, nomeMembro, rotuloCategoria } from "@/modules/equipes/domain/tipos";
import { buscarEquipe, listarResumo } from "@/modules/equipes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { Icone } from "@/shared/ui/Icone";
import { Pagina } from "@/shared/ui/Pagina";
import { Selo } from "@/shared/ui/Selo";

// Ficha de avaliação de uma equipe: o que ela entregou + uma aba por rubrica da banca.
export default async function AvaliarEquipe({ params, searchParams }: PageProps<"/avaliar/[id]">) {
  const { id } = await params;
  const { r } = await searchParams;
  const { cliente, usuario, organizador, banca, simulacao, edicao } = await sessaoAtual();
  const [reg, equipe, todas, fichas] = await Promise.all([
    carregarRegulamento(cliente, edicao.id),
    buscarEquipe(cliente, id),
    listarResumo(cliente, edicao.id),
    listarFichas(cliente, edicao.id, { equipeId: id, avaliador: usuario.email }),
  ]);
  if (!equipe || equipe.edicao_id !== edicao.id) notFound();
  const encerrada = edicao.avaliacao_encerrada || edicao.situacao === "encerrada";
  // Avaliador: só as rubricas da banca dele. Organização: todas (as dela primeiro).
  const minhas = rubricasDaBanca(reg, banca, organizador);
  if (!minhas.length) notFound();
  const pos = todas.findIndex((e) => e.id === id);
  const anterior = pos > 0 ? todas[pos - 1] : null;
  const proxima = pos >= 0 && pos < todas.length - 1 ? todas[pos + 1] : null;

  // Aba escolhida, ou a primeira ainda incompleta.
  const fichaDe = (rid: string) => fichas.find((f) => f.rubrica === rid);
  const incompleta = minhas.find((x) => situacaoFicha(x, fichaDe(x.id)?.notas) !== "completa");
  const rubrica = minhas.find((x) => x.id === r) ?? incompleta ?? minhas[0];
  const ficha = fichaDe(rubrica.id);
  const lider = liderDa(equipe);

  return (
    <Pagina>
      <nav aria-label="Navegar entre equipes" className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/avaliar" className="inline-flex items-center gap-1 text-marca">
          <Icone nome="voltar" className="size-4" /> Todas as equipes
        </Link>
        <div className="flex gap-2">
          {anterior && (
            <BotaoLink href={`/avaliar/${anterior.id}?r=${rubrica.id}`} tamanho="pequeno" icone="voltar">
              {anterior.nome}
            </BotaoLink>
          )}
          {proxima && (
            <BotaoLink href={`/avaliar/${proxima.id}?r=${rubrica.id}`} tamanho="pequeno">
              {proxima.nome} <Icone nome="avancar" className="size-4" />
            </BotaoLink>
          )}
        </div>
      </nav>

      {/* O que a equipe entregou */}
      <section className="card faixa-topo space-y-3">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Equipe avaliada</p>
          <h1 className="text-3xl font-extrabold break-words sm:text-4xl">
            <span className="grad-text">{equipe.nome}</span>
          </h1>
          <p className="mt-1 text-xs text-suave">
            {equipe.membros.map(nomeMembro).join(", ") || "sem integrantes"}
            {lider && ` · ★ Líder: ${nomeMembro(lider)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {equipe.repo_github ? (
            <BotaoLink href={equipe.repo_github} externo tamanho="pequeno" icone="github" className="max-w-full">
              <span className="truncate">{equipe.repo_github.replace("https://github.com/", "")}</span>
            </BotaoLink>
          ) : (
            <Selo tom="alerta">sem repositório</Selo>
          )}
          {equipe.links.map((l) => (
            <BotaoLink key={l.id} href={l.url} externo tamanho="pequeno" icone="link" className="max-w-full" title={l.url}>
              <span className="truncate">
                {rotuloCategoria(l.categoria)}
                {l.titulo ? ` · ${l.titulo}` : ""}
              </span>
            </BotaoLink>
          ))}
        </div>
      </section>

      {/* Abas das rubricas */}
      {minhas.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Rubricas">
          {minhas.map((x) => {
            const ok = situacaoFicha(x, fichaDe(x.id)?.notas) === "completa";
            const ativa = x.id === rubrica.id;
            return (
              <Link
                key={x.id}
                href={`/avaliar/${id}?r=${x.id}`}
                aria-current={ativa ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  ativa ? "border-transparent text-white [background:var(--grad)]" : "border-borda-forte bg-superficie-solida text-suave hover:text-foreground"
                }`}
              >
                {x.curto}
                {organizador && x.banca !== banca && <span className="ml-1 text-[10px] font-normal opacity-75">({nomeBanca(reg, x.banca)})</span>}
                {ok && <span className="ml-1" aria-label="completa">✔</span>}
              </Link>
            );
          })}
        </nav>
      )}

      <div>
        <h2 className="text-xl font-bold">{rubrica.nome}</h2>
        <p className="text-sm text-suave">
          {rubrica.pesoFinal}% da nota final · Banca: {rubrica.bancaTexto} · Quando: {rubrica.momento}
        </p>
      </div>

      {simulacao && (
        <Aviso tom="alerta" titulo="Simulação: ficha só para consulta">
          Você está vendo as notas que {usuario.nome} lançou. Para lançar notas, saia da simulação.
        </Aviso>
      )}

      <FichaAvaliacao
        key={`${id}-${rubrica.id}-${ficha?.atualizado_em ?? "nova"}`}
        rubrica={rubrica}
        niveis={reg.niveis}
        equipeId={id}
        equipeNome={equipe.nome}
        notasIniciais={ficha?.notas ?? {}}
        comentarioInicial={ficha?.comentario ?? ""}
        salvoEm={ficha?.atualizado_em ?? null}
        voltarAoSalvar={!organizador}
        bloqueada={simulacao || (encerrada && !organizador)}
      />
    </Pagina>
  );
}
