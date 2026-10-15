import { arquivarInstituicao, salvarInstituicao } from "@/modules/instituicoes/application/actions";
import { TIPOS_INSTITUICAO, type Instituicao } from "@/modules/instituicoes/domain/tipos";
import { CampoLogo } from "@/modules/instituicoes/ui/CampoLogo";
import { LogoSvg } from "@/modules/instituicoes/ui/LogoSvg";
import { Campo, Selecao } from "@/shared/ui/Campo";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

/** Cadastrar ou editar uma instituição (com `instituicao`, edita). */
export function FormInstituicao({ instituicao }: { instituicao?: Instituicao }) {
  const i = instituicao;
  return (
    <Formulario action={salvarInstituicao} className="grid gap-3 sm:grid-cols-2">
      {i && <Ocultos valores={{ id: i.id }} />}
      <Campo rotulo="Nome" name="nome" required maxLength={160} defaultValue={i?.nome} placeholder="Universidade Federal de Mato Grosso" className="sm:col-span-2" />
      <Campo rotulo="Sigla" name="sigla" maxLength={20} defaultValue={i?.sigla ?? ""} placeholder="UFMT" />
      <Selecao rotulo="Tipo" name="tipo" defaultValue={i?.tipo ?? "universidade"} opcoes={TIPOS_INSTITUICAO.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))} />
      <Campo rotulo="Cidade" name="cidade" maxLength={80} defaultValue={i?.cidade ?? ""} placeholder="Cuiabá" />
      <Campo rotulo="UF" name="uf" maxLength={2} defaultValue={i?.uf ?? ""} placeholder="MT" />
      <Campo rotulo="Site" name="site" maxLength={300} defaultValue={i?.site ?? ""} placeholder="https://…" inputMode="url" className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <CampoLogo inicial={i?.logo_svg} dica="Arquivo .svg de até 200 KB. Aparece no topo das telas das edições desta instituição." />
      </div>
      <div className="sm:col-span-2">
        <BotaoEnviar icone="ok">{i ? "Salvar instituição" : "Cadastrar instituição"}</BotaoEnviar>
      </div>
    </Formulario>
  );
}

/** Lista das instituições: logo, dados, edições em que participa, editar e retirar. */
export function ListaInstituicoes({ instituicoes, edicoesPorInstituicao }: { instituicoes: Instituicao[]; edicoesPorInstituicao: Map<string, number[]> }) {
  const ativas = instituicoes.filter((i) => !i.removido_em);
  const retiradas = instituicoes.filter((i) => i.removido_em);
  if (!ativas.length && !retiradas.length)
    return (
      <EstadoVazio icone="instituicao" titulo="Nenhuma instituição cadastrada">
        Cadastre a primeira instituição ao lado. Depois, escolha em cada edição quais instituições participam.
      </EstadoVazio>
    );

  return (
    <div className="space-y-4">
      <ul className="grid gap-3">
        {ativas.map((i) => {
          const edicoes = edicoesPorInstituicao.get(i.id) ?? [];
          return (
            <li key={i.id} className="card min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-12 w-24 shrink-0 place-items-center rounded-lg border border-borda bg-white p-1.5 dark:bg-white/90">
                  {i.logo_svg ? <LogoSvg svg={i.logo_svg} nome={i.sigla ?? i.nome} className="max-h-9 w-auto" /> : <Icone nome="instituicao" className="size-6 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold break-words">
                    {i.sigla ? `${i.sigla} · ` : ""}
                    {i.nome}
                  </h3>
                  <p className="text-xs text-suave">
                    {TIPOS_INSTITUICAO.find((t) => t.valor === i.tipo)?.rotulo}
                    {i.cidade ? ` · ${i.cidade}` : ""}
                    {i.uf ? `/${i.uf}` : ""}
                  </p>
                </div>
                {edicoes.length > 0 ? (
                  <Selo tom="marca" title="Edições em que participa">
                    Edição {edicoes.join(", ")}
                  </Selo>
                ) : (
                  <Selo tom="neutro">Em nenhuma edição</Selo>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-2 border-t border-borda pt-3">
                <details className="min-w-0 flex-1">
                  <summary className="btn-secundario inline-flex min-h-9 cursor-pointer px-3 text-xs">
                    <Icone nome="editar" className="size-4" /> Editar
                  </summary>
                  <div className="mt-3">
                    <FormInstituicao instituicao={i} />
                  </div>
                </details>
                <Formulario
                  action={arquivarInstituicao}
                  acaoDesfazer={arquivarInstituicao}
                  confirmar={
                    edicoes.length
                      ? `Ela sai da lista para edições novas. As edições ${edicoes.join(", ")} continuam com ela.`
                      : "Ela sai da lista. Dá para trazer de volta depois."
                  }
                  tituloConfirmar={`Retirar ${i.sigla ?? i.nome} da lista?`}
                  rotuloConfirmar="Retirar"
                >
                  <Ocultos valores={{ id: i.id }} />
                  <BotaoEnviar variante="secundario" tamanho="pequeno" icone="lixo">
                    Retirar
                  </BotaoEnviar>
                </Formulario>
              </div>
            </li>
          );
        })}
      </ul>

      {retiradas.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold">Retiradas da lista ({retiradas.length})</summary>
          <ul className="mt-3 space-y-2">
            {retiradas.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-suave">
                  {i.sigla ? `${i.sigla} · ` : ""}
                  {i.nome}
                </span>
                <Formulario action={arquivarInstituicao}>
                  <Ocultos valores={{ id: i.id, voltar: "1" }} />
                  <BotaoEnviar variante="secundario" tamanho="pequeno" icone="desfazer">
                    Trazer de volta
                  </BotaoEnviar>
                </Formulario>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
