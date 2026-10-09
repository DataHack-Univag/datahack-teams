import { redirect } from "next/navigation";
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
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm space-y-6 text-center">
        <div className="space-y-3">
          <Logo className="mx-auto w-52" />
          <h1 className="sr-only">DATAHack Univag 2026</h1>
          <p className="text-suave">Equipes, entregas e materiais do evento</p>
        </div>

        {mensagem && (
          <p className="rounded-xl bg-red-50 p-3 text-left text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {mensagem}
          </p>
        )}

        <LoginSenha />

        <p className="text-xs text-suave">
          Acesso restrito aos inscritos no evento.
        </p>
      </div>
    </main>
  );
}
