"use client";

import Link from "next/link";
import { useState } from "react";
import {
  arquivarPiso,
  arquivarSala,
  criarPiso,
  criarSala,
  duplicarSala,
  importarMapa,
  renomearPiso,
} from "@/modules/mapa/application/actions";
import { medida } from "@/modules/mapa/domain/catalogo";
import { instrucoesParaIA, type Elemento } from "@/modules/mapa/domain/tipos";
import type { MapaDaEdicao } from "@/modules/mapa/infra/repositorio";
import { DesenhoSala } from "@/modules/mapa/ui/DesenhoSala";
import { AreaTexto, CaixaMarcar, Campo, Selecao } from "@/shared/ui/Campo";
import { EstadoVazio } from "@/shared/ui/EstadoVazio";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";
import { Icone } from "@/shared/ui/Icone";

/** Pisos e salas da edição, com miniatura de cada sala (o que já foi desenhado). */
export function ListaSalas({ mapa }: { mapa: MapaDaEdicao }) {
  const porSala = (id: string) =>
    mapa.elementos.filter((e) => e.sala_id === id);
  const variosPisos = mapa.pisos.length > 1;

  if (!mapa.pisos.some((p) => p.salas.length))
    return (
      <EstadoVazio icone="mapa" titulo="Nenhuma sala ainda">
        Crie a primeira sala com as medidas aproximadas (ex.: 8 × 6 m) ou
        importe um mapa pronto. Depois é só colocar as bancadas.
      </EstadoVazio>
    );

  return (
    <div className="space-y-6">
      {mapa.pisos.map((p) => (
        <section key={p.id} className="space-y-3">
          {(variosPisos || p.nome !== "Piso único") && (
            <CabecalhoPiso id={p.id} nome={p.nome} vazio={!p.salas.length} />
          )}
          {p.salas.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.salas.map((s) => (
                <CartaoSala key={s.id} sala={s} elementos={porSala(s.id)} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-suave">Piso sem salas.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function CabecalhoPiso({
  id,
  nome,
  vazio,
}: {
  id: string;
  nome: string;
  vazio: boolean;
}) {
  const [editando, setEditando] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {editando ? (
        <Formulario
          action={renomearPiso}
          className="flex flex-wrap items-end gap-2"
          aoSucesso={() => setEditando(false)}
        >
          <Ocultos valores={{ id }} />
          <Campo
            rotulo="Nome do piso"
            name="nome"
            defaultValue={nome}
            required
            maxLength={60}
          />
          <BotaoEnviar tamanho="pequeno" icone="ok" className="mb-0.5">
            Salvar
          </BotaoEnviar>
        </Formulario>
      ) : (
        <>
          <h2 className="text-lg font-semibold">{nome}</h2>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs text-marca underline"
          >
            Renomear
          </button>
          {vazio && (
            <Formulario action={arquivarPiso} acaoDesfazer={arquivarPiso}>
              <Ocultos valores={{ id }} />
              <BotaoEnviar variante="fantasma" tamanho="pequeno">
                Tirar piso
              </BotaoEnviar>
            </Formulario>
          )}
        </>
      )}
    </div>
  );
}

function CartaoSala({
  sala,
  elementos,
}: {
  sala: MapaDaEdicao["pisos"][number]["salas"][number];
  elementos: Elemento[];
}) {
  const lugares = elementos.reduce((t, e) => t + (e.lugares ?? 0), 0);
  return (
    <li className="card faixa-topo flex min-w-0 flex-col gap-3">
      <Link
        href={`/admin/mapa/${sala.id}`}
        className="block rounded-xl border border-borda bg-superficie-solida p-1 transition hover:border-marca"
      >
        <DesenhoSala
          sala={sala}
          elementos={elementos}
          legendas={false}
          rotuloAcessivel={`Miniatura da sala ${sala.nome}`}
        />
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold break-words">{sala.nome}</h3>
          <p className="text-xs text-suave">
            {medida(sala.largura_cm)} × {medida(sala.profundidade_cm)} ·{" "}
            {lugares} lugar(es) para equipes
          </p>
        </div>
        <Link
          href={`/admin/mapa/${sala.id}`}
          className="btn-secundario min-h-9 shrink-0 px-3 text-xs"
        >
          Desenhar
          <Icone nome="avancar" className="size-3.5" />
        </Link>
      </div>
      <div className="flex flex-wrap gap-1">
        <Formulario action={duplicarSala}>
          <Ocultos valores={{ id: sala.id }} />
          <BotaoEnviar variante="fantasma" tamanho="pequeno" icone="copiar">
            Duplicar sala
          </BotaoEnviar>
        </Formulario>
        <Formulario
          action={arquivarSala}
          acaoDesfazer={arquivarSala}
          tituloConfirmar={`Tirar a sala ${sala.nome} do mapa?`}
          confirmar="A sala e o desenho dela saem do mapa e do croqui. Nada é apagado: dá para desfazer logo em seguida."
          rotuloConfirmar="Tirar sala"
          perigo
        >
          <Ocultos valores={{ id: sala.id }} />
          <BotaoEnviar variante="fantasma" tamanho="pequeno" icone="lixo">
            Tirar sala
          </BotaoEnviar>
        </Formulario>
      </div>
    </li>
  );
}

/** Nova sala: nome, medidas aproximadas e o piso (com piso único, nem pergunta). */
export function FormNovaSala({
  pisos,
}: {
  pisos: { id: string; nome: string }[];
}) {
  return (
    <Formulario action={criarSala} className="grid gap-3 sm:grid-cols-2">
      <Campo
        rotulo="Nome da sala"
        name="nome"
        required
        maxLength={60}
        placeholder="Lab 1, Auditório…"
        className="sm:col-span-2"
      />
      <Campo
        rotulo="Largura (m)"
        name="largura"
        inputMode="decimal"
        required
        placeholder="8"
        dica="Trena, passos ou pisos do chão (um piso ≈ 0,6 m)."
      />
      <Campo
        rotulo="Profundidade (m)"
        name="profundidade"
        inputMode="decimal"
        required
        placeholder="6"
      />
      {pisos.length > 0 && (
        <Selecao
          rotulo="Piso"
          name="piso_id"
          defaultValue={pisos[0].id}
          className="sm:col-span-2"
          opcoes={[
            ...pisos.map((p) => ({ valor: p.id, rotulo: p.nome })),
            { valor: "", rotulo: "Outro piso (digite abaixo)" },
          ]}
        />
      )}
      {pisos.length > 0 && (
        <Campo
          rotulo="Novo piso"
          name="novo_piso"
          maxLength={60}
          placeholder="Só se escolheu “Outro piso”: 2º andar…"
          className="sm:col-span-2"
        />
      )}
      <div className="sm:col-span-2">
        <BotaoEnviar icone="mais_novo">Criar sala</BotaoEnviar>
      </div>
    </Formulario>
  );
}

export function FormNovoPiso() {
  return (
    <Formulario
      action={criarPiso}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <Campo
        rotulo="Novo piso"
        name="nome"
        required
        maxLength={60}
        placeholder="Térreo, 1º andar, Bloco B…"
        className="sm:flex-1"
      />
      <BotaoEnviar variante="secundario" icone="mais_novo" className="sm:mb-5">
        Criar piso
      </BotaoEnviar>
    </Formulario>
  );
}

/** Importar um desenho: colar o JSON (feito à mão ou por uma IA a partir de um rascunho). */
export function FormImportarMapa() {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(instrucoesParaIA());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-suave">
        <li>
          Desenhe as salas no papel ou no Paint (com as medidas, se souber) e
          tire uma foto.
        </li>
        <li>
          Copie as instruções abaixo e mande para uma IA (ChatGPT, Claude…){" "}
          <strong>junto com a foto</strong>.
        </li>
        <li>
          Cole aqui o JSON que ela devolver. O sistema confere tudo antes de
          importar.
        </li>
      </ol>
      <button
        type="button"
        onClick={() => void copiar()}
        className="btn-secundario min-h-9 px-3 text-xs"
      >
        <Icone nome={copiado ? "ok" : "copiar"} className="size-4" />{" "}
        {copiado ? "Instruções copiadas" : "Copiar instruções para a IA"}
      </button>
      <details className="text-xs text-suave">
        <summary className="cursor-pointer">Ver as instruções</summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-marca-fundo p-3 font-mono text-[11px] whitespace-pre-wrap">
          {instrucoesParaIA()}
        </pre>
      </details>
      <Formulario action={importarMapa} className="space-y-3">
        <AreaTexto
          rotulo="JSON do mapa"
          name="json"
          rows={6}
          required
          placeholder='{ "pisos": [ … ] }'
        />
        <CaixaMarcar
          name="substituir"
          rotulo="Substituir salas com o mesmo nome"
          dica="Sem marcar, uma sala que já existe faz a importação parar (nada muda)."
        />
        <BotaoEnviar icone="baixar">Importar mapa</BotaoEnviar>
      </Formulario>
    </div>
  );
}
