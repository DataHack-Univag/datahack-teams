import { resumoEdicoes } from "@/modules/edicoes/infra/repositorio";
import { instituicoesDaEdicao, listarInstituicoes } from "@/modules/instituicoes/infra/repositorio";
import { FormAcessoEdicao } from "@/modules/instituicoes/ui/FormAcessoEdicao";
import { CartaoEdicao, FormDadosEdicao, FormNovaEdicao } from "@/modules/edicoes/ui/Edicoes";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Edições do evento: cada DATAHack fica registrado com o formato, as regras e o regulamento dele.
export default async function AdminEdicoes({ searchParams }: PageProps<"/admin/edicoes">) {
  const { criada } = await searchParams;
  const { cliente, edicao, edicoesOrganizadas } = await sessaoAtual();
  const [numeros, instituicoes, daEdicao] = await Promise.all([
    resumoEdicoes(cliente),
    // Antes da migração 017 a tela segue sem a parte de acesso.
    listarInstituicoes(cliente).catch(() => null),
    instituicoesDaEdicao(cliente, edicao.id),
  ]);

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Edições" }]}
        titulo="Edições do evento"
        destaque="Edições"
        descricao="Cada edição guarda o formato, as regras das equipes e o regulamento da avaliação. Nada de uma edição é apagado."
        acoes={
          <>
            <BotaoAjuda titulo="Edições">
              <ul>
                <li>
                  A <strong>edição atual</strong> é a que alunos e bancas veem ao entrar. A organização escolhe qual edição está vendo no seletor do topo.
                </li>
                <li>Para preparar a próxima edição, crie-a copiando o regulamento da anterior e ajuste o que mudou.</li>
                <li>Quando a nova edição começar, use “Tornar a edição atual”. A anterior continua guardada para consulta.</li>
              </ul>
            </BotaoAjuda>
            <BotaoLink href="/admin/instituicoes" icone="instituicao">
              Instituições
            </BotaoLink>
            <BotaoLink href="/admin/edicoes/regulamento" icone="avaliacao">
              Regulamento desta edição
            </BotaoLink>
          </>
        }
      />

      {criada && (
        <Aviso tom="sucesso" titulo="Edição criada">
          Você já está vendo a edição nova (seletor no topo). Cadastre os alunos e as bancas em Pessoas e confira o regulamento.
        </Aviso>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {edicoesOrganizadas.map((e) => (
          <CartaoEdicao key={e.id} edicao={e} numeros={numeros.get(e.id)} vendo={e.id === edicao.id} />
        ))}
      </div>

      {instituicoes && (
        <section id="acesso" className="card scroll-mt-24 space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Acesso e marca da edição {edicao.numero}</h2>
            <p className="text-sm text-suave">Evento fechado de uma instituição, de várias instituições ou aberto a todos, e a logo que aparece no topo.</p>
          </div>
          <FormAcessoEdicao key={edicao.id} edicao={edicao} instituicoes={instituicoes} escolhidas={daEdicao.map((i) => i.id)} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">Dados da edição {edicao.numero}</h2>
          <FormDadosEdicao key={edicao.id} edicao={edicao} />
        </section>
        <section id="nova" className="card scroll-mt-24 space-y-3">
          <h2 className="text-lg font-semibold">Nova edição</h2>
          <FormNovaEdicao edicoes={edicoesOrganizadas} base={edicao} />
        </section>
      </div>
    </Pagina>
  );
}
