import { Area } from "@/app/_shell/Area";
import { comandosDasAbas, comandosExtrasOrganizacao, navAluno, navBancas, navOrganizacao } from "@/app/_shell/menus";
import { BuscaAjuda } from "@/app/ajuda/BuscaAjuda";
import { TOPICOS, type Publico } from "@/app/ajuda/conteudo";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Ajuda: perguntas frequentes de quem está logado (aluno, banca ou organização), com busca.
export default async function Ajuda() {
  const { usuario, avatar, organizador, avaliador } = await sessaoAtual();
  const publico: Publico = organizador ? "organizacao" : avaliador ? "banca" : "aluno";
  const nav = organizador ? navOrganizacao() : { itens: avaliador ? navBancas() : navAluno("/"), mais: undefined };
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
          descricao="Respostas rápidas sobre o sistema do DATAHack. Não achou? Fale com a organização no evento."
        />
        <BuscaAjuda topicos={TOPICOS.filter((t) => t.publicos.includes(publico))} />
      </Pagina>
    </Area>
  );
}
