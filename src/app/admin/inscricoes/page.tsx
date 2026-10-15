import { headers } from "next/headers";
import Link from "next/link";
import { salvarTermo } from "@/modules/inscricoes/application/actions";
import { camposDaEdicao, listarInscricoes, termoAtual } from "@/modules/inscricoes/infra/repositorio";
import { CopiarLink } from "@/modules/inscricoes/ui/CopiarLink";
import { ListaInscricoes } from "@/modules/inscricoes/ui/ListaInscricoes";
import { rotuloAcesso } from "@/modules/instituicoes/domain/tipos";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { AreaTexto } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Inscrições da edição: a fila para aprovar, a lista de espera, o termo e o link público.
export default async function AdminInscricoes() {
  const { cliente, edicao } = await sessaoAtual();
  const acesso = edicao.acesso ?? "lista";
  const dados = await Promise.all([listarInscricoes(cliente, edicao.id), camposDaEdicao(cliente, edicao.id), termoAtual(cliente, edicao.id)]).catch(() => null);
  const h = await headers();
  const link = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}/inscricao/${edicao.slug}`;
  const aprovadas = dados?.[0].filter((i) => i.situacao === "aprovada").length ?? 0;

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Inscrições" }]}
        titulo={`Inscrições · Edição ${edicao.numero}`}
        destaque="Inscrições"
        descricao="Quem se inscreveu, quem está na lista de espera e quem a organização ainda precisa analisar."
        acoes={
          <>
            <BotaoAjuda titulo="Inscrições">
              <ul>
                <li>Aprovação automática: quem se inscreve com vaga já entra; sem vaga, vai para a lista de espera.</li>
                <li>Abriu vaga (alguém cancelou), o primeiro da lista de espera entra sozinho.</li>
                <li>Aprovação pela organização: cada inscrição espera aqui até alguém decidir.</li>
                <li>Aprovada = participa da edição (aparece em Pessoas e pode formar equipe).</li>
                <li>Quem está numa equipe precisa sair dela antes de ter a inscrição cancelada.</li>
              </ul>
            </BotaoAjuda>
            <BotaoLink href="/admin/inscricoes/exportar" icone="baixar">
              Exportar (CSV)
            </BotaoLink>
            <BotaoLink href="/admin/edicoes/inscricao" icone="editar">
              Perguntas
            </BotaoLink>
          </>
        }
      />

      {!dados ? (
        <Aviso tom="alerta" titulo="Falta preparar o banco">
          As inscrições precisam das migrações 018 e 020. Rode-as no SQL Editor do Supabase e recarregue a página.
        </Aviso>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="card space-y-2">
              <p className="text-sm">
                Esta edição é <strong>{rotuloAcesso(acesso).toLowerCase()}</strong>
                {acesso !== "lista" && <> · aprovação {edicao.aprovacao === "manual" ? "pela organização" : "automática"}</>}.{" "}
                <Link href="/admin/edicoes#acesso" className="text-marca underline">
                  Mudar
                </Link>
              </p>
              {acesso === "lista" ? (
                <p className="text-xs text-suave">Em evento fechado não há página pública: as inscrições vêm do cadastro em Pessoas.</p>
              ) : (
                <CopiarLink link={link} />
              )}
            </div>
            <div className="card text-center">
              <p className="text-[11px] text-suave">aprovadas</p>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {aprovadas}
                {edicao.vagas ? <span className="text-base text-suave"> / {edicao.vagas}</span> : null}
              </p>
              <p className="text-[11px] text-suave">{edicao.vagas ? "vagas" : "sem limite de vagas"}</p>
            </div>
          </section>

          <ListaInscricoes inscricoes={dados[0]} campos={dados[1]} />

          <details className="card" id="termo">
            <summary className="cursor-pointer font-semibold">
              Termo de uso dos dados (LGPD){dados[2] ? ` · versão ${dados[2].versao}` : " · ainda não definido"}
            </summary>
            <Formulario action={salvarTermo} className="mt-3 space-y-3">
              <Ocultos valores={{ id: edicao.id }} />
              <AreaTexto
                rotulo="Texto do termo"
                name="texto"
                rows={8}
                required
                minLength={20}
                maxLength={20000}
                defaultValue={dados[2]?.texto ?? ""}
                placeholder="Para que os dados são usados, quem vê, por quanto tempo ficam guardados e como pedir a exclusão."
                dica="Com termo, a inscrição pública pede o aceite. Mudar o texto cria uma versão nova; cada inscrição guarda a versão que aceitou."
              />
              <BotaoEnviar icone="ok">Salvar termo</BotaoEnviar>
            </Formulario>
          </details>
        </>
      )}
    </Pagina>
  );
}
