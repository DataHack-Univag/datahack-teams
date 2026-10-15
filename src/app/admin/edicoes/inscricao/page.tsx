import { instituicoesDaEdicao, listarInstituicoes } from "@/modules/instituicoes/infra/repositorio";
import { rotuloAcesso } from "@/modules/instituicoes/domain/tipos";
import { camposDaEdicao, carregarCatalogo, contarInscricoes } from "@/modules/inscricoes/infra/repositorio";
import { EditorFormulario } from "@/modules/inscricoes/ui/EditorFormulario";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { Aviso } from "@/shared/ui/Aviso";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Formulário de inscrição da edição: quais perguntas, em que ordem, obrigatórias ou opcionais.
export default async function FormularioInscricao() {
  const { cliente, edicao } = await sessaoAtual();
  const acesso = edicao.acesso ?? "lista";
  const dados = await Promise.all([
    camposDaEdicao(cliente, edicao.id),
    carregarCatalogo(cliente),
    contarInscricoes(cliente, edicao.id),
    acesso === "instituicoes" ? instituicoesDaEdicao(cliente, edicao.id) : listarInstituicoes(cliente),
  ]).catch(() => null);

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Edições", href: "/admin/edicoes" }, { rotulo: "Formulário de inscrição" }]}
        titulo={`Formulário de inscrição · Edição ${edicao.numero}`}
        destaque="inscrição"
        descricao="Escolha o que perguntar a quem participa desta edição. Cada pergunta pode ser obrigatória ou opcional, e algumas só aparecem conforme a resposta anterior."
        acoes={
          <BotaoAjuda titulo="Formulário de inscrição">
            <ul>
              <li>As perguntas valem só para esta edição. Mudar aqui não muda as outras.</li>
              <li>Pergunta tirada fica arquivada, com as respostas de quem já tinha respondido.</li>
              <li>“Cargo” vem com “Está trabalhando?” e “Qual o seu cargo?” (quando a pessoa escolhe “Outro”).</li>
              <li>Respostas sensíveis (telefone, saúde, alimentação) só a organização vê.</li>
              <li>Em evento fechado (lista), curso e semestre continuam vindo do cadastro em Pessoas.</li>
            </ul>
          </BotaoAjuda>
        }
      />
      {!dados ? (
        <Aviso tom="alerta" titulo="Falta preparar o banco">
          O formulário de inscrição precisa da migração 018 (formulário de inscrição). Rode-a no SQL Editor do Supabase e recarregue a página.
        </Aviso>
      ) : (
        <>
          <p className="text-sm text-suave">
            Esta edição é <strong>{rotuloAcesso(acesso).toLowerCase()}</strong>.{" "}
            {acesso === "lista"
              ? "Quem participa é cadastrado pela organização; o formulário define o que se pergunta a cada um."
              : "A página pública de inscrição (próxima etapa) vai mostrar exatamente a prévia ao lado."}{" "}
            {dados[2] > 0 && `${dados[2]} inscrição(ões) até agora.`}
          </p>
          <EditorFormulario
            edicaoId={edicao.id}
            inicial={dados[0]}
            catalogo={dados[1]}
            inscricoes={dados[2]}
            instituicoes={dados[3].map((i) => ({ id: i.id, nome: i.sigla ? `${i.sigla} · ${i.nome}` : i.nome }))}
            aceitaOutra={acesso !== "instituicoes"}
          />
        </>
      )}
    </Pagina>
  );
}
