import Link from "next/link";
import {
  analisarEquipe,
  cancelarProposta,
  convidarIntegrante,
  proporEquipe,
  responderConvite,
} from "@/modules/equipes/application/actions";
import { nomeMembro, situacaoEquipe, type Configuracao, type Equipe } from "@/modules/equipes/domain/tipos";
import { cursoSemestre, type Inscrito } from "@/modules/pessoas/domain/tipos";
import { dataHora } from "@/shared/lib/formatar";
import { Aviso } from "@/shared/ui/Aviso";
import { Avatar } from "@/shared/ui/Avatar";
import { AreaTexto, Campo } from "@/shared/ui/Campo";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { EscolherPessoas, type OpcaoPessoa } from "@/shared/ui/EscolherPessoas";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Selo } from "@/shared/ui/Selo";

// Fluxo "alunos propõem a equipe": quem propõe convida os colegas, cada um confirma e,
// com todos confirmados (e o mínimo de integrantes), a organização aprova ou recusa.

/** Colegas livres (sem equipe e sem convite aguardando) no formato do seletor. */
const paraOpcoes = (colegas: Inscrito[]): OpcaoPessoa[] =>
  colegas.map((i) => ({ email: i.email, nome: i.nome, detalhe: cursoSemestre(i) }));

const SEM_COLEGAS = "Todos os participantes desta edição já estão numa equipe ou têm convite aguardando.";

/** Integrantes de uma proposta com a situação de cada um. */
function MembrosDaProposta({ equipe, meuEmail }: { equipe: Equipe; meuEmail?: string }) {
  return (
    <ul className="divide-y divide-borda">
      {equipe.membros.map((m) => (
        <li key={m.email} className="flex items-center gap-3 py-2">
          <Avatar nome={nomeMembro(m)} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span className="truncate">{nomeMembro(m)}</span>
              {m.email === meuEmail && <span className="text-xs text-suave">(você)</span>}
              {m.email === equipe.proposta_por && <Selo tom="marca">propôs</Selo>}
            </p>
            <p className="truncate text-xs text-suave">{cursoSemestre(m.inscritos)}</p>
          </div>
          {m.situacao === "confirmado" ? <Selo tom="sucesso">✔ confirmou</Selo> : <Selo tom="alerta">aguardando resposta</Selo>}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- aluno

/** Aluno sem equipe propõe uma equipe e convida os colegas. */
export function ProporEquipe({ colegas, config, meuEmail }: { colegas: Inscrito[]; config: Configuracao; meuEmail: string }) {
  const vagas = Math.max(0, config.max_membros - 1);
  const outros = colegas.filter((c) => c.email !== meuEmail);
  return (
    <section className="card destaque-grad faixa-topo space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Monte a sua equipe</h2>
        <p className="text-sm text-suave">
          Nesta edição, os próprios participantes formam as equipes: escolha um nome, convide de {Math.max(0, config.min_membros - 1)} a {vagas} colega(s) e
          envie. Cada colega confirma no sistema e, com todos confirmados, a organização aprova. Você começa como líder.
        </p>
      </div>
      <Formulario action={proporEquipe} className="space-y-3">
        <Ocultos valores={{ como: meuEmail }} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Nome da equipe" name="nome" required maxLength={60} placeholder="Ex.: Os Evadidos" />
          <Campo rotulo="Repositório GitHub (pode cadastrar depois)" name="repo_github" inputMode="url" placeholder="https://github.com/usuario/repositorio" />
        </div>
        <EscolherPessoas
          name="colegas"
          rotulo="Colegas convidados"
          opcoes={paraOpcoes(outros)}
          maximo={vagas}
          vazio={SEM_COLEGAS}
          dica="Só aparecem participantes que ainda não estão numa equipe nem foram convidados por outra."
        />
        <BotaoEnviar icone="equipe">Propor equipe</BotaoEnviar>
      </Formulario>
    </section>
  );
}

/** Convite recebido: o aluno confirma (entra na equipe) ou recusa. */
export function ConviteRecebido({ equipe, meuEmail }: { equipe: Equipe; meuEmail: string }) {
  const quem = equipe.membros.find((m) => m.email === equipe.proposta_por);
  return (
    <section className="card destaque-grad faixa-topo space-y-4" aria-label="Convite para equipe">
      <div>
        <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Convite</p>
        <h2 className="text-xl font-bold">
          {quem ? nomeMembro(quem) : "Um colega"} chamou você para a <span className="grad-text">{equipe.nome}</span>
        </h2>
        <p className="text-sm text-suave">Confirme para entrar na equipe. Enquanto não responder, você não pode entrar em outra.</p>
      </div>
      <MembrosDaProposta equipe={equipe} meuEmail={meuEmail} />
      <div className="flex flex-wrap gap-2">
        <Formulario action={responderConvite}>
          <Ocultos valores={{ equipe_id: equipe.id, aceitar: "1", como: meuEmail }} />
          <BotaoEnviar icone="ok">Confirmar, quero entrar</BotaoEnviar>
        </Formulario>
        <Formulario action={responderConvite} confirmar={`Recusar o convite da ${equipe.nome}?`} rotuloConfirmar="Recusar convite">
          <Ocultos valores={{ equipe_id: equipe.id, aceitar: "0", como: meuEmail }} />
          <BotaoEnviar variante="secundario">Recusar</BotaoEnviar>
        </Formulario>
      </div>
    </section>
  );
}

/** Proposta em andamento vista por quem está nela: quem falta, convidar mais e desistir. */
export function MinhaProposta({ equipe, meuEmail, colegas, config }: { equipe: Equipe; meuEmail: string; colegas: Inscrito[]; config: Configuracao }) {
  const s = situacaoEquipe(equipe.situacao);
  const souQuemPropos = equipe.proposta_por === meuEmail;
  const faltam = equipe.membros.filter((m) => m.situacao === "convidado").length;
  const confirmadosN = equipe.membros.length - faltam;
  const cabe = equipe.membros.length < config.max_membros;
  return (
    <section className="card faixa-topo space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Sua proposta de equipe</p>
          <h2 className="text-xl font-bold">{equipe.nome}</h2>
        </div>
        <Selo tom={s.tom}>{s.rotulo}</Selo>
      </div>
      {equipe.situacao === "aguardando_aprovacao" ? (
        <Aviso tom="info" titulo="Tudo certo do lado de vocês">
          Todos confirmaram. Agora é com a organização: assim que aprovar, a equipe aparece completa aqui.
        </Aviso>
      ) : (
        <Aviso tom="alerta" titulo="Ainda em formação">
          {faltam
            ? `Falta${faltam > 1 ? "m" : ""} ${faltam} colega(s) confirmar.`
            : `A equipe precisa de pelo menos ${config.min_membros} integrantes confirmados (tem ${confirmadosN}).`}{" "}
          Avise os colegas para entrarem no sistema e confirmarem.
        </Aviso>
      )}
      <MembrosDaProposta equipe={equipe} meuEmail={meuEmail} />

      {souQuemPropos && (
        <div className="space-y-3 border-t border-borda pt-3">
          {cabe && (
            <Formulario action={convidarIntegrante} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Ocultos valores={{ equipe_id: equipe.id, como: meuEmail }} />
              <EscolherPessoas
                name="email"
                rotulo="Convidar mais um colega"
                opcoes={paraOpcoes(colegas.filter((c) => c.email !== meuEmail))}
                maximo={1}
                vazio={SEM_COLEGAS}
                className="sm:flex-1"
              />
              <BotaoEnviar variante="secundario" icone="mais_novo" className="sm:mt-6">
                Convidar
              </BotaoEnviar>
            </Formulario>
          )}
          <Formulario
            action={cancelarProposta}
            tituloConfirmar="Desistir da proposta?"
            confirmar="A proposta é cancelada e todos (inclusive você) ficam livres para outras equipes. Fica registrada no histórico."
            rotuloConfirmar="Desistir"
            perigo
          >
            <Ocultos valores={{ equipe_id: equipe.id, como: meuEmail }} />
            <BotaoEnviar variante="perigo" tamanho="pequeno">
              Desistir da proposta
            </BotaoEnviar>
          </Formulario>
        </div>
      )}
    </section>
  );
}

/** Aviso de que a última proposta foi recusada pela organização (com o motivo). */
export function PropostaRecusada({ nome, motivo }: { nome: string; motivo: string | null }) {
  return (
    <Aviso tom="erro" titulo={`A organização recusou a equipe “${nome}”`}>
      {motivo ? `Motivo: ${motivo}. ` : ""}Você pode propor outra equipe abaixo.
    </Aviso>
  );
}

// ---------------------------------------------------------------- organização

/** Aprovar ou recusar uma proposta (na página da equipe e na lista de propostas). */
export function AnalisarProposta({ equipe }: { equipe: Equipe }) {
  const pendentes = equipe.membros.filter((m) => m.situacao === "convidado").length;
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-semibold">Análise da organização</h2>
      {pendentes > 0 && (
        <Aviso tom="alerta">
          {pendentes} convite(s) ainda sem resposta. Dá para recusar agora, mas aprovar só depois que todos responderem.
        </Aviso>
      )}
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
        {pendentes === 0 ? (
          <Formulario action={analisarEquipe}>
            <Ocultos valores={{ equipe_id: equipe.id, aprovar: "1" }} />
            <BotaoEnviar icone="ok">Aprovar equipe</BotaoEnviar>
          </Formulario>
        ) : (
          <span />
        )}
        <Formulario
          action={analisarEquipe}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          tituloConfirmar={`Recusar a ${equipe.nome}?`}
          confirmar="Os integrantes ficam livres para propor outra equipe e veem o motivo."
          rotuloConfirmar="Recusar equipe"
          perigo
        >
          <Ocultos valores={{ equipe_id: equipe.id, aprovar: "0" }} />
          <AreaTexto rotulo="Motivo (aparece para os participantes)" name="motivo" rows={1} maxLength={500} className="sm:flex-1" placeholder="Ex.: equipe acima do limite de veteranos" />
          <BotaoEnviar variante="perigo" className="sm:mb-5">
            Recusar
          </BotaoEnviar>
        </Formulario>
      </div>
    </section>
  );
}

/** Todas as propostas da edição, das que esperam aprovação para as em formação. */
export function ListaPropostas({ propostas }: { propostas: Equipe[] }) {
  if (!propostas.length)
    return (
      <EstadoVazio icone="equipe" titulo="Nenhuma proposta aguardando">
        Quando os participantes propuserem equipes, elas aparecem aqui para a organização aprovar.
      </EstadoVazio>
    );
  const ordem = (e: Equipe) => (e.situacao === "aguardando_aprovacao" ? 0 : 1);
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {[...propostas]
        .sort((a, b) => ordem(a) - ordem(b) || a.criado_em.localeCompare(b.criado_em))
        .map((e) => {
          const s = situacaoEquipe(e.situacao);
          return (
            <li key={e.id} className="card faixa-topo min-w-0 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">
                    <Link href={`/admin/equipes/${e.id}`} className="hover:text-marca hover:underline">
                      {e.nome}
                    </Link>
                  </h2>
                  <p className="text-xs text-suave">Proposta em {dataHora(e.criado_em)}</p>
                </div>
                <Selo tom={s.tom}>{s.rotulo}</Selo>
              </div>
              <MembrosDaProposta equipe={e} />
              {e.situacao === "aguardando_aprovacao" && <AnalisarProposta equipe={e} />}
            </li>
          );
        })}
    </ul>
  );
}
