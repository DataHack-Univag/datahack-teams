import Link from "next/link";
import { SubAbasEquipes } from "@/app/admin/equipes/SubAbasEquipes";
import { rotuloModo } from "@/modules/edicoes/domain/tipos";
import { pendenciasEquipe } from "@/modules/equipes/domain/permissoes";
import { listarEquipes, listarPropostas } from "@/modules/equipes/infra/repositorio";
import { CartaoEquipe } from "@/modules/equipes/ui/CartaoEquipe";
import { CriarEquipe, FormRegrasEquipes } from "@/modules/equipes/ui/FormulariosOrganizacao";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { cursoSemestre } from "@/modules/pessoas/domain/tipos";
import { listarSemEquipe, presencaDaEdicao } from "@/modules/pessoas/infra/repositorio";
import { trocasPendentes } from "@/modules/trocas/infra/repositorio";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { Menu } from "@/shared/ui/Menu";
import { CabecalhoPagina, Pagina, SubAbas } from "@/shared/ui/Pagina";

// Aba "Equipes": equipes aprovadas da edição, quem está sem equipe, criar equipe e regras.
export default async function AdminEquipes({ searchParams }: PageProps<"/admin/equipes">) {
  const { filtro, arquivada } = await searchParams;
  const soPendentes = filtro === "pendentes";
  const { cliente, edicao } = await sessaoAtual();
  const [equipes, propostas, semEquipe, trocas, presenca] = await Promise.all([
    listarEquipes(cliente, edicao.id),
    listarPropostas(cliente, edicao.id),
    listarSemEquipe(cliente, edicao.id),
    trocasPendentes(cliente, edicao.id),
    presencaDaEdicao(cliente, edicao.id),
  ]);
  const comPendencia = equipes.filter((e) => pendenciasEquipe(e).length > 0);
  const lista = soPendentes ? comPendencia : equipes;
  const porProposta = edicao.modo_formacao === "alunos_propoem";

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Equipes" }]}
        titulo="As equipes"
        destaque="equipes"
        descricao={`Integrantes, repositórios e links de entrega. Formação nesta edição: ${rotuloModo(edicao.modo_formacao).toLowerCase()}.`}
        acoes={
          <>
            <BotaoAjuda titulo="Equipes">
              <ul>
                <li>
                  O jeito de formar as equipes é escolhido por edição em <strong>Regras das equipes</strong> (gerador, à mão ou
                  proposta pelos alunos).
                </li>
                <li>Abra uma equipe para adicionar ou remover integrantes, trocar o líder ou editar o repositório.</li>
                <li>
                  Nada é apagado: arquivar uma equipe tira ela das listas, mas o histórico continua guardado.
                </li>
                <li>No fim do prazo, marque “Bloquear a edição pelos alunos”.</li>
              </ul>
            </BotaoAjuda>
            <Menu
              rotulo="Exportar"
              icone="baixar"
              titulo="Planilha (CSV)"
              itens={[{ rotulo: "Equipes e integrantes", descricao: "Uma linha por integrante, com repositório e links.", href: "/admin/equipes/exportar", icone: "baixar", baixar: true }]}
            />
            {porProposta ? (
              <BotaoLink href="/admin/equipes/propostas" variante="primario" icone="equipe">
                Ver propostas
              </BotaoLink>
            ) : (
              <BotaoLink href="/admin/equipes/gerador" variante="primario" icone="gerador">
                Gerar equipes
              </BotaoLink>
            )}
          </>
        }
      />
      <SubAbasEquipes ativa="lista" trocas={trocas.length} equipes={equipes.length} propostas={propostas.length} />

      {arquivada && <Aviso tom="sucesso">Equipe arquivada. Ela continua no histórico.</Aviso>}

      {equipes.length > 0 && (
        <SubAbas
          ativa={soPendentes ? "pendentes" : "todas"}
          abas={[
            { id: "todas", rotulo: "Todas", href: "/admin/equipes", contagem: equipes.length },
            { id: "pendentes", rotulo: "Com pendência", href: "/admin/equipes?filtro=pendentes", contagem: comPendencia.length },
          ]}
        />
      )}

      {lista.length === 0 ? (
        <EstadoVazio
          icone="equipe"
          titulo={soPendentes ? "Nenhuma equipe com pendência" : "Nenhuma equipe aprovada ainda"}
          acao={
            !soPendentes &&
            (porProposta ? (
              <BotaoLink href="/admin/equipes/propostas" variante="primario">Ver propostas</BotaoLink>
            ) : (
              <BotaoLink href="/admin/equipes/gerador" variante="primario" icone="gerador">Abrir o gerador</BotaoLink>
            ))
          }
        >
          {soPendentes
            ? "Todas têm líder e repositório público."
            : porProposta
              ? "Nesta edição os alunos propõem as equipes; aprove as propostas para elas aparecerem aqui."
              : "Monte as equipes com o gerador ou crie uma à mão logo abaixo."}
        </EstadoVazio>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map((e, i) => (
            <CartaoEquipe key={e.id} equipe={e} maxMembros={edicao.max_membros} indice={i} presenca={presenca} />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">Alunos sem equipe ({semEquipe.length})</h2>
          {semEquipe.length === 0 ? (
            <p className="text-sm text-suave">Todos os alunos têm equipe. 🎉</p>
          ) : (
            <>
              <ul className="max-h-96 divide-y divide-borda overflow-y-auto">
                {semEquipe.map((i) => (
                  <li key={i.email} className="py-2">
                    <p className="text-sm font-medium">{i.nome}</p>
                    <p className="truncate text-xs text-suave">{[cursoSemestre(i), i.email].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-suave">
                Para colocar alguém numa equipe, abra a equipe e use “Adicionar integrante”
                {porProposta ? "." : (
                  <>
                    , ou{" "}
                    <Link href="/admin/equipes/gerador" className="text-marca underline">
                      gere equipes só com quem está sem equipe
                    </Link>
                    .
                  </>
                )}
              </p>
            </>
          )}
        </section>

        <div className="space-y-6">
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold">Criar equipe à mão</h2>
            <CriarEquipe />
          </section>
          <section id="regras" className="card scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold">Regras das equipes nesta edição</h2>
            <FormRegrasEquipes edicao={edicao} />
          </section>
        </div>
      </div>
    </Pagina>
  );
}
