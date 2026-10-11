import Link from "next/link";
import { Area } from "@/app/_shell/Area";
import { comandosDasAbas, navAluno } from "@/app/_shell/menus";
import { equipeDoAluno, lerConfiguracao, listarResumo } from "@/modules/equipes/infra/repositorio";
import { PainelEquipe } from "@/modules/equipes/ui/PainelEquipe";
import { listarMateriais } from "@/modules/materiais/infra/repositorio";
import { ListaMateriais } from "@/modules/materiais/ui/Materiais";
import type { Inscrito } from "@/modules/pessoas/domain/tipos";
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
 * Tela do aluno com as três abas (Minha equipe · Trocas · Materiais).
 * No "ver como" da organização é a mesma tela, com os mesmos botões; quem age é o
 * organizador (o banco registra assim).
 */
export async function TelaAluno({
  cliente,
  aluno,
  avatar,
  aba,
  simulacao = false,
}: {
  cliente: Cliente;
  aluno: Inscrito;
  avatar: string | null;
  aba: AbaAluno;
  simulacao?: boolean;
}) {
  // Tudo em paralelo: uma única "rodada" até o banco.
  const [config, materiais, equipe, equipes, trocas] = await Promise.all([
    lerConfiguracao(cliente),
    listarMateriais(cliente),
    equipeDoAluno(cliente, aluno.email),
    listarResumo(cliente),
    trocasDoAluno(cliente, aluno.email),
  ]);
  const troca = equipe ? separarTrocas(trocas, aluno.email, equipe.id) : null;
  const souLider = !!equipe && equipe.lider_email === aluno.email;

  const itens = navAluno("/", { trocas: troca?.recebidos.length });
  const destaques = materiais.filter((m) => m.destaque);

  return (
    <Area
      nome={aluno.nome}
      papel={aluno.papel}
      avatar={avatar}
      itens={itens}
      comandos={comandosDasAbas(itens)}
    >
      {/* Pedidos de troca e mudanças da organização chegam sem recarregar. */}
      <AutoAtualizar segundos={30} />
      <Pagina estreita>
        {aba === "equipe" && (
          <>
            {!simulacao && (
              <BoasVindas id="aluno-v1" titulo={`Bem-vindo, ${primeiroNome(aluno.nome)}!`}>
                Aqui fica a sua equipe: colegas, repositório e links de entrega. Em <strong>Trocas</strong> você pede para
                mudar de equipe e em <strong>Materiais</strong> estão os desafios e as bases de dados.
              </BoasVindas>
            )}
            {troca && troca.recebidos.length > 0 && (
              <PedidosRecebidos recebidos={troca.recebidos} equipes={equipes} meuEmail={aluno.email} souLider={souLider} />
            )}
            {destaques.length > 0 && (
              <section className="card space-y-3">
                <h2 className="text-lg font-semibold">Em destaque</h2>
                <ListaMateriais materiais={destaques} />
              </section>
            )}
            {equipe ? (
              <PainelEquipe equipe={equipe} config={config} meuEmail={aluno.email} organizador={false} />
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
                As equipes são formadas pela organização; assim que a sua for montada, ela aparece aqui com os colegas.
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
                Trocas só ficam disponíveis depois que a organização montar as equipes.
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
