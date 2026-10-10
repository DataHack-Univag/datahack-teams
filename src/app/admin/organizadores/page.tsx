import { alterarPapel, removerParticipante } from "@/app/actions";
import { FormParticipante } from "@/components/FormParticipante";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { Pagina } from "@/components/Pagina";
import { sessaoAtual } from "@/lib/dados";
import { rotuloPapel, type Inscrito } from "@/lib/tipos";

// Aba "Organizadores": quem tem acesso à área da organização e quem compõe as bancas.
export default async function AdminOrganizadores() {
  const { supabase, inscrito } = await sessaoAtual();
  const { data } = await supabase
    .from("inscritos")
    .select("email, nome, curso, semestre, papel")
    .in("papel", ["organizador", "avaliador_tecnico", "avaliador_negocio"])
    .order("nome")
    .returns<Inscrito[]>();
  const equipe = data ?? [];
  const organizadores = equipe.filter((p) => p.papel === "organizador");
  const avaliadores = equipe.filter((p) => p.papel !== "organizador");

  return (
    <Pagina>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Organizadores e bancas</h1>
        <p className="text-sm text-suave">
          Organizadores veem tudo e fazem a avaliação técnica (mesa das fases 1 e 2 e repositório da fase 3). As bancas só
          acessam a área de avaliação: a banca de professores avalia os pitches das fases 1 e 2 (visão macro); os jurados de
          negócio, o pitch final.
        </p>
      </div>

      {/* ------------------------------------------------ organizadores */}
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Organizadores ({organizadores.length})</h2>
        <ul className="divide-y divide-borda">
          {organizadores.map((o) => (
            <li key={o.email} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {o.nome}
                  {o.email === inscrito.email && <span className="ml-1 text-xs text-suave">(você)</span>}
                </p>
                <p className="truncate text-xs text-suave">{o.email}</p>
              </div>
              {o.email !== inscrito.email && (
                <Formulario
                  action={alterarPapel}
                  confirmar={`Tirar o acesso de organizador de ${o.nome}? Ele(a) continua podendo logar como aluno.`}
                  rotuloConfirmar="Tirar acesso"
                  className="flex flex-col items-end"
                >
                  <input type="hidden" name="email" value={o.email} />
                  <input type="hidden" name="papel" value="aluno" />
                  <BotaoEnviar className="btn-perigo min-h-9 px-3 text-xs">Remover acesso</BotaoEnviar>
                </Formulario>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------ bancas */}
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Bancas de avaliação ({avaliadores.length})</h2>
        {avaliadores.length === 0 && <p className="text-sm text-suave">Nenhum avaliador cadastrado ainda.</p>}
        <ul className="divide-y divide-borda">
          {avaliadores.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {a.nome}
                  <span className="selo ml-2 bg-marca-fundo align-middle text-marca">{rotuloPapel(a.papel)}</span>
                </p>
                <p className="truncate text-xs text-suave">{a.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Formulario
                  action={alterarPapel}
                  rotuloConfirmar="Trocar banca"
                  confirmar={`Passar ${a.nome} para ${a.papel === "avaliador_tecnico" ? "os jurados de negócio" : "a banca de professores"}? As fichas já lançadas continuam valendo.`}
                >
                  <input type="hidden" name="email" value={a.email} />
                  <input
                    type="hidden"
                    name="papel"
                    value={a.papel === "avaliador_tecnico" ? "avaliador_negocio" : "avaliador_tecnico"}
                  />
                  <BotaoEnviar className="btn-secundario min-h-9 px-3 text-xs">
                    Mudar para {a.papel === "avaliador_tecnico" ? "negócio" : "professores"}
                  </BotaoEnviar>
                </Formulario>
                <Formulario
                  action={removerParticipante}
                  rotuloConfirmar="Remover"
                  confirmar={`Remover ${a.nome} das bancas? Ele(a) perde o acesso. Se já lançou notas, apague as fichas antes (aba Avaliação).`}
                >
                  <input type="hidden" name="email" value={a.email} />
                  <BotaoEnviar className="btn-perigo min-h-9 px-3 text-xs">Remover</BotaoEnviar>
                </Formulario>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Adicionar organizador ou avaliador</h2>
        <p className="text-sm text-suave">
          Escolha o papel no formulário. A pessoa entra pelo “Primeiro acesso” com este e-mail e cria a própria senha. Para
          promover alguém que já está na lista, use o mesmo e-mail (os dados são atualizados).
        </p>
        <FormParticipante papelPadrao="avaliador_tecnico" />
      </section>
    </Pagina>
  );
}
