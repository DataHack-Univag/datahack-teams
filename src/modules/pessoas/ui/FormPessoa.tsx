import type { Campo as Pergunta, Respostas } from "@/modules/inscricoes/domain/campos";
import { CamposExtras } from "@/modules/inscricoes/ui/CamposExtras";
import type { OpcaoInstituicao } from "@/modules/inscricoes/ui/FormularioDinamico";
import { salvarParticipante } from "@/modules/pessoas/application/actions";
import { funcaoDe, opcoesFuncao, type BancaResumo } from "@/modules/pessoas/domain/papeis";
import type { Participante } from "@/modules/pessoas/domain/tipos";
import { Campo, Selecao } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";

/** O formulário de inscrição da edição, para o cadastro seguir as mesmas perguntas. */
export type FormularioCadastro = { campos: Pergunta[]; respostas: Record<string, Respostas>; instituicoes: OpcaoInstituicao[]; aceitaOutra: boolean };

// Curso, semestre e CR têm lugar próprio (o gerador lê de lá); as outras perguntas vão para a inscrição.
const PROPRIAS = ["curso", "semestre", "cr"];

/**
 * Cadastrar ou editar uma pessoa na edição. Sem `p` = novo cadastro (quem já existe é atualizado).
 * Com `formulario`, mostra só as perguntas que a edição faz (sem ele, curso, semestre e nota).
 */
export function FormPessoa({
  p,
  bancas,
  funcaoPadrao = "aluno",
  formulario,
}: {
  p?: Participante;
  bancas: BancaResumo[];
  funcaoPadrao?: string;
  formulario?: FormularioCadastro;
}) {
  const tem = (chave: string) => !formulario || formulario.campos.some((c) => c.chave === chave);
  const cr = formulario?.campos.find((c) => c.chave === "cr");
  const extras = formulario?.campos.filter((c) => !PROPRIAS.includes(c.chave) && c.tipo !== "aceite") ?? [];
  return (
    <Formulario action={salvarParticipante} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {p && <Ocultos valores={{ email_original: p.email }} />}
      <Campo rotulo="Nome completo" name="nome" required defaultValue={p?.nome} className="sm:col-span-2" />
      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        required
        defaultValue={p?.email}
        className="sm:col-span-2"
        dica={p ? undefined : "O mesmo da inscrição: é com ele que a pessoa cria a senha."}
      />
      <Selecao
        rotulo="Função nesta edição"
        name="funcao"
        defaultValue={p ? funcaoDe(p.papel, p.banca) : funcaoPadrao}
        className="sm:col-span-2"
        opcoes={opcoesFuncao(bancas).map((x) => ({ valor: x.valor, rotulo: `${x.rotulo} — ${x.descricao}` }))}
      />
      {tem("curso") && <Campo rotulo="Curso" name="curso" defaultValue={p?.curso ?? ""} placeholder="ENS" className="uppercase" />}
      {tem("semestre") && <Campo rotulo="Semestre" name="semestre" type="number" min={1} max={12} defaultValue={p?.semestre ?? ""} />}
      {tem("cr") && (
        <Campo
          rotulo={cr?.rotulo ?? "Nota média"}
          name="nota"
          inputMode="decimal"
          defaultValue={p?.nota != null ? String(p.nota).replace(".", ",") : ""}
          placeholder="ex.: 8,5"
          dica="Só a organização vê. Vazio = sem nota."
          className="sm:col-span-2"
        />
      )}
      {extras.length > 0 && formulario && (
        <div className="sm:col-span-2 lg:col-span-6">
          <CamposExtras
            campos={extras}
            inicial={p ? (formulario.respostas[p.email] ?? {}) : {}}
            instituicoes={formulario.instituicoes}
            aceitaOutra={formulario.aceitaOutra}
          />
        </div>
      )}
      <div className="sm:col-span-2 lg:col-span-6">
        <BotaoEnviar icone={p ? "ok" : "mais_novo"}>{p ? "Salvar alterações" : "Cadastrar"}</BotaoEnviar>
      </div>
    </Formulario>
  );
}
