"use client";

import { useState } from "react";
import { decidirInscricao } from "@/modules/inscricoes/application/actions";
import type { Campo, Valor } from "@/modules/inscricoes/domain/campos";
import { SITUACOES_INSCRICAO, situacaoInscricao, type SituacaoInscricao } from "@/modules/inscricoes/domain/publica";
import type { LinhaInscricao } from "@/modules/inscricoes/infra/repositorio";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { FiltrosChips } from "@/shared/ui/FiltrosChips";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Selo } from "@/shared/ui/Selo";

/** O que cada situação permite fazer a seguir (o resto não aparece: heurística 8). */
const PROXIMOS: Record<SituacaoInscricao, { para: SituacaoInscricao; rotulo: string; variante: "primario" | "secundario" }[]> = {
  pendente: [
    { para: "aprovada", rotulo: "Aprovar", variante: "primario" },
    { para: "espera", rotulo: "Lista de espera", variante: "secundario" },
    { para: "recusada", rotulo: "Recusar", variante: "secundario" },
  ],
  espera: [
    { para: "aprovada", rotulo: "Aprovar", variante: "primario" },
    { para: "recusada", rotulo: "Recusar", variante: "secundario" },
  ],
  aprovada: [{ para: "cancelada", rotulo: "Cancelar inscrição", variante: "secundario" }],
  recusada: [{ para: "pendente", rotulo: "Voltar para análise", variante: "secundario" }],
  cancelada: [{ para: "aprovada", rotulo: "Aprovar de novo", variante: "secundario" }],
};

const mostrar = (c: Campo, v: Valor, instituicao: string | null) =>
  c.tipo === "sim_nao" ? (v ? "Sim" : "Não") : c.tipo === "aceite" ? "aceito" : c.tipo === "instituicao" ? (v === "outra" ? "Outra" : instituicao ?? "—") : Array.isArray(v) ? v.join(", ") : String(v);

/**
 * Fila de inscrições da edição: filtrar por situação, buscar por nome/e-mail, ver as respostas e
 * decidir. Cada decisão tem "Desfazer" no aviso (heurística 3).
 */
export function ListaInscricoes({ inscricoes, campos }: { inscricoes: LinhaInscricao[]; campos: Campo[] }) {
  const [filtro, setFiltro] = useState<string>(inscricoes.some((i) => i.situacao === "pendente") ? "pendente" : "todas");
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const visiveis = inscricoes.filter(
    (i) => (filtro === "todas" || i.situacao === filtro) && (!termo || i.nome.toLowerCase().includes(termo) || i.email.includes(termo)),
  );
  // Fila de espera na ordem de chegada (quem entra primeiro numa vaga).
  const posicaoEspera = new Map(inscricoes.filter((i) => i.situacao === "espera").map((i, n) => [i.id, n + 1]));

  if (!inscricoes.length)
    return (
      <EstadoVazio icone="pessoas" titulo="Nenhuma inscrição ainda">
        Divulgue o link da página de inscrição. Quem se inscrever aparece aqui.
      </EstadoVazio>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <FiltrosChips
          opcoes={[
            { id: "todas", rotulo: "Todas", n: inscricoes.length },
            ...SITUACOES_INSCRICAO.map((s) => ({ id: s.valor, rotulo: s.rotulo, n: inscricoes.filter((i) => i.situacao === s.valor).length })),
          ]}
          ativo={filtro}
          aoEscolher={setFiltro}
        />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou e-mail" aria-label="Buscar inscrição" className="campo min-h-9 w-full py-1 text-sm sm:ml-auto sm:w-64" />
      </div>

      {!visiveis.length && <p className="card text-sm text-suave">Nenhuma inscrição neste filtro.</p>}

      <ul className="space-y-2">
        {visiveis.map((i) => {
          const s = situacaoInscricao(i.situacao);
          const respostas = campos.filter((c) => i.respostas[c.chave] !== undefined);
          return (
            <li key={i.id} className="card space-y-2 p-3">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words">{i.nome}</p>
                  <p className="text-xs break-all text-suave">
                    {i.email} · {new Date(i.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Cuiaba" })}
                    {i.origem === "importacao" ? " · cadastrada pela organização" : ""}
                    {i.termo_versao ? ` · termo v${i.termo_versao}` : ""}
                  </p>
                </div>
                <Selo tom={s.tom}>
                  {s.rotulo}
                  {posicaoEspera.has(i.id) ? ` · nº ${posicaoEspera.get(i.id)}` : ""}
                </Selo>
              </div>
              {respostas.length > 0 && (
                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {respostas.map((c) => (
                    <div key={c.chave} className="flex gap-1">
                      <dt className="text-suave">{c.rotulo.replace(/[?:]+$/, "")}:</dt>
                      <dd className="font-medium">
                        {mostrar(c, i.respostas[c.chave], i.instituicao)}
                        {c.sensivel && <span className="ml-1 text-amber-600">●</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="flex flex-wrap gap-2 border-t border-borda pt-2">
                {PROXIMOS[i.situacao].map((p) => (
                  <Formulario
                    key={p.para}
                    action={decidirInscricao}
                    acaoDesfazer={decidirInscricao}
                    confirmar={
                      p.para === "cancelada"
                        ? `${i.nome} sai da edição e perde o acesso. Se houver lista de espera e aprovação automática, o primeiro da fila entra na vaga.`
                        : undefined
                    }
                    tituloConfirmar="Cancelar esta inscrição?"
                    rotuloConfirmar="Cancelar inscrição"
                  >
                    <Ocultos valores={{ id: i.id, situacao: p.para, anterior: i.situacao }} />
                    <BotaoEnviar variante={p.variante} tamanho="pequeno">
                      {p.rotulo}
                    </BotaoEnviar>
                  </Formulario>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {campos.some((c) => c.sensivel) && <p className="text-xs text-suave"><span className="text-amber-600">●</span> resposta sensível: só a organização vê.</p>}
    </div>
  );
}
