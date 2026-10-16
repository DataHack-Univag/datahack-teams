import Link from "next/link";
import { redirect } from "next/navigation";
import { periodo } from "@/modules/edicoes/domain/tipos";
import { COR_PADRAO, resolverMarca } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { TemaDaEdicao } from "@/modules/instituicoes/ui/TemaDaEdicao";
import { situacaoInscricao } from "@/modules/inscricoes/domain/publica";
import { edicaoPublica, minhasInscricoes } from "@/modules/inscricoes/infra/repositorio";
import { emailNormalizado } from "@/modules/pessoas/infra/repositorio";
import { sair } from "@/modules/pessoas/application/actions";
import { usuarioAutenticado } from "@/shared/auth/autenticacao";
import { clienteServidor } from "@/shared/db/servidor";
import { AoVivo } from "@/shared/ui/AoVivo";
import { BotaoTema } from "@/shared/ui/BotaoTema";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

// Quem se inscreveu acompanha a inscrição aqui (em análise, lista de espera…), mesmo antes de
// participar de alguma edição. Não usa a sessão das áreas do sistema, que exige participação.
// Vindo da página de uma edição (?edicao=slug), a situação naquela edição aparece primeiro, e as
// outras inscrições da conta (de edições anteriores) ficam separadas, para não confundir.
export default async function MinhaInscricao({ searchParams }: PageProps<"/minha-inscricao">) {
  const cliente = await clienteServidor();
  const auth = await usuarioAutenticado(cliente);
  if (!auth) redirect("/login");
  const pedido = (await searchParams).edicao;
  const slug = typeof pedido === "string" && pedido ? pedido : null;
  const [todas, email, pedida] = await Promise.all([
    minhasInscricoes(cliente),
    emailNormalizado(cliente),
    slug ? edicaoPublica(cliente, slug) : Promise.resolve(null),
  ]);
  const foco = slug ? todas.find((i) => i.slug === slug) : undefined;
  const inscricoes = foco ? [foco] : slug ? [] : todas;
  const outras = slug ? todas.filter((i) => i !== foco) : [];
  // O aviso de "aprovada" diz de qual edição é.
  const aprovada = inscricoes.find((i) => i.situacao === "aprovada");
  const algumaAprovada = !!aprovada || outras.some((i) => i.situacao === "aprovada");
  const esperando = todas.some((i) => i.situacao === "pendente" || i.situacao === "espera");
  const nomeDa = (i: { edicao: string; marca: Parameters<typeof resolverMarca>[0]["marca"] }) => resolverMarca({ nome: i.edicao, marca: i.marca }).nome;

  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:py-12">
      {/* A cor da edição mais recente em que a pessoa se inscreveu. */}
      <TemaDaEdicao cor={(pedida ? resolverMarca(pedida).cor : null) ?? (inscricoes[0] ?? todas[0])?.marca?.cor} />
      <BotaoTema className="btn-secundario absolute top-4 right-4 size-9 min-h-9 p-0" />
      <header className="space-y-1">
        <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Minha inscrição</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Acompanhe sua inscrição</h1>
        <p className="text-sm text-suave">Conta: {auth.email}</p>
      </header>

      {/* Aprovou (ou saiu da espera): a tela muda na hora, sem recarregar. */}
      {esperando && <AoVivo tabela="inscricoes" filtro={`email=eq.${email ?? auth.email}`} />}
      {aprovada && (
        <div role="status" className="card flex flex-wrap items-center gap-3 border-l-4 border-l-emerald-500">
          <Icone nome="ok" className="size-6 text-emerald-600" />
          <p className="flex-1 font-semibold">Sua inscrição na {nomeDa(aprovada)} foi aprovada! Você já pode entrar no sistema do evento.</p>
          <Link href="/" className="btn-primario">
            Entrar agora
          </Link>
        </div>
      )}

      {slug && !foco ? (
        <div className="card flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm">
            Você ainda não se inscreveu{pedida ? (
              <>
                {" "}na <strong>{resolverMarca(pedida).nome}</strong>
              </>
            ) : (
              " nesta edição"
            )}
            .
          </p>
          {pedida && pedida.situacao === "aberta" && (
            <Link href={`/inscricao/${encodeURIComponent(slug)}`} className="btn-primario">
              Ir para a inscrição
            </Link>
          )}
        </div>
      ) : (
        !inscricoes.length && (
          <p className="card text-sm">Não encontramos inscrição com este e-mail. Se você se inscreveu com outro e-mail, saia e entre com ele.</p>
        )
      )}

      <ul className="space-y-3">
        {inscricoes.map((i) => {
          const s = situacaoInscricao(i.situacao);
          const marca = resolverMarca({ nome: i.edicao, marca: i.marca });
          return (
            <li key={i.slug} className="card space-y-3" style={{ borderTop: `4px solid ${marca.cor ?? COR_PADRAO}` }}>
              <div className="flex flex-wrap items-center gap-3">
                <LogoEdicao marca={marca} className="h-12 w-36" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold break-words">{marca.nome}</h2>
                  <p className="text-xs text-suave">
                    {periodo(i)}
                    {i.local ? ` · ${i.local}` : ""}
                  </p>
                </div>
                <Selo tom={s.tom}>{s.rotulo}</Selo>
              </div>
              <p className="text-sm">
                {s.explicacao}
                {i.situacao === "espera" && i.posicao ? ` Você é o nº ${i.posicao} da fila.` : ""}
              </p>
              {(i.situacao === "pendente" || i.situacao === "espera") && (
                <p className="flex items-center gap-1.5 text-xs text-suave">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden /> Esta tela se atualiza sozinha quando a situação mudar.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {outras.length > 0 && (
        <section aria-labelledby="titulo-outras" className="space-y-2">
          <h2 id="titulo-outras" className="text-sm font-semibold text-suave">
            Outras inscrições desta conta
          </h2>
          <ul className="space-y-2">
            {outras.map((i) => {
              const s = situacaoInscricao(i.situacao);
              return (
                <li key={i.slug} className="flex flex-wrap items-center gap-2 rounded-xl border border-borda p-3 text-sm">
                  <span className="flex-1 font-medium">
                    Edição {i.numero} · {nomeDa(i)}
                  </span>
                  <Selo tom={s.tom}>{s.rotulo}</Selo>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {algumaAprovada && (
          <Link href="/" className="btn-primario">
            <Icone nome="avancar" className="size-4" /> Entrar no sistema do evento
          </Link>
        )}
        <form action={sair}>
          <button className="btn-secundario">
            <Icone nome="sair" className="size-4" /> Sair
          </button>
        </form>
      </div>
    </main>
  );
}
