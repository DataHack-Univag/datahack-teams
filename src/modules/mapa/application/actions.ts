"use server";

import { z } from "zod";
import { modeloPorId, TIPOS, TIPOS_ELEMENTO, encaixar, type TipoElemento } from "@/modules/mapa/domain/catalogo";
import { conferirMapa, fileira, proximoRotulo, type MapaCanonico } from "@/modules/mapa/domain/tipos";
import * as repo from "@/modules/mapa/infra/repositorio";
import { sessaoAtual } from "@/modules/pessoas/application/sessao";
import { atualizarTelas, criarAcao } from "@/shared/acao/acao";
import { caixa, decimalOpcional, id, inteiroOpcional, texto, textoOpcional, umDe } from "@/shared/acao/campos";
import { falha, SEM_PERMISSAO, sucesso } from "@/shared/acao/resultado";
import { traduzirErro } from "@/shared/db/erros";

// Toda permissão real é do banco (só a organização da edição grava o mapa).

/** Medida em metros obrigatória (aceita vírgula), guardada em centímetros. */
const metros = (rotulo: string, min = 0.05, max = 100) =>
  decimalOpcional(rotulo, min, max)
    .refine((v) => v !== null, `Informe ${rotulo.toLowerCase()} em metros (ex.: 3,2).`)
    .transform((v) => Math.round(v! * 100));
const inteiro = z.coerce.number().int();
const rotacao = z.coerce.number().int().refine((v) => [0, 90, 180, 270].includes(v), "Giro inválido.");

const LIMPO = { ok: undefined };

// ---------------------------------------------------------------- pisos e salas

export const criarSala = criarAcao(
  z.object({
    nome: texto("o nome da sala", { max: 60 }),
    largura: metros("A largura", 1),
    profundidade: metros("A profundidade", 1),
    piso_id: z.string().optional(),
    novo_piso: textoOpcional(60),
  }),
  async (d) => {
    const { cliente, edicao } = await sessaoAtual();
    const mapa = await repo.carregarMapa(cliente, edicao.id);
    let pisoId = d.piso_id || null;
    // Sem piso escolhido: usa o piso novo digitado, ou cria o "Piso único" na primeira sala.
    if (!pisoId) {
      const nome = d.novo_piso || (mapa.pisos.length ? null : "Piso único");
      if (!nome) return falha("Escolha o piso da sala ou digite o nome de um piso novo.");
      const r = await repo.criarPiso(cliente, edicao.id, nome, mapa.pisos.length + 1);
      if (r.error) return falha(traduzirErro(r.error));
      pisoId = r.data.id;
    }
    const ordem = (mapa.pisos.find((p) => p.id === pisoId)?.salas.length ?? 0) + 1;
    const r = await repo.criarSala(cliente, edicao.id, { piso_id: pisoId, nome: d.nome, largura_cm: d.largura, profundidade_cm: d.profundidade, ordem });
    if (r.error) return falha(r.error.code === "23505" ? "Já existe uma sala com esse nome neste piso." : traduzirErro(r.error));
    atualizarTelas();
    return sucesso(`Sala “${d.nome}” criada. Abra para desenhar as bancadas.`);
  },
);

export const salvarSala = criarAcao(
  z.object({ id, nome: texto("o nome da sala", { max: 60 }), largura: metros("A largura", 1), profundidade: metros("A profundidade", 1) }),
  async (d) => {
    const { cliente } = await sessaoAtual();
    const { data, error } = await repo.atualizarSala(cliente, d.id, { nome: d.nome, largura_cm: d.largura, profundidade_cm: d.profundidade });
    if (error) return falha(error.code === "23505" ? "Já existe uma sala com esse nome neste piso." : traduzirErro(error));
    if (!data?.length) return SEM_PERMISSAO;
    atualizarTelas();
    return sucesso("Sala salva.");
  },
);

/** Imagem de fundo (já reduzida no navegador) ou vazio para tirar. */
export const salvarFundo = criarAcao(z.object({ id, fundo: z.string().max(2_000_000, "A imagem ficou grande demais. Use uma foto menor.") }), async (d) => {
  if (d.fundo && !d.fundo.startsWith("data:image/")) return falha("Escolha uma imagem (PNG, JPG ou WEBP).");
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.atualizarSala(cliente, d.id, { fundo: d.fundo || null });
  if (error) return falha(traduzirErro(error));
  if (!data?.length) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso(d.fundo ? "Imagem de fundo colocada. Desenhe as bancadas por cima." : "Imagem de fundo retirada.");
});

export const arquivarSala = criarAcao(z.object({ id, voltar: caixa }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.arquivarSala(cliente, d.id, !d.voltar);
  if (error) return falha(traduzirErro(error));
  if (!data?.length) return SEM_PERMISSAO;
  atualizarTelas();
  return d.voltar ? sucesso("Sala de volta ao mapa.") : sucesso("Sala retirada do mapa (fica no histórico).", { id: d.id, voltar: "1" });
});

export const criarPiso = criarAcao(z.object({ nome: texto("o nome do piso", { max: 60 }) }), async (d) => {
  const { cliente, edicao } = await sessaoAtual();
  const mapa = await repo.carregarMapa(cliente, edicao.id);
  const r = await repo.criarPiso(cliente, edicao.id, d.nome, mapa.pisos.length + 1);
  if (r.error) return falha(r.error.code === "23505" ? "Já existe um piso com esse nome." : traduzirErro(r.error));
  atualizarTelas();
  return sucesso(`Piso “${d.nome}” criado.`);
});

export const renomearPiso = criarAcao(z.object({ id, nome: texto("o nome do piso", { max: 60 }) }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.renomearPiso(cliente, d.id, d.nome);
  if (error) return falha(error.code === "23505" ? "Já existe um piso com esse nome." : traduzirErro(error));
  if (!data?.length) return SEM_PERMISSAO;
  atualizarTelas();
  return sucesso("Piso renomeado.");
});

export const arquivarPiso = criarAcao(z.object({ id, voltar: caixa }), async (d) => {
  const { cliente, edicao } = await sessaoAtual();
  if (!d.voltar) {
    const mapa = await repo.carregarMapa(cliente, edicao.id);
    if (mapa.pisos.find((p) => p.id === d.id)?.salas.length) return falha("Tire as salas deste piso antes (ou mude-as de piso).");
  }
  const { data, error } = await repo.arquivarPiso(cliente, d.id, !d.voltar);
  if (error) return falha(traduzirErro(error));
  if (!data?.length) return SEM_PERMISSAO;
  atualizarTelas();
  return d.voltar ? sucesso("Piso de volta.") : sucesso("Piso retirado.", { id: d.id, voltar: "1" });
});

// ---------------------------------------------------------------- elementos

/** Coloca um modelo do catálogo na sala (no ponto clicado ou no centro). */
export const adicionarModelo = criarAcao(
  z.object({ sala_id: id, modelo: z.string(), x: inteiro.optional(), y: inteiro.optional() }),
  async (d) => {
    const modelo = modeloPorId(d.modelo);
    if (!modelo) return falha("Modelo inválido. Recarregue a página.");
    const { cliente, edicao } = await sessaoAtual();
    const sala = await repo.buscarSala(cliente, d.sala_id);
    if (!sala) return falha("Sala não encontrada.");
    const mapa = await repo.carregarMapa(cliente, edicao.id);
    const rotulos = mapa.elementos.filter((e) => e.sala_id === sala.id).map((e) => e.rotulo);
    const x = d.x ?? (sala.largura_cm - modelo.largura_cm) / 2;
    const y = d.y ?? (sala.profundidade_cm - modelo.profundidade_cm) / 2;
    const { data, error } = await repo.criarElementos(cliente, edicao.id, sala.id, [
      {
        tipo: modelo.tipo,
        rotulo: modelo.tipo === "texto" ? "Legenda" : proximoRotulo(modelo.prefixo, rotulos),
        x_cm: Math.max(0, encaixar(x)),
        y_cm: Math.max(0, encaixar(y)),
        largura_cm: modelo.largura_cm,
        profundidade_cm: modelo.profundidade_cm,
        rotacao: 0,
        lugares: modelo.lugares ?? null,
      },
    ]);
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    return sucesso(`${modelo.nome} colocada na sala. Arraste para o lugar certo.`, { id: data[0].id });
  },
);

/** Arrastar no mapa: só a posição. */
export const moverElemento = criarAcao(z.object({ id, x: inteiro, y: inteiro }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.atualizarElemento(cliente, d.id, { x_cm: Math.max(0, d.x), y_cm: Math.max(0, d.y) });
  if (error) return falha(traduzirErro(error));
  if (!data?.length) return SEM_PERMISSAO;
  atualizarTelas();
  return LIMPO;
});

/** Painel do elemento: rótulo, medidas, giro, posição e lugares. */
export const salvarElemento = criarAcao(
  z.object({
    id,
    tipo: umDe(TIPOS_ELEMENTO, "Tipo inválido."),
    rotulo: textoOpcional(60),
    largura: metros("A largura"),
    profundidade: metros("A profundidade"),
    x: metros("A distância da parede da esquerda", 0),
    y: metros("A distância da parede do fundo", 0),
    rotacao,
    lugares: inteiroOpcional("Os lugares", 1, 20),
  }),
  async (d) => {
    const { cliente } = await sessaoAtual();
    const temLugares = TIPOS[d.tipo as TipoElemento].temLugares;
    const { data, error } = await repo.atualizarElemento(cliente, d.id, {
      rotulo: d.rotulo,
      largura_cm: d.largura,
      profundidade_cm: d.profundidade,
      x_cm: encaixar(d.x),
      y_cm: encaixar(d.y),
      rotacao: d.rotacao,
      lugares: temLugares ? (d.lugares ?? 1) : null,
    });
    if (error) return falha(traduzirErro(error));
    if (!data?.length) return SEM_PERMISSAO;
    atualizarTelas();
    return sucesso("Salvo no mapa.");
  },
);

export const girarElemento = criarAcao(z.object({ id, rotacao }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.atualizarElemento(cliente, d.id, { rotacao: d.rotacao });
  if (error) return falha(traduzirErro(error));
  if (!data?.length) return SEM_PERMISSAO;
  atualizarTelas();
  return LIMPO;
});

export const duplicarElemento = criarAcao(z.object({ id, sala_id: id }), async (d) => {
  const { cliente, edicao } = await sessaoAtual();
  const mapa = await repo.carregarMapa(cliente, edicao.id);
  const daSala = mapa.elementos.filter((e) => e.sala_id === d.sala_id);
  const original = daSala.find((e) => e.id === d.id);
  if (!original) return falha("Elemento não encontrado. Recarregue a página.");
  const prefixo = original.rotulo?.match(/^([A-Za-z]+)\d+$/)?.[1];
  const { tipo, largura_cm, profundidade_cm, rotacao: giro, lugares } = original;
  const { data, error } = await repo.criarElementos(cliente, edicao.id, d.sala_id, [
    { tipo, largura_cm, profundidade_cm, rotacao: giro, lugares, rotulo: prefixo ? proximoRotulo(prefixo, daSala.map((e) => e.rotulo)) : original.rotulo, x_cm: original.x_cm + 20, y_cm: original.y_cm + 20 },
  ]);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso("Cópia colocada ao lado. Arraste para o lugar.", { id: data[0].id });
});

/** Tirar do mapa (arquiva; o "desfazer" traz de volta). Também desfaz a criação. */
export const removerElemento = criarAcao(z.object({ id, voltar: caixa }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.arquivarElemento(cliente, d.id, !d.voltar);
  if (error) return falha(traduzirErro(error));
  if (!data?.length) return SEM_PERMISSAO;
  atualizarTelas();
  return d.voltar ? sucesso("De volta ao mapa.") : sucesso("Tirado do mapa.", { id: d.id, voltar: "1" });
});

/** Várias peças iguais de uma vez, numeradas (B1, B2...). */
export const criarFileira = criarAcao(
  z.object({
    sala_id: id,
    modelo: z.string(),
    quantidade: z.coerce.number().int().min(1, "Pelo menos 1.").max(30, "No máximo 30 de uma vez."),
    direcao: z.enum(["horizontal", "vertical"]),
    espaco: metros("O espaço entre elas", 0, 10),
    x: metros("A distância da parede da esquerda", 0),
    y: metros("A distância da parede do fundo", 0),
  }),
  async (d) => {
    const modelo = modeloPorId(d.modelo);
    if (!modelo) return falha("Modelo inválido. Recarregue a página.");
    const { cliente, edicao } = await sessaoAtual();
    const sala = await repo.buscarSala(cliente, d.sala_id);
    if (!sala) return falha("Sala não encontrada.");
    const mapa = await repo.carregarMapa(cliente, edicao.id);
    const novos = fileira({
      modelo,
      quantidade: d.quantidade,
      direcao: d.direcao,
      espacoCm: d.espaco,
      xCm: d.x,
      yCm: d.y,
      rotulos: mapa.elementos.filter((e) => e.sala_id === sala.id).map((e) => e.rotulo),
    });
    const fora = novos.filter((e) => e.x_cm + e.largura_cm > sala.largura_cm || e.y_cm + e.profundidade_cm > sala.profundidade_cm).length;
    if (fora) return falha(`${fora} de ${novos.length} ficariam fora da sala. Diminua a quantidade ou o espaço, ou comece mais perto do canto.`);
    const { error } = await repo.criarElementos(cliente, edicao.id, sala.id, novos);
    if (error) return falha(traduzirErro(error));
    atualizarTelas();
    return sucesso(`${novos.length} × ${modelo.nome.toLowerCase()} colocadas (${novos[0].rotulo ?? ""}${novos.length > 1 ? ` a ${novos[novos.length - 1].rotulo ?? ""}` : ""}).`);
  },
);

// ---------------------------------------------------------------- equipes no mapa

/** Põe a equipe num lugar; se estava ocupado, as duas trocam (o banco faz a troca). */
export const alocarEquipe = criarAcao(z.object({ equipe_id: id, elemento_id: id, lugar: z.coerce.number().int().min(1), nome: z.string().optional(), onde: z.string().optional() }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { data, error } = await repo.alocarEquipe(cliente, d.equipe_id, d.elemento_id, d.lugar);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  const r = (data ?? {}) as { mudou?: boolean; trocou_com?: string; sem_lugar?: string };
  if (!r.mudou) return LIMPO;
  const base = `${d.nome || "Equipe"} → ${d.onde || "novo lugar"}.`;
  return sucesso(r.trocou_com ? `${base} Trocou de lugar com a ${r.trocou_com}.` : r.sem_lugar ? `${base} A ${r.sem_lugar} ficou sem lugar.` : base);
});

export const desalocarEquipe = criarAcao(z.object({ equipe_id: id, nome: z.string().optional() }), async (d) => {
  const { cliente } = await sessaoAtual();
  const { error } = await repo.desalocarEquipe(cliente, d.equipe_id);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  return sucesso(`${d.nome || "Equipe"} ficou sem lugar no mapa.`);
});

// ---------------------------------------------------------------- importar

export const importarMapa = criarAcao(z.object({ json: z.string().min(2, "Cole o JSON do mapa."), substituir: caixa }), async (d) => {
  let mapa: MapaCanonico;
  try {
    mapa = JSON.parse(d.json.trim().replace(/^```(json)?|```$/g, ""));
  } catch {
    return falha("O texto colado não é um JSON válido. Copie só o JSON (de { até }), sem texto antes ou depois.");
  }
  const erros = conferirMapa(mapa);
  if (erros.length) return falha(`O mapa tem problemas: ${erros.join(" ")}`);
  const { cliente, edicao } = await sessaoAtual();
  const { data, error } = await repo.importarMapa(cliente, edicao.id, mapa, d.substituir);
  if (error) return falha(traduzirErro(error));
  atualizarTelas();
  const r = data as { pisos: number; salas: number; elementos: number };
  return sucesso(`Mapa importado: ${r.salas} sala(s) e ${r.elementos} elemento(s)${r.pisos ? `, ${r.pisos} piso(s) novo(s)` : ""}.`);
});
