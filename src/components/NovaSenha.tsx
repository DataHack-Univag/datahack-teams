"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NovaSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha !== confirma) {
      setErro("As senhas não conferem.");
      return;
    }
    setCarregando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    if (error) {
      setCarregando(false);
      setErro(
        /different from the old/i.test(error.message)
          ? "A nova senha precisa ser diferente da anterior."
          : /session/i.test(error.message)
            ? "Link expirado. Peça um novo em \"Esqueci a senha\"."
            : "Não foi possível salvar: " + error.message,
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <label className="block">
        <span className="rotulo">Nova senha</span>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
          autoFocus
          className="campo"
        />
      </label>
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
      {erro && (
        <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-700 dark:text-red-300">{erro}</p>
      )}
      <button disabled={carregando} className="btn-primario w-full text-base">
        {carregando ? "Salvando..." : "Salvar e entrar"}
      </button>
    </form>
  );
}
