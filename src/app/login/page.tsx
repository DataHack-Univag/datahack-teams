import Link from "next/link";
import { redirect } from "next/navigation";
import { periodo } from "@/modules/edicoes/domain/tipos";
import { resolverMarca } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { TemaDaEdicao } from "@/modules/instituicoes/ui/TemaDaEdicao";
import { vitrine } from "@/modules/inscricoes/infra/repositorio";
import { LoginSenha } from "@/modules/pessoas/ui/LoginSenha";
import { clienteServidor } from "@/shared/db/servidor";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoTema } from "@/shared/ui/BotaoTema";
import { Logo } from "@/shared/ui/Logo";

const MENSAGENS: Record<string, string> = {
  nao_inscrito:
    "Esse e-mail não participa de nenhuma edição do DATAHack. Use o e-mail da inscrição, inscreva-se num evento com inscrição aberta (abaixo) ou procure a organização.",
  falha: "Não foi possível concluir o login. Tente novamente.",
  link_invalido:
    "Link de redefinição inválido ou expirado. Peça um novo em \"Esqueci a senha\" (e abra o link no mesmo navegador).",
};

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;

  // Já logado? Vai direto para o painel.
  const supabase = await clienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims && !erro) redirect("/");

  const mensagem = typeof erro === "string" ? MENSAGENS[erro] ?? MENSAGENS.falha : null;
  // Logo e dados da edição atual; sem a migração 020, fica o de sempre.
  const { atual, inscricoes } = await vitrine(supabase);
  const marca = atual ? resolverMarca(atual) : null;

  return (
    <main className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-8 sm:py-12 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
      <TemaDaEdicao cor={marca?.cor} />
      <BotaoTema className="btn-secundario absolute top-4 right-4 size-9 min-h-9 p-0" />

      {/* ------------------------------------------------ hero */}
      <section className="grid justify-items-start gap-5" style={{ animation: "dh-sobe .7s both" }}>
        {/* A imagem da edição atual: a logo dela ou, sem logo, a placa "DATAHack" na cor dela.
            A logo de sempre só aparece se o banco ainda não tiver a edição atual (vitrine vazia). */}
        {marca ? (
          <LogoEdicao
            marca={marca}
            className={marca.logo ? "h-20 w-60 sm:h-24 sm:w-72 lg:h-32 lg:w-96" : "h-16 w-56 sm:h-20 sm:w-72 lg:h-24 lg:w-80"}
            texto="text-2xl sm:text-3xl lg:text-4xl"
          />
        ) : (
          <Logo className="w-52 sm:w-72 lg:w-96" />
        )}
        <span className="chip">
          <i className="size-1.5 rounded-full bg-[var(--verde)]" style={{ animation: "dh-pulso 2s infinite" }} />
          {atual
            ? `${marca!.nome} · ${periodo(atual)}${atual.local ? ` · ${atual.local}` : ""}`
            : "DATAHack · equipes, entregas e avaliação"}
        </span>
        <h1 className="max-w-[13ch] text-4xl leading-[0.98] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
          Transforme dados em <span className="grad-text">decisão</span>
        </h1>
        <p className="max-w-[52ch] text-suave sm:text-lg">
          Sua equipe, os desafios, as fontes de dados e o lugar das entregas — tudo num só lugar.
        </p>
      </section>

      {/* ------------------------------------------------ login */}
      <div className="card destaque-grad w-full max-w-md justify-self-center space-y-5 lg:justify-self-end">
        <div>
          <h2 className="text-xl font-bold">Entrar</h2>
          <p className="text-sm text-suave">Para quem participa do evento: alunos, bancas, mentoria e organização.</p>
        </div>

        {mensagem && (
          <Aviso tom="erro" titulo="Não deu para entrar">
            {mensagem}
          </Aviso>
        )}

        <LoginSenha />

        {inscricoes.length > 0 && (
          <div className="space-y-2 border-t border-borda pt-4">
            <p className="text-sm font-semibold">Ainda não se inscreveu?</p>
            <ul className="space-y-1.5">
              {inscricoes.map((i) => (
                <li key={i.slug}>
                  <Link href={`/inscricao/${i.slug}`} className="flex items-center justify-between gap-2 rounded-xl border border-borda p-3 text-sm hover:border-marca">
                    <span className="min-w-0">
                      <strong className="block truncate">{i.nome}</strong>
                      <span className="text-xs text-suave">{i.situacao === "aberta" ? "Inscrições abertas" : "Inscrições em breve"}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-marca">Inscrever-se →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
