import { redirect } from "next/navigation";
import { BotaoTema } from "@/components/BotaoTema";
import { LoginSenha } from "@/components/LoginSenha";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

const MENSAGENS: Record<string, string> = {
  nao_inscrito:
    "Esse e-mail não está na lista de inscritos do DataHack. Use o e-mail da inscrição ou procure a organização.",
  falha: "Não foi possível concluir o login. Tente novamente.",
  link_invalido:
    "Link de redefinição inválido ou expirado. Peça um novo em \"Esqueci a senha\" (e abra o link no mesmo navegador).",
};

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;

  // Já logado? Vai direto para o painel.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims && !erro) redirect("/");

  const mensagem = typeof erro === "string" ? MENSAGENS[erro] ?? MENSAGENS.falha : null;

  return (
    <main className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-8 sm:py-12 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
      <BotaoTema className="btn-secundario absolute top-4 right-4 size-9 min-h-9 p-0" />

      {/* ------------------------------------------------ hero */}
      <section className="grid justify-items-start gap-5" style={{ animation: "dh-sobe .7s both" }}>
        <Logo className="w-52 sm:w-72 lg:w-96" />
        <span className="chip">
          <i className="size-1.5 rounded-full bg-[var(--verde)]" style={{ animation: "dh-pulso 2s infinite" }} />
          DATAHack Univag 2026 · 09–10 out · Várzea Grande – MT
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
          <p className="text-sm text-suave">Acesso restrito aos inscritos no evento.</p>
        </div>

        {mensagem && (
          <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            {mensagem}
          </p>
        )}

        <LoginSenha />
      </div>
    </main>
  );
}
