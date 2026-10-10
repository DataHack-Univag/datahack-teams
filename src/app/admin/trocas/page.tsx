import Link from "next/link";
import { cancelarTroca } from "@/app/actions";
import { BotaoEnviar, Formulario } from "@/components/Formulario";
import { Pagina } from "@/components/Pagina";
import { carregarEquipesResumo, carregarHistoricoTrocas, sessaoAtual } from "@/lib/dados";
import type { StatusTroca, Troca } from "@/lib/tipos";

const STATUS: { valor: StatusTroca; rotulo: string; classe: string }[] = [
  { valor: "pendente", rotulo: "Aguardando", classe: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  { valor: "aceita", rotulo: "Aceita", classe: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" },
  { valor: "recusada", rotulo: "Recusada", classe: "bg-red-500/15 text-red-700 dark:text-red-300" },
  { valor: "cancelada", rotulo: "Cancelada", classe: "bg-marca-fundo text-suave" },
];

const quando = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Cuiaba",
      })
    : "—";

// Aba "Trocas": auditoria de todos os pedidos de troca de equipe.
export default async function AdminTrocas({ searchParams }: PageProps<"/admin/trocas">) {
  const { status: filtroBruto } = await searchParams;
  const filtro = STATUS.find((s) => s.valor === filtroBruto)?.valor ?? null;

  const { supabase } = await sessaoAtual();
  const [dados, equipes] = await Promise.all([carregarHistoricoTrocas(supabase), carregarEquipesResumo(supabase)]);
  // Nome atual da equipe; se ela foi apagada, usa a cópia guardada no pedido.
  const nomeEquipe = (id: string | null, copia?: string | null) =>
    equipes.find((e) => e.id === id)?.nome ?? (copia ? `${copia} (excluída)` : "(equipe excluída)");

  if (dados === null) {
    return (
      <Pagina>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Trocas</h1>
        <p className="card text-sm text-suave">
          A troca de equipe ainda não está ativa: rode <code>supabase/006_trocas.sql</code> no SQL Editor do Supabase.
        </p>
      </Pagina>
    );
  }

  const { lista: historico, falta007 } = dados;
  const contagem = Object.fromEntries(STATUS.map((s) => [s.valor, historico.filter((t) => t.status === s.valor).length]));
  const lista = filtro ? historico.filter((t) => t.status === filtro) : historico;

  return (
    <Pagina>
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          Histórico de <span className="grad-text">trocas</span>
        </h1>
        <p className="text-sm text-suave">
          Todos os pedidos de troca de equipe: quem pediu, para onde, quem respondeu e quando. Horários de Cuiabá.
        </p>
      </div>

      {falta007 && (
        <p className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-sm">
          Rode <code>supabase/007_auditoria_trocas.sql</code> no Supabase: sem ela, o histórico é apagado junto quando uma
          equipe é excluída e não registra quem cancelou.
        </p>
      )}

      {/* ------------------------------------------------ números / filtros */}
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por situação">
        <Filtro href="/admin/trocas" ativo={!filtro} rotulo="Todas" n={historico.length} />
        {STATUS.map((s) => (
          <Filtro
            key={s.valor}
            href={`/admin/trocas?status=${s.valor}`}
            ativo={filtro === s.valor}
            rotulo={s.rotulo}
            n={contagem[s.valor]}
          />
        ))}
      </nav>

      {/* ------------------------------------------------ lista */}
      {lista.length === 0 ? (
        <p className="card text-sm text-suave">Nenhum pedido {filtro ? "nessa situação" : "ainda"}.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          {lista.map((t) => (
            <ItemTroca key={t.id} t={t} nomeEquipe={nomeEquipe} />
          ))}
        </ul>
      )}
    </Pagina>
  );
}

function Filtro({ href, ativo, rotulo, n }: { href: string; ativo: boolean; rotulo: string; n: number }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        ativo ? "border-transparent text-white [background:var(--grad)]" : "border-borda-forte bg-superficie-solida text-suave hover:text-foreground"
      }`}
    >
      {rotulo}
      <span className={`rounded-full px-1.5 text-xs tabular-nums ${ativo ? "bg-white/20" : "bg-marca-fundo"}`}>{n}</span>
    </Link>
  );
}

function ItemTroca({
  t,
  nomeEquipe,
}: {
  t: Troca;
  nomeEquipe: (id: string | null, copia?: string | null) => string;
}) {
  const s = STATUS.find((x) => x.valor === t.status)!;
  const quem = t.quem?.nome ?? t.solicitante_nome ?? t.solicitante ?? "(participante removido)";
  const respondeu = t.respondido_nome ?? t.respondeu?.nome ?? t.respondido_por ?? null;
  const origem = nomeEquipe(t.equipe_origem, t.origem_nome);
  const destino = nomeEquipe(t.equipe_destino, t.destino_nome);

  return (
    <li className="card faixa-topo min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`selo ${s.classe}`}>{s.rotulo}</span>
        <span className="font-mono text-xs text-suave">pedido em {quando(t.criado_em)}</span>
      </div>

      <p className="[overflow-wrap:anywhere]">
        <strong>{quem}</strong> pediu para sair da <strong>{origem}</strong> e ir para a <strong>{destino}</strong>.
      </p>
      {t.mensagem && <p className="text-sm [overflow-wrap:anywhere] text-suave italic">“{t.mensagem}”</p>}

      <div className="rounded-xl border border-borda bg-marca-fundo/50 p-3 text-sm [overflow-wrap:anywhere]">
        {t.status === "aceita" && (
          <>
            <p>
              ✔ Aceita por <strong>{respondeu ?? "?"}</strong> em {quando(t.respondido_em)}.
            </p>
            <p className="mt-1 text-xs text-suave">
              Trocaram de lugar: {quem} → {destino} · {respondeu ?? "?"} → {origem}
            </p>
          </>
        )}
        {t.status === "recusada" && (
          <p>
            Recusada por <strong>{respondeu ?? "?"}</strong> em {quando(t.respondido_em)}.
          </p>
        )}
        {t.status === "cancelada" && (
          <p>
            Cancelada em {quando(t.respondido_em)}
            {respondeu ? (
              <>
                {" "}
                por <strong>{respondeu}</strong>
              </>
            ) : null}
            .
          </p>
        )}
        {t.status === "pendente" && <p>Aguardando alguém da {destino} aceitar ou recusar.</p>}
      </div>

      {t.status === "pendente" && (
        <Formulario action={cancelarTroca} rotuloConfirmar="Cancelar pedido" confirmar={`Cancelar o pedido de ${quem}?`}>
          <input type="hidden" name="id" value={t.id} />
          <BotaoEnviar className="btn-secundario min-h-9 px-3 text-xs">Cancelar pedido</BotaoEnviar>
        </Formulario>
      )}
    </li>
  );
}
