import Link from "next/link";
import { redirect } from "next/navigation";
import { periodo } from "@/modules/edicoes/domain/tipos";
import { COR_PADRAO, resolverMarca } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { situacaoInscricao } from "@/modules/inscricoes/domain/publica";
import { minhasInscricoes } from "@/modules/inscricoes/infra/repositorio";
import { sair } from "@/modules/pessoas/application/actions";
import { usuarioAutenticado } from "@/shared/auth/autenticacao";
import { clienteServidor } from "@/shared/db/servidor";
import { BotaoTema } from "@/shared/ui/BotaoTema";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

// Quem se inscreveu acompanha a inscrição aqui (em análise, lista de espera…), mesmo antes de
// participar de alguma edição. Não usa a sessão das áreas do sistema, que exige participação.
export default async function MinhaInscricao() {
  const cliente = await clienteServidor();
  const auth = await usuarioAutenticado(cliente);
  if (!auth) redirect("/login");
  const inscricoes = await minhasInscricoes(cliente);
  const algumaAprovada = inscricoes.some((i) => i.situacao === "aprovada");

  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:py-12">
      <BotaoTema className="btn-secundario absolute top-4 right-4 size-9 min-h-9 p-0" />
      <header className="space-y-1">
        <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Minha inscrição</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Acompanhe sua inscrição</h1>
        <p className="text-sm text-suave">Conta: {auth.email}</p>
      </header>

      {!inscricoes.length && (
        <p className="card text-sm">Não encontramos inscrição com este e-mail. Se você se inscreveu com outro e-mail, saia e entre com ele.</p>
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
              {i.situacao !== "aprovada" && i.situacao !== "cancelada" && (
                <p className="text-xs text-suave">Esta página se atualiza quando a situação mudar: volte aqui ou entre de novo mais tarde.</p>
              )}
            </li>
          );
        })}
      </ul>

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
