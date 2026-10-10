"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizarRepo, repoEhPublico } from "@/lib/github";
import { CATEGORIAS, CATEGORIAS_MATERIAL, type Resultado } from "@/lib/tipos";

// Toda autorização real é feita pelo RLS do Supabase; estas actions só validam
// a entrada, traduzem os erros e atualizam a tela.

type ErroPg = { code?: string; message: string };

function traduzirErro(e: ErroPg): string {
  if (e.code === "P0001") return e.message; // raise exception das funções SQL (já em PT-BR)
  if (e.code === "23505") {
    if (e.message.includes("equipes_nome_unico")) return "Já existe uma equipe com esse nome.";
    if (e.message.includes("membros_pkey")) return "Essa pessoa já está em uma equipe.";
    return "Registro duplicado.";
  }
  if (e.code === "23514") return "Valor inválido. Confira o formato dos campos.";
  if (e.code === "23503") return "Referência inválida (e-mail não está na lista de inscritos?).";
  if (e.code === "42501") return "Você não tem permissão para fazer isso.";
  return "Erro inesperado: " + e.message;
}

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function atualizar() {
  revalidatePath("/", "layout");
}

const SEM_PERMISSAO: Resultado = {
  erro: "Nada foi alterado: sem permissão ou edição bloqueada pela organização.",
};

const ERRO_REPO = {
  erro: "Informe um link válido de repositório: https://github.com/usuario/repositorio",
};

function carimboVerificacao(publico: boolean | null) {
  return {
    repo_publico: publico,
    repo_verificado_em: publico === null ? null : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- equipe

export async function criarEquipe(_: Resultado, fd: FormData): Promise<Resultado> {
  const nome = txt(fd, "nome");
  const repo = normalizarRepo(txt(fd, "repo_github"));
  if (nome.length < 2) return { erro: "Informe o nome da equipe." };
  if (!repo) return ERRO_REPO;

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("criar_equipe", { p_nome: nome, p_repo: repo });
  if (error) return { erro: traduzirErro(error) };

  // Checagem de repositório público é informativa: não impede a criação.
  const publico = await repoEhPublico(repo);
  await supabase.from("equipes").update(carimboVerificacao(publico)).eq("id", id);

  atualizar();
  if (txt(fd, "redirecionar") === "admin") redirect(`/admin/equipes/${id}`);
  return { ok: "Equipe criada!" };
}

export async function atualizarEquipe(_: Resultado, fd: FormData): Promise<Resultado> {
  const id = txt(fd, "id");
  const nome = txt(fd, "nome");
  const repo = normalizarRepo(txt(fd, "repo_github"));
  if (nome.length < 2) return { erro: "Informe o nome da equipe." };
  if (!repo) return ERRO_REPO;

  // Só consulta o GitHub (lento) se o link do repositório mudou.
  const mudouRepo = repo !== normalizarRepo(txt(fd, "repo_atual"));
  const dados = mudouRepo
    ? { nome, repo_github: repo, ...carimboVerificacao(await repoEhPublico(repo)) }
    : { nome };
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipes").update(dados).eq("id", id).select("id");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;

  atualizar();
  return { ok: "Dados salvos." };
}

export async function verificarRepo(_: Resultado, fd: FormData): Promise<Resultado> {
  const id = txt(fd, "id");
  const supabase = await createClient();
  const { data: eq } = await supabase
    .from("equipes")
    .select("repo_github")
    .eq("id", id)
    .maybeSingle<{ repo_github: string | null }>();
  if (!eq) return { erro: "Equipe não encontrada." };
  if (!eq.repo_github) return { erro: "Cadastre o repositório primeiro." };

  const publico = await repoEhPublico(eq.repo_github);
  if (publico === null) {
    return { erro: "Não foi possível consultar o GitHub agora. Tente em alguns minutos." };
  }

  const { data } = await supabase
    .from("equipes")
    .update(carimboVerificacao(publico))
    .eq("id", id)
    .select("id");
  if (!data?.length) return SEM_PERMISSAO;

  atualizar();
  return publico
    ? { ok: "Repositório público encontrado." }
    : { erro: "Repositório não encontrado ou privado. No GitHub: Settings → General → Danger Zone → Change visibility → Public." };
}

export async function excluirEquipe(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipes")
    .delete()
    .eq("id", txt(fd, "id"))
    .select("id");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;
  atualizar();
  redirect("/admin");
}

/** Grava as equipes montadas pelo gerador (RPC aplicar_equipes). */
export async function aplicarEquipes(
  equipes: { nome: string; emails: string[] }[],
  substituir: boolean,
): Promise<Resultado> {
  if (!equipes.length) return { erro: "Nenhuma equipe para salvar." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aplicar_equipes", {
    p_equipes: equipes,
    p_substituir: substituir,
  });
  if (error) return { erro: traduzirErro(error) };
  atualizar();
  return { ok: `${data} equipe(s) salvas. Os alunos já veem a equipe ao entrar e devem cadastrar o repositório.` };
}

// ---------------------------------------------------------------- membros

export async function adicionarMembro(_: Resultado, fd: FormData): Promise<Resultado> {
  const email = txt(fd, "email").toLowerCase();
  if (!email) return { erro: "Escolha um integrante." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("membros")
    .insert({ email, equipe_id: txt(fd, "equipe_id") });
  if (error) return { erro: traduzirErro(error) };

  atualizar();
  return { ok: "Integrante adicionado." };
}

export async function removerMembro(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membros")
    .delete()
    .eq("email", txt(fd, "email"))
    .eq("equipe_id", txt(fd, "equipe_id"))
    .select("email");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;

  atualizar();
  return { ok: "Integrante removido." };
}

/** Define (ou tira) o líder. Qualquer integrante da equipe pode escolher. */
export async function definirLider(_: Resultado, fd: FormData): Promise<Resultado> {
  const lider = txt(fd, "email") || null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipes")
    .update({ lider_email: lider })
    .eq("id", txt(fd, "equipe_id"))
    .select("id");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;

  atualizar();
  return { ok: lider ? "Líder definido." : "A equipe ficou sem líder." };
}

// ---------------------------------------------------------------- trocas de equipe
// "como": e-mail do aluno em nome de quem o organizador age no "ver como aluno"
// (o banco ignora para alunos).

export async function pedirTroca(_: Resultado, fd: FormData): Promise<Resultado> {
  const destino = txt(fd, "equipe_destino");
  if (!destino) return { erro: "Escolha a equipe para onde quer ir." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("pedir_troca", {
    p_destino: destino,
    p_mensagem: txt(fd, "mensagem").slice(0, 200) || null,
    p_como: txt(fd, "como") || null,
  });
  if (error) return { erro: traduzirErro(error) };
  atualizar();
  return { ok: "Pedido enviado. Aguarde alguém da equipe aceitar." };
}

export async function cancelarTroca(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_troca", { p_pedido: txt(fd, "id"), p_como: txt(fd, "como") || null });
  if (error) return { erro: traduzirErro(error) };
  atualizar();
  return { ok: "Pedido cancelado." };
}

export async function recusarTroca(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("recusar_troca", { p_pedido: txt(fd, "id"), p_como: txt(fd, "como") || null });
  if (error) return { erro: traduzirErro(error) };
  atualizar();
  return { ok: "Pedido recusado." };
}

export async function aceitarTroca(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aceitar_troca", {
    p_pedido: txt(fd, "id"),
    p_como: txt(fd, "como") || null,
  });
  if (error) return { erro: traduzirErro(error) };
  atualizar();
  return data === "ok" ? { ok: "Troca feita! Você está na nova equipe." } : { erro: String(data) };
}

// ---------------------------------------------------------------- links

export async function adicionarLink(_: Resultado, fd: FormData): Promise<Resultado> {
  const categoria = txt(fd, "categoria");
  const titulo = txt(fd, "titulo") || null;
  let url = txt(fd, "url");
  if (!CATEGORIAS.some((c) => c.valor === categoria)) return { erro: "Escolha uma categoria." };
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    new URL(url);
  } catch {
    return { erro: "Informe uma URL válida." };
  }

  const supabase = await createClient();
  const { data: email } = await supabase.rpc("email_atual");
  const { error } = await supabase
    .from("links")
    .insert({ equipe_id: txt(fd, "equipe_id"), categoria, titulo, url, criado_por: email });
  if (error) return { erro: traduzirErro(error) };

  atualizar();
  return { ok: "Link adicionado." };
}

export async function removerLink(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("links")
    .delete()
    .eq("id", txt(fd, "id"))
    .select("id");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;

  atualizar();
  return { ok: "Link removido." };
}

// ---------------------------------------------------------------- organização

export async function salvarConfiguracao(_: Resultado, fd: FormData): Promise<Resultado> {
  const max = Number(txt(fd, "max_membros"));
  if (!Number.isInteger(max) || max < 1 || max > 20) {
    return { erro: "O limite deve ser entre 1 e 20." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracao")
    .update({ max_membros: max, edicao_bloqueada: fd.get("edicao_bloqueada") === "on" })
    .eq("id", 1)
    .select("id");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;

  atualizar();
  return { ok: "Configuração salva." };
}

// ---------------------------------------------------------------- participantes

/** Cria ou edita um participante (inscrito + nota). "email_original" indica edição. */
export async function salvarParticipante(_: Resultado, fd: FormData): Promise<Resultado> {
  const original = txt(fd, "email_original").toLowerCase();
  const email = txt(fd, "email").toLowerCase();
  const nome = txt(fd, "nome");
  const curso = txt(fd, "curso").toUpperCase() || null;
  const semestreTxt = txt(fd, "semestre");
  const notaTxt = txt(fd, "nota").replace(",", ".");
  const papel = txt(fd, "papel") === "organizador" ? "organizador" : "aluno";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "E-mail inválido." };
  if (!nome) return { erro: "Informe o nome." };
  const semestre = semestreTxt ? Number(semestreTxt) : null;
  if (semestre !== null && (!Number.isInteger(semestre) || semestre < 1 || semestre > 12)) {
    return { erro: "Semestre deve ser um número de 1 a 12." };
  }
  const nota = notaTxt ? Number(notaTxt) : null;
  if (nota !== null && (isNaN(nota) || nota < 0 || nota > 10)) return { erro: "Nota deve ficar entre 0 e 10." };

  // "upsert" (aba Organizadores): promove quem já está na lista sem dar erro de duplicado.
  const upsert = txt(fd, "upsert") === "1";

  const supabase = await createClient();
  const dados = { email, nome, curso, semestre, papel };
  const { error } = original
    ? await supabase.from("inscritos").update(dados).eq("email", original)
    : upsert
      ? await supabase.from("inscritos").upsert(dados, { onConflict: "email" })
      : await supabase.from("inscritos").insert(dados);
  if (error) {
    if (error.code === "23505") return { erro: "Já existe um participante com esse e-mail." };
    return { erro: traduzirErro(error) };
  }

  // 0 ou vazio = sem nota (ex.: calouro). No modo upsert, nota vazia não apaga a existente.
  if (!(upsert && !notaTxt)) {
    const { error: erroNota } = await supabase
      .from("notas")
      .upsert({ email, nota: nota ? nota : null }, { onConflict: "email" });
    if (erroNota) return { erro: traduzirErro(erroNota) };
  }

  atualizar();
  return { ok: original ? "Participante atualizado." : `${nome} cadastrado(a). Já pode criar a senha no primeiro acesso.` };
}

export async function removerParticipante(_: Resultado, fd: FormData): Promise<Resultado> {
  const email = txt(fd, "email");
  const supabase = await createClient();
  const { data: eu } = await supabase.rpc("email_atual");
  if (email === eu) return { erro: "Você não pode remover a si mesmo." };

  const { data, error } = await supabase.from("inscritos").delete().eq("email", email).select("email");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;

  atualizar();
  return { ok: "Participante removido da lista. A conta de login dele deixa de ter acesso." };
}

/** Rebaixa organizador para aluno (ou remove, se preferir, em Participantes). */
export async function alterarPapel(_: Resultado, fd: FormData): Promise<Resultado> {
  const email = txt(fd, "email");
  const papel = txt(fd, "papel") === "organizador" ? "organizador" : "aluno";
  const supabase = await createClient();
  const { data: eu } = await supabase.rpc("email_atual");
  if (email === eu && papel !== "organizador") return { erro: "Você não pode tirar o seu próprio acesso." };

  const { data, error } = await supabase.from("inscritos").update({ papel }).eq("email", email).select("email");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;

  atualizar();
  return { ok: papel === "organizador" ? "Agora é organizador." : "Acesso de organizador removido." };
}

// ---------------------------------------------------------------- materiais

export async function salvarMaterial(_: Resultado, fd: FormData): Promise<Resultado> {
  const id = txt(fd, "id");
  const titulo = txt(fd, "titulo");
  const descricao = txt(fd, "descricao") || null;
  const categoria = txt(fd, "categoria");
  const destaque = fd.get("destaque") === "on";
  let url = txt(fd, "url");
  if (titulo.length < 2) return { erro: "Informe o título." };
  if (!CATEGORIAS_MATERIAL.some((c) => c.valor === categoria)) return { erro: "Escolha uma categoria." };
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    new URL(url);
  } catch {
    return { erro: "Informe uma URL válida." };
  }

  const supabase = await createClient();
  const dados = { titulo, descricao, categoria, url, destaque };
  let error;
  if (id) {
    ({ error } = await supabase.from("materiais").update(dados).eq("id", id));
  } else {
    const { data: email } = await supabase.rpc("email_atual");
    ({ error } = await supabase.from("materiais").insert({ ...dados, criado_por: email }));
  }
  if (error) return { erro: traduzirErro(error) };

  atualizar();
  return { ok: id ? "Material atualizado." : "Material publicado. Os alunos já podem ver." };
}

export async function removerMaterial(_: Resultado, fd: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("materiais").delete().eq("id", txt(fd, "id")).select("id");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return SEM_PERMISSAO;
  atualizar();
  return { ok: "Material removido." };
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
