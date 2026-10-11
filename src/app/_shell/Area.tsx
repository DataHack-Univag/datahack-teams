import { Suspense, type ReactNode } from "react";
import { Cabecalho } from "@/app/_shell/Cabecalho";
import { FaixaSimulacao } from "@/app/_shell/FaixaSimulacao";
import { SeletorEdicao } from "@/app/_shell/SeletorEdicao";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { inicioDoPapel, type Papel } from "@/modules/pessoas/domain/papeis";
import { Navegacao, type ItemNav } from "@/shared/ui/Navegacao";
import { PaletaComandos, type Comando } from "@/shared/ui/PaletaComandos";
import { ToastDaUrl } from "@/shared/ui/Toast";

/**
 * Estrutura comum das áreas logadas (aluno, bancas, organização): cabeçalho, navegação
 * (abas no computador, barra embaixo no celular), busca rápida e avisos.
 */
export async function Area({
  nome,
  papel,
  avatar,
  itens,
  mais,
  comandos,
  children,
}: {
  nome: string;
  papel: Papel;
  avatar: string | null;
  itens: ItemNav[];
  mais?: ItemNav[];
  comandos: Comando[];
  children: ReactNode;
}) {
  // No "ver como", a faixa amarela lembra que é uma simulação e oferece a saída.
  const { simulacao, usuario, real, edicao, edicoesOrganizadas } = await sessaoAtual();
  const organiza = real.papel === "organizador";
  return (
    <>
      {simulacao && <FaixaSimulacao nome={usuario.nome} papel={usuario.papel} />}
      <Cabecalho
        nome={nome}
        papel={papel}
        avatar={avatar}
        inicio={inicioDoPapel(papel)}
        simulacao={simulacao}
        edicao={organiza && !simulacao ? <SeletorEdicao edicoes={edicoesOrganizadas} escolhida={edicao.id} /> : null}
      />
      {organiza && !edicao.atual && (
        <p role="status" className="border-b border-borda bg-marca-fundo px-4 py-1.5 text-center text-xs">
          Você está vendo a <strong>Edição {edicao.numero} · {edicao.nome}</strong>, que não é a edição atual dos alunos e das bancas.
        </p>
      )}
      <Suspense>
        <Navegacao itens={itens} mais={mais} />
      </Suspense>
      {/* pb: espaço para a barra de navegação fixa no celular */}
      <main id="conteudo" className="flex flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+4.5rem)] sm:pb-0">
        {children}
      </main>
      <PaletaComandos comandos={comandos} />
      <Suspense>
        <ToastDaUrl />
      </Suspense>
    </>
  );
}
