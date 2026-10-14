import { carregarMapa } from "@/modules/mapa/infra/repositorio";
import { FormImportarMapa, FormNovaSala, FormNovoPiso, ListaSalas } from "@/modules/mapa/ui/PainelMapa";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { BotaoLink } from "@/shared/ui/Botao";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Mapa do evento: pisos > salas > bancadas. Cada sala é desenhada em escala (cm).
export default async function AdminMapa() {
  const { cliente, edicao } = await sessaoAtual();
  const mapa = await carregarMapa(cliente, edicao.id);
  const salas = mapa.pisos.reduce((t, p) => t + p.salas.length, 0);
  const lugares = mapa.elementos.reduce((t, e) => t + (e.lugares ?? 0), 0);

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Mapa" }]}
        titulo="Mapa do evento"
        destaque="Mapa"
        descricao={`Salas e bancadas da ${edicao.nome}, em escala. ${salas} sala(s) · ${lugares} lugar(es) para equipes.`}
        acoes={
          <>
            <BotaoAjuda titulo="Mapa do evento">
              <ul>
                <li>Crie cada sala com as medidas aproximadas e abra para desenhar: escolha um modelo pronto (bancada de laboratório, mesa, porta…) e arraste.</li>
                <li>A bancada de laboratório já vem com lugar para 2 equipes; o número de lugares se ajusta em cada uma.</li>
                <li>Tem um desenho no papel? Use “Importar um desenho” e peça para uma IA converter, ou ponha a foto como fundo da sala e desenhe por cima.</li>
                <li>O croqui (para a universidade) sai pronto em “Croqui”: imprima ou salve em PDF.</li>
              </ul>
            </BotaoAjuda>
            {salas > 0 && (
              <>
                <BotaoLink href="/admin/mapa/exportar" variante="secundario" icone="baixar">
                  Baixar JSON
                </BotaoLink>
                <BotaoLink href="/admin/mapa/croqui" variante="secundario" icone="mapa">
                  Croqui
                </BotaoLink>
                <BotaoLink href="/admin/mapa/equipes" icone="equipe">
                  Distribuir equipes
                </BotaoLink>
              </>
            )}
          </>
        }
      />

      <ListaSalas mapa={mapa} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">Nova sala</h2>
          <FormNovaSala pisos={mapa.pisos} />
          <details className="border-t border-borda pt-3">
            <summary className="cursor-pointer text-sm font-semibold text-marca select-none">Mais de um piso ou bloco?</summary>
            <div className="mt-3">
              <FormNovoPiso />
            </div>
          </details>
        </section>
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">Importar um desenho</h2>
          <FormImportarMapa />
        </section>
      </div>
    </Pagina>
  );
}
