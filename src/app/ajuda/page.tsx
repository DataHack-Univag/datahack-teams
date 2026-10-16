import { Area } from "@/app/_shell/Area";
import { comandosDasAbas, comandosExtrasOrganizacao, navAluno, navBancas, navMentoria, navOrganizacao } from "@/app/_shell/menus";
import { BuscaAjuda } from "@/app/ajuda/BuscaAjuda";
import { TOPICOS, type Publico } from "@/app/ajuda/conteudo";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Ajuda: perguntas frequentes de quem está logado (aluno, banca, mentoria ou organização), com busca.
export default async function Ajuda() {
  const { usuario, avatar, organizador, avaliador, mentor, edicao } = await sessaoAtual();
  const publico: Publico = organizador ? "organizacao" : avaliador ? "banca" : mentor ? "mentoria" : "participante";
  const nav = organizador ? navOrganizacao() : { itens: avaliador ? navBancas() : mentor ? navMentoria() : navAluno("/", {}, true, edicao.permite_trocas), mais: undefined };
  const todas = [...nav.itens, ...(nav.mais ?? [])];

  return (
    <Area
      nome={usuario.nome}
      papel={usuario.papel}
      avatar={avatar}
      itens={nav.itens}
      mais={nav.mais}
      comandos={[...comandosDasAbas(todas), ...(organizador ? comandosExtrasOrganizacao : [])]}
    >
      <Pagina estreita>
        <CabecalhoPagina
          titulo="Como podemos ajudar?"
          destaque="ajudar"
          descricao={organizador ? "A ajuda de todos os perfis (participantes, bancas, mentoria e organização), por módulo." : "Respostas rápidas sobre o sistema do DATAHack, por módulo. Não achou? Fale com a organização no evento."}
        />
        {/* A organização vê a ajuda de todos os perfis, para orientar quem perguntar. */}
        <BuscaAjuda
          topicos={TOPICOS.filter((t) => (organizador || t.publicos.includes(publico)) && (t.so !== "trocas" || edicao.permite_trocas || organizador))}
          mostrarPublicos={organizador}
        />
      </Pagina>
    </Area>
  );
}
