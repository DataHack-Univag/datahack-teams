import Link from "next/link";
import { redirect } from "next/navigation";
import { Area } from "@/app/_shell/Area";
import { comandosDasAbas, navAluno, navBancas, navMentoria } from "@/app/_shell/menus";
import { escolherEdicao } from "@/modules/edicoes/application/actions";
import { chamadaDaAtual } from "@/modules/edicoes/domain/atual";
import { periodo, rotuloSituacaoEdicao } from "@/modules/edicoes/domain/tipos";
import { COR_PADRAO, resolverMarca } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { situacaoInscricao } from "@/modules/inscricoes/domain/publica";
import { minhasInscricoes, vitrine } from "@/modules/inscricoes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoEnviar } from "@/shared/ui/Formulario";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";
import { Selo } from "@/shared/ui/Selo";

// Suas edições: as de que a pessoa participou (para consultar) e, à parte, a edição que está
// acontecendo agora, com a inscrição quando ela ainda não participa (heurísticas 1 e 6).
// A organização gerencia as edições em /admin/edicoes.
export default async function MinhasEdicoes() {
  const { cliente, usuario, real, avatar, avaliador, mentor, edicao, edicoesDoUsuario, simulacao } = await sessaoAtual();
  if (real.papel === "organizador" || simulacao) redirect("/admin/edicoes");
  const [vit, inscricoes] = await Promise.all([vitrine(cliente), minhasInscricoes(cliente)]);

  const itens = avaliador ? navBancas() : mentor ? navMentoria() : navAluno("/", {}, true, edicao.permite_trocas);
  const atual = vit.atual;
  const marcaAtual = atual ? resolverMarca(atual) : null;
  const participaDaAtual = edicoesDoUsuario.find((e) => e.atual);
  const minha = atual?.numero ? inscricoes.find((i) => i.numero === atual.numero) : undefined;
  const chamada = chamadaDaAtual({ participa: !!participaDaAtual, minhaInscricao: minha?.situacao, slug: atual?.slug, inscricoes: atual?.inscricao });
  const ordenadas = [...edicoesDoUsuario].sort((a, b) => b.numero - a.numero);

  return (
    <Area nome={usuario.nome} papel={usuario.papel} avatar={avatar} itens={itens} comandos={comandosDasAbas(itens)}>
      <Pagina estreita>
        <CabecalhoPagina
          titulo="Suas edições"
          destaque="edições"
          descricao="Seu login vale sempre. Aqui ficam as edições de que você participou, para consultar, e a edição que está acontecendo agora."
        />

        {atual && marcaAtual && (
          <section aria-labelledby="titulo-atual" className="card space-y-3 border-l-4" style={{ borderLeftColor: marcaAtual.cor ?? COR_PADRAO }}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="titulo-atual" className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
                Acontecendo agora
              </h2>
              <Selo tom="sucesso">Edição atual</Selo>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LogoEdicao marca={marcaAtual} className="h-12 w-36" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {atual.numero ? `Edição ${atual.numero} · ` : ""}
                  {marcaAtual.nome}
                </p>
                <p className="text-sm text-suave">{[periodo(atual), atual.local].filter(Boolean).join(" · ")}</p>
              </div>
            </div>

            {chamada.tipo === "abrir" ? (
              participaDaAtual?.id === edicao.id ? (
                <p className="text-sm text-suave">Você participa desta edição, e é ela que está aberta agora.</p>
              ) : (
                <form action={escolherEdicao}>
                  <input type="hidden" name="edicao" value={participaDaAtual?.id} />
                  <input type="hidden" name="voltar" value="/" />
                  <BotaoEnviar icone="avancar" enviando="Abrindo…">
                    Abrir a edição atual
                  </BotaoEnviar>
                </form>
              )
            ) : chamada.tipo === "acompanhar" ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex-1 text-sm">
                  Sua inscrição: <Selo tom={situacaoInscricao(chamada.situacao).tom}>{situacaoInscricao(chamada.situacao).rotulo}</Selo>{" "}
                  <span className="text-suave">{situacaoInscricao(chamada.situacao).explicacao}</span>
                </p>
                <Link href="/minha-inscricao" className="btn-secundario">
                  Acompanhar inscrição
                </Link>
              </div>
            ) : chamada.tipo === "inscrever" ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex-1 text-sm text-suave">Você ainda não participa desta edição. As inscrições estão abertas: se quiser, inscreva-se com esta mesma conta.</p>
                <Link href={`/inscricao/${chamada.slug}`} className="btn-primario">
                  Quero me inscrever
                </Link>
              </div>
            ) : chamada.tipo === "em_breve" ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex-1 text-sm text-suave">As inscrições desta edição abrem em breve.</p>
                <Link href={`/inscricao/${chamada.slug}`} className="btn-secundario">
                  Ver a página da edição
                </Link>
              </div>
            ) : chamada.tipo === "encerrada" ? (
              <p className="text-sm text-suave">As inscrições desta edição já foram encerradas.</p>
            ) : (
              <p className="text-sm text-suave">Esta edição não recebe inscrições pelo site: a participação é combinada com a organização.</p>
            )}
          </section>
        )}

        <section aria-labelledby="titulo-minhas" className="card space-y-3">
          <h2 id="titulo-minhas" className="text-lg font-semibold">
            Edições de que você participou
          </h2>
          <ul className="space-y-2">
            {ordenadas.map((e) => {
              const marca = resolverMarca(e);
              const vendo = e.id === edicao.id;
              return (
                <li
                  key={e.id}
                  aria-current={vendo || undefined}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border border-l-4 border-borda p-2 ${vendo ? "bg-marca-fundo" : ""}`}
                  style={{ borderLeftColor: marca.cor ?? COR_PADRAO }}
                >
                  <LogoEdicao marca={marca} className="h-10 w-28" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Edição {e.numero}</span>
                      {e.atual ? <Selo tom="sucesso">Atual</Selo> : <Selo tom="neutro">Só consulta</Selo>}
                      {vendo && <Selo tom="marca">Vendo agora</Selo>}
                    </p>
                    <p className="truncate font-semibold" title={marca.nome}>
                      {marca.nome}
                    </p>
                    <p className="text-xs text-suave">
                      {periodo(e)} · {rotuloSituacaoEdicao(e.situacao)}
                    </p>
                  </div>
                  {vendo ? (
                    <Link href="/" className="btn-secundario">
                      Ir para o início
                    </Link>
                  ) : (
                    <form action={escolherEdicao}>
                      <input type="hidden" name="edicao" value={e.id} />
                      <input type="hidden" name="voltar" value="/" />
                      <BotaoEnviar variante="secundario" icone="avancar" enviando="Abrindo…">
                        Abrir
                      </BotaoEnviar>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </Pagina>
    </Area>
  );
}
