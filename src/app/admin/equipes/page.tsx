import Link from "next/link";
import { SubAbasEquipes } from "@/app/admin/equipes/SubAbasEquipes";
import { pendenciasEquipe } from "@/modules/equipes/domain/permissoes";
import { lerConfiguracao, listarEquipes } from "@/modules/equipes/infra/repositorio";
import { CartaoEquipe } from "@/modules/equipes/ui/CartaoEquipe";
import { CriarEquipe, FormConfiguracao } from "@/modules/equipes/ui/FormulariosOrganizacao";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { listarSemEquipe } from "@/modules/pessoas/infra/repositorio";
import { trocasPendentes } from "@/modules/trocas/infra/repositorio";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { BotaoLink } from "@/shared/ui/Botao";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { Menu } from "@/shared/ui/Menu";
import { CabecalhoPagina, Pagina, SubAbas } from "@/shared/ui/Pagina";

// Aba "Equipes": todas as equipes, quem está sem equipe, criar equipe e configuração.
export default async function AdminEquipes({ searchParams }: PageProps<"/admin/equipes">) {
  const { filtro } = await searchParams;
  const soPendentes = filtro === "pendentes";
  const { cliente } = await sessaoAtual();
  const [config, equipes, semEquipe, trocas] = await Promise.all([
    lerConfiguracao(cliente),
    listarEquipes(cliente),
    listarSemEquipe(cliente),
    trocasPendentes(cliente),
  ]);
  const comPendencia = equipes.filter((e) => pendenciasEquipe(e).length > 0);
  const lista = soPendentes ? comPendencia : equipes;

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Equipes" }]}
        titulo="As equipes"
        destaque="equipes"
        descricao="Integrantes, repositórios e links de entrega de cada equipe."
        acoes={
          <>
            <BotaoAjuda titulo="Equipes">
              <ul>
                <li>
                  Para montar várias equipes de uma vez, equilibradas por semestre e nota, use o <strong>Gerador de equipes</strong>.
                </li>
                <li>Abra uma equipe para adicionar ou remover integrantes, trocar o líder ou editar o repositório.</li>
                <li>
                  Os alunos pedem troca de equipe pelo sistema; acompanhe em <strong>Trocas</strong>.
                </li>
                <li>No fim do prazo, marque “Bloquear a edição pelos alunos” na configuração.</li>
              </ul>
            </BotaoAjuda>
            <Menu
              rotulo="Exportar"
              icone="baixar"
              titulo="Planilha (CSV)"
              itens={[{ rotulo: "Equipes e integrantes", descricao: "Uma linha por integrante, com repositório e links.", href: "/admin/equipes/exportar", icone: "baixar", baixar: true }]}
            />
            <BotaoLink href="/admin/equipes/gerador" variante="primario" icone="gerador">
              Gerar equipes
            </BotaoLink>
          </>
        }
      />
      <SubAbasEquipes ativa="lista" trocas={trocas.length} equipes={equipes.length} />

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
          titulo={soPendentes ? "Nenhuma equipe com pendência" : "Nenhuma equipe ainda"}
          acao={!soPendentes && <BotaoLink href="/admin/equipes/gerador" variante="primario" icone="gerador">Abrir o gerador</BotaoLink>}
        >
          {soPendentes ? "Todas têm líder e repositório público." : "Monte as equipes com o gerador ou crie uma à mão logo abaixo."}
        </EstadoVazio>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map((e, i) => (
            <CartaoEquipe key={e.id} equipe={e} maxMembros={config.max_membros} indice={i} />
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
                    <p className="truncate text-xs text-suave">{[i.curso, i.semestre && `${i.semestre}º sem.`, i.email].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-suave">
                Para colocar alguém numa equipe, abra a equipe e use “Adicionar integrante”, ou{" "}
                <Link href="/admin/equipes/gerador" className="text-marca underline">
                  gere equipes só com quem está sem equipe
                </Link>
                .
              </p>
            </>
          )}
        </section>

        <div className="space-y-6">
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold">Criar equipe à mão</h2>
            <CriarEquipe />
          </section>
          <section id="configuracao" className="card scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold">Configuração</h2>
            <FormConfiguracao config={config} />
          </section>
        </div>
      </div>
    </Pagina>
  );
}
