import { resumoEdicoes } from "@/modules/edicoes/infra/repositorio";
import { COR_PADRAO, resolverMarca } from "@/modules/instituicoes/domain/tipos";
import { instituicoesDaEdicao, listarInstituicoes } from "@/modules/instituicoes/infra/repositorio";
import { FormAcessoEdicao } from "@/modules/instituicoes/ui/FormAcessoEdicao";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { CartaoEdicao, FormDadosEdicao } from "@/modules/edicoes/ui/Edicoes";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Aviso } from "@/shared/ui/Aviso";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";
import { Selo } from "@/shared/ui/Selo";

// Edições do evento: a lista de todas e, embaixo, as configurações da que a organização está
// vendo. Criar uma edição nova é outra tela (/admin/edicoes/nova), para não confundir as duas.
export default async function AdminEdicoes({ searchParams }: PageProps<"/admin/edicoes">) {
  const { criada } = await searchParams;
  const { cliente, edicao, edicoesOrganizadas } = await sessaoAtual();
  const [numeros, instituicoes, daEdicao] = await Promise.all([
    resumoEdicoes(cliente),
    // Antes da migração 017 a tela segue sem a parte de acesso.
    listarInstituicoes(cliente).catch(() => null),
    instituicoesDaEdicao(cliente, edicao.id),
  ]);
  const marca = resolverMarca(edicao);

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
                  A <strong>edição atual</strong> é a que participantes e bancas veem ao entrar. A organização escolhe qual edição está vendo no menu de edições do topo.
                </li>
                <li>As configurações embaixo são sempre da edição que você está vendo (com a logo e a cor dela).</li>
                <li>Para preparar a próxima edição, use “Nova edição” e copie o regulamento de uma anterior.</li>
                <li>Quando a nova edição começar, use “Tornar a edição atual”. A anterior continua guardada para consulta.</li>
              </ul>
            </BotaoAjuda>
            <BotaoLink href="/admin/edicoes/nova" icone="mais_novo" variante="primario">
              Nova edição
            </BotaoLink>
          </>
        }
      />

      {criada && (
        <Aviso tom="sucesso" titulo="Edição criada">
          Você já está vendo a edição nova: as configurações abaixo são dela. Cadastre os participantes e as bancas em Pessoas e confira o regulamento.
        </Aviso>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Todas as edições ({edicoesOrganizadas.length})</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {edicoesOrganizadas.map((e) => (
            <CartaoEdicao key={e.id} edicao={e} numeros={numeros.get(e.id)} vendo={e.id === edicao.id} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ configurações da edição que está sendo vista */}
      <section
        id="configuracoes"
        aria-labelledby="titulo-configuracoes"
        className="scroll-mt-24 space-y-5 rounded-3xl border-2 border-t-8 border-borda bg-superficie-solida/40 p-4 sm:p-6"
        style={{ borderTopColor: marca.cor ?? COR_PADRAO }}
      >
        <header className="flex flex-wrap items-center gap-4">
          <LogoEdicao marca={marca} className="h-12 w-36" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Configurações da edição que você está vendo</p>
            <h2 id="titulo-configuracoes" className="text-xl font-bold break-words">
              Edição {edicao.numero} · {edicao.nome}
            </h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Selo tom="marca">Você está vendo</Selo>
              {edicao.atual ? <Selo tom="sucesso">Atual dos participantes e bancas</Selo> : <Selo tom="alerta">Não é a atual</Selo>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoLink href="/admin/edicoes/inscricao" icone="editar" tamanho="pequeno">
              Formulário de inscrição
            </BotaoLink>
            <BotaoLink href="/admin/edicoes/regulamento" icone="avaliacao" tamanho="pequeno">
              Regulamento
            </BotaoLink>
          </div>
        </header>
        <p className="text-sm text-suave">
          O que você muda aqui vale só para a Edição {edicao.numero}. Para mexer em outra, use “Administrar esta edição” no cartão dela ou o menu de edições do topo.
        </p>

        <section className="card space-y-3">
          <h3 className="text-lg font-semibold">Dados da edição</h3>
          <FormDadosEdicao key={edicao.id} edicao={edicao} />
        </section>

        {instituicoes && (
          <section id="acesso" className="card scroll-mt-24 space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Acesso e marca</h3>
              <p className="text-sm text-suave">Evento fechado de uma instituição, de várias instituições ou aberto a todos, e a logo que aparece no topo.</p>
            </div>
            <FormAcessoEdicao key={edicao.id} edicao={edicao} instituicoes={instituicoes} escolhidas={daEdicao.map((i) => i.id)} />
          </section>
        )}
      </section>
    </Pagina>
  );
}
