import { criarEdicao, deixarSemAtual, escolherEdicao, salvarDadosEdicao, tornarAtual } from "@/modules/edicoes/application/actions";
import { tomSituacaoEdicao } from "@/modules/edicoes/domain/tipos";
import { MODOS_FORMACAO, periodo, rotuloModo, rotuloSituacaoEdicao, type Edicao } from "@/modules/edicoes/domain/tipos";
import { ACESSOS, COR_PADRAO, resolverMarca, rotuloAcesso } from "@/modules/instituicoes/domain/tipos";
import { LogoEdicao } from "@/modules/instituicoes/ui/LogoEdicao";
import { AreaTexto, Campo, CaixaMarcar, Selecao } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

/** Cartão de uma edição: datas, formato, números e ações. */
export function CartaoEdicao({
  edicao,
  numeros,
  vendo,
}: {
  edicao: Edicao;
  numeros?: { alunos: number; equipes: number; fichas: number };
  /** É a edição que a organização está vendo agora. */
  vendo: boolean;
}) {
  const marca = resolverMarca(edicao);
  return (
    <article
      className={`card min-w-0 space-y-3 border-t-4 ${edicao.atual ? "destaque-grad" : ""}`}
      style={{ borderTopColor: marca.cor ?? COR_PADRAO }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <LogoEdicao marca={marca} className="h-10 w-28" />
        <div className="flex flex-wrap justify-end gap-1.5">
          {edicao.atual && <Selo tom="sucesso">Atual</Selo>}
          {vendo && <Selo tom="marca">Você está vendo</Selo>}
          <Selo tom={tomSituacaoEdicao(edicao.situacao)}>{rotuloSituacaoEdicao(edicao.situacao)}</Selo>
        </div>
      </div>
      {edicao.situacao === "cancelada" && edicao.motivo_cancelamento && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-2 text-xs">
          <strong>Motivo do cancelamento:</strong> {edicao.motivo_cancelamento}
        </p>
      )}
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Edição {edicao.numero}</p>
        <h2 className="text-lg font-bold break-words">{edicao.nome}</h2>
        <p className="text-xs text-suave">
          {periodo(edicao)}
          {edicao.local ? ` · ${edicao.local}` : ""}
        </p>
      </div>
      {edicao.descricao && <p className="text-sm text-suave">{edicao.descricao}</p>}
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["alunos", numeros?.alunos ?? 0],
          ["equipes", numeros?.equipes ?? 0],
          ["fichas", numeros?.fichas ?? 0],
        ].map(([rotulo, n]) => (
          <div key={rotulo} className="rounded-xl border border-borda bg-marca-fundo/40 p-2">
            <dt className="text-[11px] text-suave">{rotulo}</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-suave">
        Equipes: {rotuloModo(edicao.modo_formacao).toLowerCase()} · {edicao.min_membros} a {edicao.max_membros} integrantes ·{" "}
        {edicao.permite_trocas ? "com trocas" : "sem trocas"}
        {edicao.acesso ? ` · ${rotuloAcesso(edicao.acesso).toLowerCase()}` : ""}
      </p>
      {vendo && (
        <a href="#configuracoes" className="btn-secundario min-h-9 px-3 text-xs">
          <Icone nome="avancar" className="size-4 rotate-90" /> Ver configurações desta edição
        </a>
      )}
      {!vendo && (
        // Trocar de edição também por aqui: no celular o seletor do cabeçalho fica escondido (heurística 7).
        <form action={escolherEdicao}>
          <Ocultos valores={{ edicao: edicao.id, voltar: "/admin" }} />
          <BotaoEnviar variante="secundario" tamanho="pequeno" icone="olho">
            Administrar esta edição
          </BotaoEnviar>
        </form>
      )}
      {edicao.atual && (
        <Formulario
          action={deixarSemAtual}
          tituloConfirmar="Deixar o sistema sem edição atual?"
          confirmar="Útil entre uma edição e outra. A tela de entrada passa a mostrar a última edição encerrada, nenhuma inscrição pelo site fica aberta e cada pessoa continua vendo as edições de que participou. Depois, é só tornar outra edição a atual."
          rotuloConfirmar="Deixar sem edição atual"
          perigo={false}
        >
          <Ocultos valores={{ id: edicao.id }} />
          <BotaoEnviar variante="fantasma" tamanho="pequeno" icone="desfazer">
            Deixar de ser a atual
          </BotaoEnviar>
        </Formulario>
      )}
      {!edicao.atual && edicao.situacao !== "cancelada" && (
        <Formulario
          action={tornarAtual}
          tituloConfirmar={`Tornar a ${edicao.nome} a edição atual?`}
          confirmar="Participantes e bancas passam a ver esta edição ao entrar, e ela fica “em andamento”. A edição atual de hoje continua guardada e consultável pela organização."
          rotuloConfirmar="Tornar atual"
          perigo={false}
        >
          <Ocultos valores={{ id: edicao.id }} />
          <BotaoEnviar variante="secundario" tamanho="pequeno" icone="estrela">
            Tornar a edição atual
          </BotaoEnviar>
        </Formulario>
      )}
    </article>
  );
}

/** Dados gerais da edição que a organização está vendo. */
export function FormDadosEdicao({ edicao }: { edicao: Edicao }) {
  return (
    <Formulario action={salvarDadosEdicao} className="grid gap-3 sm:grid-cols-2">
      <Ocultos valores={{ id: edicao.id }} />
      <Campo rotulo="Nome da edição" name="nome" required maxLength={120} defaultValue={edicao.nome} className="sm:col-span-2" />
      <Campo rotulo="Início" name="data_inicio" type="date" defaultValue={edicao.data_inicio ?? ""} />
      <Campo rotulo="Fim" name="data_fim" type="date" defaultValue={edicao.data_fim ?? ""} dica="Igual ao início se for um dia só." />
      <Campo rotulo="Local" name="local" maxLength={200} defaultValue={edicao.local ?? ""} />
      <AreaTexto rotulo="Descrição" name="descricao" rows={2} maxLength={4000} defaultValue={edicao.descricao ?? ""} className="sm:col-span-2" />
      <AreaTexto
        rotulo="Formato do evento"
        name="formato"
        rows={4}
        maxLength={8000}
        defaultValue={edicao.formato ?? ""}
        className="sm:col-span-2"
        dica="Como o evento funciona: cronograma, fases, como as equipes se formam. Fica registrado para as próximas edições."
      />
      <div className="sm:col-span-2">
        <BotaoEnviar icone="ok">Salvar dados da edição</BotaoEnviar>
      </div>
    </Formulario>
  );
}

/** Criar uma edição nova, copiando o regulamento e a organização de uma existente. */
export function FormNovaEdicao({ edicoes, base }: { edicoes: Edicao[]; base: Edicao }) {
  const ano = new Date().getFullYear() + 1;
  return (
    <Formulario action={criarEdicao} className="grid gap-3 sm:grid-cols-2">
      <Campo rotulo="Nome" name="nome" required maxLength={120} placeholder={`DATAHack Univag ${ano}`} className="sm:col-span-2" />
      <Campo
        rotulo="Endereço curto"
        name="slug"
        required
        pattern="[a-z0-9-]{3,60}"
        placeholder={`datahack-${ano}`}
        dica="Só letras minúsculas, números e hífen. Identifica a edição nos arquivos exportados."
      />
      <Campo rotulo="Local" name="local" maxLength={200} defaultValue={base.local ?? ""} />
      <Campo rotulo="Início" name="data_inicio" type="date" />
      <Campo rotulo="Fim" name="data_fim" type="date" />
      <Selecao
        rotulo="Quem pode participar"
        name="acesso"
        defaultValue={base.acesso ?? "lista"}
        className="sm:col-span-2"
        opcoes={ACESSOS.map((a) => ({ valor: a.valor, rotulo: `${a.rotulo} — ${a.descricao}` }))}
      />
      <Selecao
        rotulo="Como as equipes são formadas"
        name="modo_formacao"
        defaultValue="alunos_propoem"
        className="sm:col-span-2"
        opcoes={MODOS_FORMACAO.map((m) => ({ valor: m.valor, rotulo: `${m.rotulo} — ${m.descricao}` }))}
      />
      <Campo rotulo="Mínimo de integrantes" name="min_membros" type="number" min={1} max={20} required defaultValue={base.min_membros} />
      <Campo rotulo="Máximo de integrantes" name="max_membros" type="number" min={1} max={20} required defaultValue={base.max_membros} />
      <CaixaMarcar name="permite_trocas" rotulo="Participantes podem pedir troca de equipe" className="sm:col-span-2" />
      <Selecao
        rotulo="Copiar regulamento e organização de"
        name="copiar_de"
        defaultValue={base.id}
        className="sm:col-span-2"
        opcoes={[
          ...edicoes.map((e) => ({ valor: e.id, rotulo: `Edição ${e.numero} · ${e.nome}` })),
          { valor: "", rotulo: "Não copiar (começar sem regulamento e só com você na organização)" },
        ]}
      />
      <p className="text-xs text-suave sm:col-span-2">
        Copiar traz fases, rubricas, critérios, níveis, penalidades, desempate, os organizadores, as instituições e a logo. Participantes e bancas são cadastrados
        de novo em Pessoas (com a edição nova escolhida no topo). A edição nova nasce como <strong>planejada</strong> e não muda a
        edição atual até você escolher “Tornar a edição atual”.
      </p>
      <div className="sm:col-span-2">
        <BotaoEnviar icone="mais_novo">Criar edição</BotaoEnviar>
      </div>
    </Formulario>
  );
}
