import { situacaoInscricao } from "@/modules/inscricoes/domain/publica";
import { camposDaEdicao, listarInscricoes } from "@/modules/inscricoes/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";

const celula = (v: unknown) => {
  const t = v === null || v === undefined ? "" : Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v);
  // Planilhas executam fórmulas que começam com = + - @: prefixa com apóstrofo.
  const seguro = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return `"${seguro.replace(/"/g, '""')}"`;
};

// Inscrições da edição em CSV (abre no Excel/Sheets): dados, situação e cada resposta numa coluna.
export async function GET() {
  const { cliente, edicao, real } = await sessaoAtual();
  if (real.papel !== "organizador") return new Response("Acesso restrito à organização.", { status: 403 });
  const [inscricoes, campos] = await Promise.all([listarInscricoes(cliente, edicao.id), camposDaEdicao(cliente, edicao.id)]);

  const cabecalho = ["Nome", "E-mail", "Situação", "Origem", "Inscrito em", "Instituição", ...campos.map((c) => c.rotulo), "Termo (versão)"];
  const linhas = inscricoes.map((i) => [
    i.nome,
    i.email,
    situacaoInscricao(i.situacao).rotulo,
    i.origem === "formulario" ? "Formulário" : "Organização",
    new Date(i.criado_em).toLocaleString("pt-BR", { timeZone: "America/Cuiaba" }),
    i.instituicao,
    ...campos.map((c) => (c.tipo === "instituicao" ? (i.respostas[c.chave] === "outra" ? "Outra" : i.instituicao) : i.respostas[c.chave])),
    i.termo_versao,
  ]);
  const csv = "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscricoes-${edicao.slug}.csv"`,
    },
  });
}
