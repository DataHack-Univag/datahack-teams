import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { listarParticipantes } from "@/modules/pessoas/infra/repositorio";
import { FormPessoa } from "@/modules/pessoas/ui/FormPessoa";
import { ListaPessoas } from "@/modules/pessoas/ui/ListaPessoas";
import { BotaoAjuda } from "@/shared/ui/Ajuda";
import { CabecalhoPagina, Pagina } from "@/shared/ui/Pagina";

// Aba "Pessoas": quem pode entrar no sistema (alunos, organização e bancas) numa lista só.
export default async function AdminPessoas({ searchParams }: PageProps<"/admin/pessoas">) {
  const { filtro, busca } = await searchParams;
  const { cliente, usuario } = await sessaoAtual();
  const pessoas = await listarParticipantes(cliente);
  const alunos = pessoas.filter((p) => p.papel === "aluno");

  return (
    <Pagina>
      <CabecalhoPagina
        trilha={[{ rotulo: "Organização", href: "/admin" }, { rotulo: "Pessoas" }]}
        titulo="Pessoas"
        descricao={`Só quem está nesta lista consegue criar a senha e entrar. ${alunos.length} alunos · ${alunos.filter((p) => !p.equipe_id).length} sem equipe · ${pessoas.length - alunos.length} da organização e bancas.`}
        acoes={
          <BotaoAjuda titulo="Pessoas">
            <ul>
              <li>Use os filtros para ver só alunos, a organização ou cada banca.</li>
              <li>Toque numa pessoa para editar, ver a equipe, trocar de banca ou “ver como” ela vê o sistema.</li>
              <li>
                Para dar acesso de banca ou organização a alguém que já está na lista, cadastre de novo com o <strong>mesmo e-mail</strong> e
                o papel novo: os dados são atualizados.
              </li>
              <li>A nota média só aparece para a organização e serve para o gerador equilibrar as equipes.</li>
            </ul>
          </BotaoAjuda>
        }
      />

      <details id="cadastrar" className="card group scroll-mt-24">
        <summary className="cursor-pointer font-semibold text-marca select-none">+ Cadastrar pessoa</summary>
        <div className="mt-4">
          <FormPessoa />
        </div>
      </details>

      <ListaPessoas
        // a busca vinda da paleta de comandos (Ctrl+K) recria a lista já filtrada
        key={typeof busca === "string" ? busca : ""}
        pessoas={pessoas}
        meuEmail={usuario.email}
        filtroInicial={typeof filtro === "string" ? filtro : undefined}
        buscaInicial={typeof busca === "string" ? busca : undefined}
      />
    </Pagina>
  );
}
