import { NovaSenha } from "@/components/NovaSenha";

// Aberta pelo link de "esqueci a senha": o usuário já chega com sessão de recuperação.
export default function PaginaNovaSenha() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Nova senha</h1>
          <p className="text-sm text-suave">Escolha a nova senha de acesso ao DataHack.</p>
        </div>
        <NovaSenha />
      </div>
    </main>
  );
}
