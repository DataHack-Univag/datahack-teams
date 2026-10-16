import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { periodo } from "@/modules/edicoes/domain/tipos";
import { COR_PADRAO, resolverMarca } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { TemaDaEdicao } from "@/modules/instituicoes/ui/TemaDaEdicao";
import { fraseInscricoes, vagasRestantes } from "@/modules/inscricoes/domain/publica";
import { edicaoPublica } from "@/modules/inscricoes/infra/repositorio";
import { FormInscricaoPublica } from "@/modules/inscricoes/ui/FormInscricaoPublica";
import { usuarioAutenticado } from "@/shared/auth/autenticacao";
import { clienteServidor } from "@/shared/db/servidor";
import { BotaoTema } from "@/shared/ui/BotaoTema";
import { Selo } from "@/shared/ui/Selo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await edicaoPublica(await clienteServidor(), slug).catch(() => null);
  return { title: e ? `Inscrição · ${resolverMarca(e).nome}` : "Inscrição" };
}

// Página pública de inscrição de uma edição (evento de instituições ou aberto). Não exige login.
export default async function PaginaInscricao({ params }: Props) {
  const { slug } = await params;
  const cliente = await clienteServidor();
  const [edicao, logado] = await Promise.all([edicaoPublica(cliente, slug), usuarioAutenticado(cliente)]);
  if (!edicao) notFound();

  const marca = resolverMarca(edicao);
  const restam = vagasRestantes(edicao);
  const aberta = edicao.situacao === "aberta";

  return (
    <main className="relative mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:py-12" style={{ borderTop: `4px solid ${marca.cor ?? COR_PADRAO}` }}>
      <TemaDaEdicao cor={marca.cor} />
      <BotaoTema className="btn-secundario absolute top-4 right-4 size-9 min-h-9 p-0" />

      <header className="grid gap-4">
        <LogoEdicao marca={marca} className="h-16 w-52 sm:h-20 sm:w-64" />
        <div className="flex flex-wrap gap-2">
          <Selo tom={aberta ? "sucesso" : edicao.situacao === "em_breve" ? "alerta" : "neutro"}>{fraseInscricoes(edicao)}</Selo>
          {aberta && restam !== null && (
            <Selo tom={restam > 0 ? "marca" : "alerta"}>{restam > 0 ? `${restam} vaga(s) restante(s)` : "Vagas esgotadas: entra na lista de espera"}</Selo>
          )}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">{marca.nome}</h1>
        <p className="text-suave">
          {periodo(edicao)}
          {edicao.local ? ` · ${edicao.local}` : ""}
        </p>
        {edicao.descricao && <p className="max-w-[65ch] whitespace-pre-line">{edicao.descricao}</p>}
      </header>

      <section className="card destaque-grad max-w-2xl space-y-5">
        <div>
          <h2 className="text-xl font-bold">Inscrição</h2>
          <p className="text-sm text-suave">
            {edicao.aprovacao === "manual"
              ? "A organização analisa cada inscrição. Você acompanha a situação entrando com seu e-mail e senha."
              : "Com vaga, você já entra no evento ao se inscrever. Sem vaga, entra na lista de espera, na ordem de chegada."}
          </p>
        </div>
        {aberta ? (
          <FormInscricaoPublica edicao={edicao} logado={logado?.email ?? null} />
        ) : (
          <p className="rounded-xl bg-marca-fundo p-4 text-sm">{fraseInscricoes(edicao)}</p>
        )}
        <p className="border-t border-borda pt-4 text-sm text-suave">
          Já se inscreveu?{" "}
          <Link href={logado ? `/minha-inscricao?edicao=${encodeURIComponent(slug)}` : "/login"} className="font-semibold text-marca underline">
            {logado ? "Ver a minha inscrição" : "Entre para acompanhar"}
          </Link>
        </p>
      </section>
    </main>
  );
}
