import Link from "next/link";
import { AjudaCalculo } from "@/components/AjudaCalculo";
import { Pagina } from "@/components/Pagina";
import { Podio, type LinhaRanking } from "@/components/Podio";
import {
  avaliacaoEncerrada,
  carregarAvaliacoes,
  carregarPenalidades,
  exigir,
  SELECT_EQUIPE,
  sessaoAtual,
} from "@/lib/dados";
import { compararRanking, consolidarEquipe } from "@/lib/nota";
import { FASES } from "@/lib/rubricas";
import type { Equipe } from "@/lib/tipos";

// Aba "Ranking": classificação final com pódio (só organização), pronta para o telão.
export default async function AdminRanking() {
  const { supabase } = await sessaoAtual();
  const [rEquipes, fichas, penalidades, encerrada] = await Promise.all([
    supabase.from("equipes").select(SELECT_EQUIPE).order("nome").returns<Equipe[]>(),
    carregarAvaliacoes(supabase),
    carregarPenalidades(supabase),
    avaliacaoEncerrada(supabase),
  ]);
  const equipes = exigir(rEquipes, "equipes") ?? [];

  const linhas: LinhaRanking[] = equipes
    .map((e) => {
      const fe = (fichas ?? []).filter((f) => f.equipe_id === e.id);
      return { e, temNota: fe.length > 0, r: consolidarEquipe(fe, penalidades.get(e.id) ?? []) };
    })
    // só entra no ranking quem já tem alguma nota
    .filter((x) => x.temNota)
    .sort((a, b) => compararRanking(a.r, b.r))
    .map(({ e, r }) => ({
      id: e.id,
      nome: e.nome,
      final: r.final,
      completa: r.completa,
      penalidades: r.penalidades,
      integrantes: e.membros.map((m) => (m.inscritos?.nome ?? m.email).split(" ")[0]),
      fases: FASES.map((f) => ({ id: f.id, nota: r.fases[f.id].nota })),
    }));
  const semNota = equipes.length - linhas.length;

  return (
    <Pagina>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">
            DATAHack Univag 2026 · Rota do Diploma
          </p>
          <h1 className="text-3xl font-extrabold sm:text-5xl">
            <span className="grad-text">Ranking</span> final
          </h1>
          <p className="text-sm text-suave">
            Nota final = média dos avaliadores em cada rubrica, com os pesos do regulamento, + penalidades.
            {semNota > 0 && ` ${semNota} equipe(s) ainda sem nota não aparecem.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AjudaCalculo />
          <Link href="/admin/avaliacao" className="btn-secundario">
            Detalhe das notas
          </Link>
        </div>
      </div>

      <Podio linhas={linhas} encerrada={encerrada} />
    </Pagina>
  );
}
