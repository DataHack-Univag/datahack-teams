import Link from "next/link";
import { Area } from "@/app/_shell/Area";
import { comandosDasAbas, navAluno } from "@/app/_shell/menus";
import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { configuracaoDa } from "@/modules/equipes/domain/tipos";
import { equipeDoAluno, listarResumo, ultimaRecusa } from "@/modules/equipes/infra/repositorio";
import { chamadoAtivoDaEquipe } from "@/modules/chamados/infra/repositorio";
import { meuCodigo } from "@/modules/checkin/infra/repositorio";
import { MeuQr } from "@/modules/checkin/ui/MeuQr";
import { AjudaDaEquipe } from "@/modules/chamados/ui/AjudaDaEquipe";
import { locaisDaEdicao } from "@/modules/mapa/infra/repositorio";
import { PainelEquipe } from "@/modules/equipes/ui/PainelEquipe";
import { ConviteRecebido, MinhaProposta, ProporEquipe, PropostaRecusada } from "@/modules/equipes/ui/Propostas";
import { listarMateriais } from "@/modules/materiais/infra/repositorio";
import { ListaMateriais } from "@/modules/materiais/ui/Materiais";
import type { Inscrito } from "@/modules/pessoas/domain/tipos";
import { listarSemEquipe } from "@/modules/pessoas/infra/repositorio";
import { separarTrocas } from "@/modules/trocas/domain/tipos";
import { trocasDoAluno } from "@/modules/trocas/infra/repositorio";
import { PedidosRecebidos, PedirTroca } from "@/modules/trocas/ui/Trocas";
import type { Cliente } from "@/shared/db/servidor";
import { primeiroNome } from "@/shared/lib/texto";
import { BoasVindas } from "@/shared/ui/Ajuda";
import { AutoAtualizar } from "@/shared/ui/AutoAtualizar";
import { BotaoLink } from "@/shared/ui/Botao";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

export type AbaAluno = "equipe" | "trocas" | "materiais";
export const abaDoAluno = (v: unknown): AbaAluno => (v === "trocas" || v === "materiais" ? v : "equipe");

/**
 * Tela do aluno na edição: Minha equipe · Trocas (se a edição permitir) · Materiais.
 * No "ver como" da organização é a mesma tela, com os mesmos botões; quem age é o
 * organizador (o banco registra assim).
 */
export async function TelaAluno({
  cliente,
  aluno,
  avatar,
  aba: abaPedida,
  edicao,
  simulacao = false,
}: {
  cliente: Cliente;
  aluno: Inscrito;
  avatar: string | null;
  aba: AbaAluno;
  edicao: Edicao;
  simulacao?: boolean;
}) {
  const config = configuracaoDa(edicao, { paraParticipante: true });
  const porProposta = edicao.modo_formacao === "alunos_propoem";
  // Tudo em paralelo: uma única "rodada" até o banco.
  const [materiais, equipe, equipes, trocas, colegasLivres, recusa, locais] = await Promise.all([
    listarMateriais(cliente, edicao.id),
    equipeDoAluno(cliente, aluno.email, edicao.id),
    listarResumo(cliente, edicao.id),
    edicao.permite_trocas ? trocasDoAluno(cliente, aluno.email, edicao.id) : Promise.resolve([]),
    porProposta ? listarSemEquipe(cliente, edicao.id) : Promise.resolve([]),
    porProposta ? ultimaRecusa(cliente, aluno.email, edicao.id) : Promise.resolve(null),
    locaisDaEdicao(cliente, edicao.id),
  ]);
  // Pedido de ajuda: só para equipe aprovada da edição atual (é onde a mentoria atende).
  const chamado = equipe?.situacao === "aprovada" && edicao.atual ? await chamadoAtivoDaEquipe(cliente, equipe.id) : null;
  // QR de entrada: só na edição atual ainda não encerrada, e nunca no "ver como" (seria o código de quem simula).
  const codigo = edicao.atual && edicao.situacao !== "encerrada" && !simulacao ? await meuCodigo(cliente, edicao.id) : null;

  const meuVinculo = equipe?.membros.find((m) => m.email === aluno.email);
  const convidado = meuVinculo?.situacao === "convidado";
  const aprovada = equipe?.situacao === "aprovada" && !convidado;
  const troca = aprovada && equipe && edicao.permite_trocas ? separarTrocas(trocas, aluno.email, equipe.id) : null;
  const souLider = !!equipe && equipe.lider_email === aluno.email;

  const itens = navAluno("/", { trocas: troca?.recebidos.length }).filter((i) => i.aba !== "trocas" || edicao.permite_trocas);
  const aba: AbaAluno = abaPedida === "trocas" && !edicao.permite_trocas ? "equipe" : abaPedida;
  const destaques = materiais.filter((m) => m.destaque);
  const podeFormar = porProposta && !config.edicao_bloqueada;

  return (
    <Area nome={aluno.nome} papel={aluno.papel} avatar={avatar} itens={itens} comandos={comandosDasAbas(itens)}>
      {/* Convites, trocas e decisões da organização chegam sem recarregar. */}
      <AutoAtualizar segundos={30} />
      <Pagina estreita>
        {aba === "equipe" && (
          <>
            {!simulacao && (
              <BoasVindas id={`aluno-${edicao.slug}`} titulo={`Bem-vindo à ${edicao.nome}, ${primeiroNome(aluno.nome)}!`}>
                Aqui fica a sua equipe: colegas, repositório e links de entrega.
                {edicao.permite_trocas && (
                  <>
                    {" "}
                    Em <strong>Trocas</strong> você pede para mudar de equipe.
                  </>
                )}{" "}
                Em <strong>Materiais</strong> estão os desafios e as bases de dados.
              </BoasVindas>
            )}
            {codigo && <MeuQr codigo={codigo} edicao={edicao.nome} />}
            {troca && troca.recebidos.length > 0 && (
              <PedidosRecebidos recebidos={troca.recebidos} equipes={equipes} meuEmail={aluno.email} souLider={souLider} />
            )}
            {destaques.length > 0 && (
              <section className="card space-y-3">
                <h2 className="text-lg font-semibold">Em destaque</h2>
                <ListaMateriais materiais={destaques} />
              </section>
            )}

            {equipe && convidado ? (
              <ConviteRecebido equipe={equipe} meuEmail={aluno.email} />
            ) : equipe && !aprovada ? (
              <MinhaProposta equipe={equipe} meuEmail={aluno.email} colegas={colegasLivres} config={config} />
            ) : equipe ? (
              <>
                {!config.edicao_bloqueada && <AjudaDaEquipe chamado={chamado} como={aluno.email} local={locais[equipe.id]} />}
                <PainelEquipe equipe={equipe} config={config} meuEmail={aluno.email} organizador={false} local={locais[equipe.id]} />
              </>
            ) : podeFormar ? (
              <>
                {recusa && <PropostaRecusada nome={recusa.nome} motivo={recusa.motivo} />}
                <ProporEquipe colegas={colegasLivres} config={config} meuEmail={aluno.email} />
              </>
            ) : (
              <EstadoVazio
                icone="equipe"
                titulo={`Olá, ${primeiroNome(aluno.nome)}! Você ainda não está numa equipe`}
                acao={
                  <BotaoLink href="https://github.com/signup" externo icone="github">
                    Criar conta no GitHub
                  </BotaoLink>
                }
              >
                {porProposta
                  ? "A formação de equipes está fechada no momento. Fale com a organização."
                  : "As equipes são formadas pela organização; assim que a sua for montada, ela aparece aqui com os colegas."}{" "}
                Enquanto isso, crie uma conta no GitHub: a equipe vai precisar de um repositório <strong>público</strong>.
              </EstadoVazio>
            )}
          </>
        )}

        {aba === "trocas" && (
          <>
            <CabecalhoPagina titulo="Trocas de equipe" destaque="Trocas" descricao="Peça para mudar de equipe ou responda a quem quer entrar na sua." />
            {equipe && troca ? (
              <>
                <PedidosRecebidos recebidos={troca.recebidos} equipes={equipes} meuEmail={aluno.email} souLider={souLider} />
                <PedirTroca
                  equipeAtual={equipe.id}
                  equipes={equipes}
                  meuPedido={troca.meuPedido}
                  meuUltimo={troca.meuUltimo}
                  meuEmail={aluno.email}
                  souLider={souLider}
                  bloqueada={config.edicao_bloqueada}
                />
              </>
            ) : (
              <EstadoVazio icone="trocas" titulo="Você ainda não tem equipe">
                Trocas só ficam disponíveis depois que a sua equipe estiver aprovada.
              </EstadoVazio>
            )}
          </>
        )}

        {aba === "materiais" && (
          <>
            <CabecalhoPagina titulo="Materiais do evento" destaque="Materiais" descricao="Desafios, documentação e dados publicados pela organização." />
            <ListaMateriais materiais={materiais} />
            <p className="text-center text-xs text-suave">
              Dúvidas sobre o sistema?{" "}
              <Link href="/ajuda" className="text-marca underline">
                Veja a ajuda
              </Link>
              .
            </p>
          </>
        )}
      </Pagina>
    </Area>
  );
}
