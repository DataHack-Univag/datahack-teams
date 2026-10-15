"use client";

import { useState } from "react";
import type { Edicao } from "@/modules/edicoes/domain/tipos";
import { salvarAcessoEdicao } from "@/modules/instituicoes/application/actions";
import { ACESSOS, APROVACOES, paraCampoDataHora, type Acesso, type Instituicao } from "@/modules/instituicoes/domain/tipos";
import { CampoLogo } from "@/modules/instituicoes/ui/CampoLogo";
import { LogoSvg } from "@/modules/instituicoes/ui/LogoSvg";
import { Campo, Selecao } from "@/shared/ui/Campo";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";

/**
 * Quem pode participar da edição (lista, instituições escolhidas ou aberto), como entram
 * e a "cara" da edição. Só mostra o que vale para o tipo escolhido (heurística 8).
 */
export function FormAcessoEdicao({ edicao, instituicoes, escolhidas }: { edicao: Edicao; instituicoes: Instituicao[]; escolhidas: string[] }) {
  const [acesso, setAcesso] = useState<Acesso>(edicao.acesso ?? "lista");
  const [marcadas, setMarcadas] = useState<string[]>(escolhidas);
  const [cor, setCor] = useState(edicao.marca?.cor ?? "#1f6fd1");
  const [usarCor, setUsarCor] = useState(!!edicao.marca?.cor);
  const inscricaoPublica = acesso !== "lista";
  // A ordem das instituições é a da lista; a primeira com logo vira a logo da edição.
  const ordenadas = instituicoes.filter((i) => marcadas.includes(i.id));

  const alternar = (id: string) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <Formulario action={salvarAcessoEdicao} className="flex flex-col gap-6">
      <Ocultos valores={{ id: edicao.id }} />

      <fieldset className="space-y-2">
        <legend className="rotulo">Quem pode participar</legend>
        <div className="grid gap-2 md:grid-cols-3">
          {ACESSOS.map((a) => (
            <label
              key={a.valor}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition ${acesso === a.valor ? "border-marca bg-marca-fundo ring-1 ring-marca" : "border-borda hover:border-marca/50"}`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <input type="radio" name="acesso" value={a.valor} checked={acesso === a.valor} onChange={() => setAcesso(a.valor)} className="accent-[var(--marca)]" />
                {a.rotulo}
              </span>
              <span className="text-xs text-suave">{a.descricao}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="rotulo">
          {acesso === "aberto" ? "Instituições parceiras" : "Instituições participantes"}
          {acesso !== "instituicoes" && <span className="ml-1 font-normal text-suave">(opcional)</span>}
        </legend>
        <p className="text-xs text-suave">
          {acesso === "lista" && "A instituição do evento. A logo dela aparece no topo das telas, se a edição não tiver logo própria."}
          {acesso === "instituicoes" && "Só quem é destas instituições pode se inscrever. A instituição é informada pela pessoa (o e-mail é o pessoal)."}
          {acesso === "aberto" && "Qualquer instituição pode participar. Marque aqui as que apoiam o evento, se quiser mostrar a logo delas."}
        </p>
        {instituicoes.length ? (
          <div className="flex flex-wrap gap-2">
            {instituicoes.map((i) => {
              const marcada = marcadas.includes(i.id);
              return (
                <label
                  key={i.id}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${marcada ? "border-marca bg-marca-fundo font-semibold" : "border-borda"}`}
                >
                  <input type="checkbox" name="instituicoes" value={i.id} checked={marcada} onChange={() => alternar(i.id)} className="accent-[var(--marca)]" />
                  {i.sigla ?? i.nome}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-suave">Nenhuma instituição cadastrada ainda. Cadastre em Edições → Instituições.</p>
        )}
      </fieldset>

      {inscricaoPublica && (
        <fieldset className="grid gap-3 rounded-xl border border-borda p-3 sm:grid-cols-2">
          <legend className="rotulo px-1">Inscrições</legend>
          <Selecao
            rotulo="Aprovação"
            name="aprovacao"
            defaultValue={edicao.aprovacao ?? "automatica"}
            opcoes={APROVACOES.map((a) => ({ valor: a.valor, rotulo: a.rotulo }))}
            dica={APROVACOES.map((a) => `${a.rotulo}: ${a.descricao}`).join(" ")}
            className="sm:col-span-2"
          />
          <Campo rotulo="Vagas" name="vagas" type="number" min={1} max={100000} defaultValue={edicao.vagas ?? ""} dica="Em branco: sem limite. Lotou, as próximas vão para a lista de espera." />
          <div className="hidden sm:block" />
          <Campo rotulo="Abrem em" name="inscricao_abre_em" type="datetime-local" defaultValue={paraCampoDataHora(edicao.inscricao_abre_em ?? null)} dica="Horário de Mato Grosso." />
          <Campo rotulo="Fecham em" name="inscricao_fecha_em" type="datetime-local" defaultValue={paraCampoDataHora(edicao.inscricao_fecha_em ?? null)} />
          <p className="text-xs text-suave sm:col-span-2">A página pública de inscrição e o formulário com as perguntas da edição chegam na próxima etapa.</p>
        </fieldset>
      )}
      {!inscricaoPublica && <input type="hidden" name="aprovacao" value={edicao.aprovacao ?? "automatica"} />}

      <fieldset className="grid gap-3 rounded-xl border border-borda p-3 sm:grid-cols-2">
        <legend className="rotulo px-1">Marca da edição</legend>
        <Campo
          rotulo="Nome público"
          name="nome_publico"
          maxLength={120}
          defaultValue={edicao.marca?.nome_publico ?? ""}
          placeholder={edicao.nome}
          dica="Como o evento aparece para os participantes. Em branco: o nome da edição."
          className="sm:col-span-2"
        />
        <div className="space-y-1">
          <span className="rotulo">
            Cor principal <span className="ml-1 font-normal text-suave">(opcional)</span>
          </span>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={usarCor} onChange={(e) => setUsarCor(e.target.checked)} aria-label="Usar cor própria" className="size-5 accent-[var(--marca)]" />
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} disabled={!usarCor} aria-label="Cor principal" className="h-10 w-16 cursor-pointer rounded-lg border border-borda disabled:opacity-40" />
            <span className="font-mono text-xs text-suave">{usarCor ? cor : "cor padrão do sistema"}</span>
          </div>
          <input type="hidden" name="cor" value={usarCor ? cor : ""} />
        </div>
        <div className="sm:col-span-2">
          <CampoLogo
            rotulo="Logo própria do evento"
            inicial={edicao.marca?.logo_svg}
            dica={
              ordenadas.some((i) => i.logo_svg)
                ? `Em branco: usa a logo de ${ordenadas.find((i) => i.logo_svg)?.sigla ?? "da instituição"}.`
                : "Arquivo .svg de até 200 KB. Sem logo: aparece só a marca do DATAHack."
            }
          />
        </div>
        {!edicao.marca?.logo_svg && ordenadas.find((i) => i.logo_svg) && (
          <p className="flex items-center gap-2 text-xs text-suave sm:col-span-2">
            Logo usada hoje:
            <span className="rounded bg-white p-1">
              <LogoSvg svg={ordenadas.find((i) => i.logo_svg)!.logo_svg!} nome="da instituição" className="h-6 w-auto" />
            </span>
          </p>
        )}
      </fieldset>

      <div>
        <BotaoEnviar icone="ok">Salvar acesso e marca</BotaoEnviar>
      </div>
    </Formulario>
  );
}
