import { alterarPapel } from "@/app/actions";
import { FormParticipante } from "@/components/FormParticipante";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { Pagina } from "@/components/Pagina";
import { sessaoAtual } from "@/lib/dados";
import type { Inscrito } from "@/lib/tipos";

// Aba "Organizadores": quem tem acesso à área da organização.
export default async function AdminOrganizadores() {
  const { supabase, inscrito } = await sessaoAtual();
  const { data } = await supabase
    .from("inscritos")
    .select("email, nome, curso, semestre, papel")
    .eq("papel", "organizador")
    .order("nome")
    .returns<Inscrito[]>();
  const organizadores = data ?? [];

  return (
    <Pagina>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Organizadores</h1>
        <p className="text-sm text-suave">
          Organizadores veem todas as equipes, alunos, notas e links, publicam materiais e usam o gerador de equipes.
        </p>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Com acesso ({organizadores.length})</h2>
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

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Adicionar organizador</h2>
        <p className="text-sm text-suave">
          A pessoa entra pelo “Primeiro acesso” com este e-mail e cria a própria senha. Para promover um aluno que já está
          na lista, use o mesmo e-mail dele (os dados são atualizados).
        </p>
        <FormParticipante papelPadrao="organizador" />
      </section>
    </Pagina>
  );
}
