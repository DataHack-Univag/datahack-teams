import { removerMaterial } from "@/app/actions";
import { FormMaterial } from "@/components/FormMaterial";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { ListaMateriais } from "@/components/ListaMateriais";
import { Pagina } from "@/components/Pagina";
import { carregarMateriais, sessaoAtual } from "@/lib/dados";

// Aba "Materiais": tudo que a organização publica aqui aparece para todos os alunos.
export default async function AdminMateriais() {
  const { supabase } = await sessaoAtual();
  const materiais = await carregarMateriais(supabase);

  return (
    <Pagina>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Materiais do evento</h1>
        <p className="text-sm text-suave">
          Desafios, documentação, fontes e dicionários de dados. Tudo publicado aqui aparece na tela inicial de todos os
          alunos.
        </p>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Publicar material</h2>
        <FormMaterial />
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Publicados ({materiais.length})</h2>
        <ListaMateriais
          materiais={materiais}
          acoes={(m) => (
            <div className="space-y-2 border-t border-borda pt-2">
              <details>
                <summary className="cursor-pointer text-sm text-marca select-none">Editar</summary>
                <div className="mt-3">
                  <FormMaterial m={m} />
                </div>
              </details>
              <Formulario action={removerMaterial} confirmar={`Remover "${m.titulo}"?`} rotuloConfirmar="Remover">
                <input type="hidden" name="id" value={m.id} />
                <BotaoEnviar className="btn-perigo min-h-9 px-3 text-xs">Remover</BotaoEnviar>
              </Formulario>
            </div>
          )}
        />
      </section>
    </Pagina>
  );
}
