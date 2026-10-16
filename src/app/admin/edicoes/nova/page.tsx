import { FormNovaEdicao } from "@/modules/edicoes/ui/Edicoes";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Criar uma edição nova: tela própria, para ficar claro que não é a edição que está sendo vista.
export default async function NovaEdicao() {
  const { edicao, edicoesOrganizadas } = await sessaoAtual();
  return (
    <Pagina estreita>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Edições", href: "/admin/edicoes" }, { rotulo: "Nova edição" }]}
        titulo="Nova edição"
        destaque="Nova"
        descricao={`Você está criando uma edição nova do zero. Nada muda nas edições que já existem (a Edição ${edicao.numero} continua como está).`}
        acoes={
          <BotaoLink href="/admin/edicoes" icone="voltar">
            Voltar sem criar
          </BotaoLink>
        }
      />
      <section className="card space-y-3">
        <FormNovaEdicao edicoes={edicoesOrganizadas} base={edicao} />
      </section>
    </Pagina>
  );
}
