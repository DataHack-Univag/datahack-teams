import Link from "next/link";
import { adicionarMembro, definirLider, removerMembro } from "@/modules/equipes/application/actions";
import type { permissoesEquipe } from "@/modules/equipes/domain/permissoes";
import { nomeMembro, type Configuracao, type Equipe } from "@/modules/equipes/domain/tipos";
import type { Inscrito } from "@/modules/pessoas/domain/tipos";
import { Aviso } from "@/shared/ui/Aviso";
import { Avatar } from "@/shared/ui/Avatar";
import { Campo } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";
import { Selo } from "@/shared/ui/Selo";

type Permissoes = ReturnType<typeof permissoesEquipe>;

/** Lista de integrantes com as ações de líder (e, para a organização, entrar/sair da equipe). */
export function Integrantes({
  equipe,
  config,
  p,
  meuEmail,
  organizador,
  disponiveis = [],
}: {
  equipe: Equipe;
  config: Configuracao;
  p: Permissoes;
  meuEmail: string;
  organizador: boolean;
  /** Alunos sem equipe (só a organização adiciona). */
  disponiveis?: Inscrito[];
}) {
  const membros = [...equipe.membros].sort((a, b) => nomeMembro(a).localeCompare(nomeMembro(b), "pt-BR"));
  const regraLider = !p.lider
    ? "Qualquer integrante pode escolher o líder. Depois, só o líder passa a liderança adiante."
    : p.souLider
      ? "Só você (ou a organização) pode passar a liderança para outra pessoa."
      : organizador
        ? "Como organização, você pode trocar ou tirar o líder."
        : "Só o líder pode passar a liderança para outra pessoa.";

  return (
    <section id="integrantes" className="card scroll-mt-24 space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Integrantes</h2>
        <span className="text-sm text-suave tabular-nums" title="integrantes / limite">
          {equipe.membros.length} de {config.max_membros}
        </span>
      </div>
      <p className="text-xs text-suave">
        {regraLider}
        {!p.podeGerirMembros && " Quem entra e sai da equipe é a organização."}
      </p>

      <ul className="divide-y divide-borda">
        {membros.map((m) => {
          const nome = nomeMembro(m);
          const souEu = m.email === meuEmail;
          const ehLider = m.email === equipe.lider_email;
          return (
            <li key={m.email} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar nome={nome} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                  <span className="truncate">{nome}</span>
                  {souEu && <span className="text-xs text-suave">(você)</span>}
                  {ehLider && <Selo tom="alerta">★ Líder</Selo>}
                  {m.situacao === "convidado" && <Selo tom="info">convite aguardando</Selo>}
                </p>
                <p className="truncate text-xs text-suave">
                  {[m.inscritos?.curso, m.inscritos?.semestre && `${m.inscritos.semestre}º semestre`, organizador && m.email]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {organizador && (
                  <Link href={`/ver-como?email=${encodeURIComponent(m.email)}`} className="inline-flex items-center gap-1 text-xs text-marca hover:underline">
                    <Icone nome="olho" className="size-3.5" /> Ver como este aluno
                  </Link>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {!ehLider && p.podeMexerLider && (
                  <Formulario
                    // recria ao mudar o líder: a mensagem antiga não fica pendurada
                    key={`lider-${m.email}-${equipe.lider_email ?? ""}`}
                    action={definirLider}
                    tituloConfirmar={p.souLider ? "Passar a liderança?" : "Definir líder?"}
                    rotuloConfirmar={p.souLider ? "Passar liderança" : "Tornar líder"}
                    confirmar={
                      p.souLider
                        ? `Você deixa de ser líder e só ${nome} poderá trocar de novo.`
                        : p.lider
                          ? `${nome} passa a ser o líder no lugar de ${nomeMembro(p.lider)}.`
                          : `${nome} vira líder da equipe. Depois disso, só o líder poderá passar a liderança para outra pessoa.`
                    }
                  >
                    <Ocultos valores={{ equipe_id: equipe.id, email: m.email }} />
                    <BotaoEnviar variante="secundario" tamanho="pequeno" icone="estrela">
                      {p.souLider ? "Passar liderança" : "Tornar líder"}
                    </BotaoEnviar>
                  </Formulario>
                )}
                {ehLider && organizador && p.podeEditar && (
                  <Formulario
                    key={`tirar-${m.email}`}
                    action={definirLider}
                    rotuloConfirmar="Tirar líder"
                    confirmar={`${nome} deixa de ser líder e a equipe fica sem líder até alguém ser escolhido.`}
                  >
                    <Ocultos valores={{ equipe_id: equipe.id, email: "" }} />
                    <BotaoEnviar variante="secundario" tamanho="pequeno">
                      Tirar líder
                    </BotaoEnviar>
                  </Formulario>
                )}
                {p.podeGerirMembros && (
                  <Formulario
                    action={removerMembro}
                    acaoDesfazer={adicionarMembro}
                    rotuloConfirmar="Remover da equipe"
                    confirmar={`${nome} sai da ${equipe.nome} e fica sem equipe. Dá para desfazer logo depois.`}
                  >
                    <Ocultos valores={{ equipe_id: equipe.id, email: m.email, nome }} />
                    <BotaoEnviar variante="perigo" tamanho="pequeno">
                      Remover
                    </BotaoEnviar>
                  </Formulario>
                )}
              </div>
            </li>
          );
        })}
        {membros.length === 0 && <li className="py-3 text-sm text-suave">Nenhum integrante ainda.</li>}
      </ul>

      {p.podeGerirMembros &&
        (p.lotada ? (
          <Aviso tom="neutro">A equipe chegou ao limite de {config.max_membros} integrantes (ajuste em Equipes → Regras das equipes).</Aviso>
        ) : disponiveis.length === 0 ? (
          <Aviso tom="neutro">Todos os alunos já têm equipe.</Aviso>
        ) : (
          <Formulario action={adicionarMembro} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Ocultos valores={{ equipe_id: equipe.id }} />
            {/* Busca por nome com sugestões (heurística 6): não precisa lembrar o e-mail. */}
            <Campo
              rotulo="Adicionar integrante"
              name="email"
              list={`sem-equipe-${equipe.id}`}
              required
              placeholder="Comece a digitar o nome…"
              autoComplete="off"
              className="sm:flex-1"
              dica={`${disponiveis.length} aluno(s) sem equipe.`}
            />
            <datalist id={`sem-equipe-${equipe.id}`}>
              {disponiveis.map((i) => (
                <option key={i.email} value={i.email}>
                  {i.nome}
                  {i.curso ? ` · ${i.curso}` : ""}
                  {i.semestre ? ` · ${i.semestre}º sem.` : ""}
                </option>
              ))}
            </datalist>
            <BotaoEnviar icone="mais_novo" className="sm:mb-5">
              Adicionar
            </BotaoEnviar>
          </Formulario>
        ))}
    </section>
  );
}
