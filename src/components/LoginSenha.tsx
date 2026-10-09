"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Login por e-mail + senha no Supabase Auth.
// "Primeiro acesso" cria a conta; o trigger do banco recusa e-mails fora da
// lista de inscritos. Requer "Confirm email" DESLIGADO no Supabase.
// "Esqueci a senha" usa o e-mail de recuperação do próprio Supabase.
export function LoginSenha() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [enviado, setEnviado] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (modo === "criar" && senha !== confirma) {
      setErro("As senhas não conferem.");
      return;
    }

    setCarregando(true);
    const supabase = createClient();
    const credenciais = { email: email.trim().toLowerCase(), password: senha };

    if (modo === "esqueci") {
      const { error } = await supabase.auth.resetPasswordForEmail(credenciais.email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/nova-senha`,
      });
      setCarregando(false);
      if (error) setErro(traduzir(error.message));
      else setEnviado(true);
      return;
    }

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword(credenciais);
      if (error) {
        setCarregando(false);
        setErro(traduzir(error.message));
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp(credenciais);
      if (error) {
        setCarregando(false);
        setErro(traduzir(error.message));
        return;
      }
      // Com "Confirm email" ligado o Supabase não devolve sessão (e tentaria mandar e-mail).
      if (!data.session) {
        setCarregando(false);
        setErro(
          data.user?.identities?.length === 0
            ? "Esse e-mail já tem senha cadastrada. Use \"Entrar\"."
            : "Conta criada, mas o Supabase está exigindo confirmação por e-mail. Avise a organização.",
        );
        return;
      }
    }

    router.replace("/");
    router.refresh();
  }

  const trocar = (m: Modo) => {
    setModo(m);
    setErro(null);
    setConfirma("");
    setEnviado(false);
  };

  if (modo === "esqueci" && enviado) {
    return (
      <div className="space-y-4 text-left">
        <p className="rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          Se <strong>{email}</strong> já tiver conta, enviamos um link para criar uma nova senha.
          Confira também o spam.
        </p>
        <button type="button" onClick={() => trocar("entrar")} className="btn-secundario w-full">
          Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <div className="grid grid-cols-2 rounded-xl border border-borda-forte bg-superficie-solida p-[3px] text-sm font-semibold">
        {(["entrar", "criar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => trocar(m)}
            className={`rounded-lg py-2 transition ${
              modo === m || (m === "entrar" && modo === "esqueci")
                ? "text-white shadow-[0_4px_14px_-6px_rgb(47_91_255/.7)] [background:var(--grad)]"
                : "text-suave hover:text-foreground"
            }`}
          >
            {m === "entrar" ? "Entrar" : "Primeiro acesso"}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="space-y-3">
        {modo === "esqueci" && (
          <p className="text-sm text-suave">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
        )}
        {modo === "criar" && (
          <p className="text-sm text-suave">
            Use o <strong className="text-foreground">e-mail da inscrição</strong> e escolha uma senha.
          </p>
        )}
        <label className="block">
          <span className="rotulo">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            placeholder="voce@gmail.com"
            className="campo"
          />
        </label>
        {modo !== "esqueci" && (
          <label className="block">
            <span className="rotulo">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === "criar" ? "new-password" : "current-password"}
              minLength={6}
              required
              className="campo"
            />
          </label>
        )}
        {modo === "criar" && (
          <label className="block">
            <span className="rotulo">Repita a senha</span>
            <input
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              className="campo"
            />
          </label>
        )}

        {erro && (
          <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-700 dark:text-red-300">
            {erro}
          </p>
        )}

        <button disabled={carregando} className="btn-primario w-full text-base">
          {carregando
            ? "Aguarde..."
            : modo === "entrar"
              ? "Entrar"
              : modo === "criar"
                ? "Criar senha e entrar"
                : "Enviar link"}
        </button>
      </form>

      {modo === "entrar" && (
        <button type="button" onClick={() => trocar("esqueci")} className="w-full text-sm text-marca">
          Esqueci a senha
        </button>
      )}
      {modo === "esqueci" && (
        <button type="button" onClick={() => trocar("entrar")} className="w-full text-sm text-marca">
          Voltar para o login
        </button>
      )}
    </div>
  );
}

type Modo = "entrar" | "criar" | "esqueci";

function traduzir(msg: string): string {
  if (/database error|inscritos/i.test(msg))
    return "Esse e-mail não está na lista de inscritos do DataHack. Use o e-mail da inscrição ou procure a organização.";
  if (/invalid login credentials/i.test(msg))
    return "E-mail ou senha incorretos. Se é seu primeiro acesso, use a aba \"Primeiro acesso\".";
  if (/already registered|already exists/i.test(msg))
    return "Esse e-mail já tem senha cadastrada. Use \"Entrar\".";
  if (/password/i.test(msg) && /characters|least|weak/i.test(msg))
    return "Senha fraca: use pelo menos 6 caracteres.";
  if (/rate limit|too many|security purposes/i.test(msg))
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  if (/email not confirmed/i.test(msg))
    return "O Supabase está exigindo confirmação de e-mail. Avise a organização.";
  return "Não foi possível entrar: " + msg;
}
