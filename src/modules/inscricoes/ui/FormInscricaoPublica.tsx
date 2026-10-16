"use client";

import { useState } from "react";
import { inscrever } from "@/modules/inscricoes/application/actions";
import { limparRespostas, validarRespostas, type Respostas } from "@/modules/inscricoes/domain/campos";
import { limparNome, problemaNoNome, type EdicaoPublica } from "@/modules/inscricoes/domain/publica";
import { FormularioDinamico } from "@/modules/inscricoes/ui/FormularioDinamico";
import { CampoSenha } from "@/shared/ui/CampoSenha";
import { BotaoEnviar, Formulario, Ocultos } from "@/shared/ui/Formulario";

/**
 * Formulário público de inscrição: nome, e-mail, senha (a conta para acompanhar a inscrição)
 * e as perguntas que a organização escolheu. Confere tudo na tela antes de enviar
 * (heurísticas 5 e 9); o banco confere de novo.
 */
export function FormInscricaoPublica({ edicao, logado }: { edicao: EdicaoPublica; logado: string | null }) {
  const [respostas, setRespostas] = useState<Respostas>({});
  const [tentou, setTentou] = useState(false);
  const [termo, setTermo] = useState(false);
  // Campos controlados: depois de um erro do servidor, o que a pessoa digitou continua lá.
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const erroNome = tentou ? problemaNoNome(nome) : null;
  const opcoes = { instituicoes: edicao.instituicoes.map((i) => i.id), aceitaOutra: edicao.acesso !== "instituicoes" };
  const erros = tentou ? validarRespostas(edicao.campos, respostas, opcoes) : {};
  const pacote = JSON.stringify(limparRespostas(edicao.campos, respostas));

  return (
    <Formulario action={inscrever} className="flex flex-col gap-6">
      <Ocultos valores={{ slug: edicao.slug, respostas: pacote, termo: termo && edicao.termo ? String(edicao.termo.versao) : "" }} />
      {/* Armadilha para robôs: invisível para pessoas e leitores de tela. */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <fieldset className="space-y-3">
        <legend className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Seus dados</legend>
        <label className="block">
          <span className="rotulo">Nome completo</span>
          <input
            name="nome"
            required
            minLength={3}
            maxLength={120}
            autoComplete="name"
            className="campo"
            placeholder="Nome e sobrenome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => setNome((n) => limparNome(n))}
            aria-invalid={!!erroNome || undefined}
            aria-describedby={erroNome ? "erro-nome" : undefined}
          />
          {erroNome && (
            <span id="erro-nome" role="alert" className="mt-1 block text-xs font-medium text-red-600 dark:text-red-400">
              {erroNome}
            </span>
          )}
        </label>
        {logado ? (
          <>
            <input type="hidden" name="email" value={logado} />
            <p className="rounded-xl bg-marca-fundo p-3 text-sm">
              Inscrevendo com a sua conta: <strong>{logado}</strong>
            </p>
          </>
        ) : (
          <>
            <label className="block">
              <span className="rotulo">E-mail</span>
              <input name="email" type="email" required autoComplete="email" className="campo" placeholder="nome@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <span className="mt-1 block text-xs text-suave">Pode ser o seu e-mail pessoal. É com ele que você entra no sistema.</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoSenha label="Crie uma senha" name="senha" required minLength={6} autoComplete="new-password" />
              <CampoSenha label="Repita a senha" name="confirma" required minLength={6} autoComplete="new-password" />
            </div>
            <p className="text-xs text-suave">Já participou de outra edição? Use o mesmo e-mail e a mesma senha de antes.</p>
          </>
        )}
      </fieldset>

      {edicao.campos.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Sobre você</legend>
          <FormularioDinamico
            campos={edicao.campos}
            valores={respostas}
            aoMudar={(k, v) => setRespostas((r) => ({ ...Object.fromEntries(Object.entries(r).filter(([x]) => x !== k)), ...(v === undefined ? {} : { [k]: v }) }))}
            erros={erros}
            instituicoes={edicao.instituicoes}
            aceitaOutra={opcoes.aceitaOutra}
          />
        </fieldset>
      )}

      {edicao.termo && (
        <fieldset className="space-y-2 rounded-xl border border-borda p-3">
          <legend className="px-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-suave uppercase">Uso dos seus dados</legend>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-marca">Ler o termo (versão {edicao.termo.versao})</summary>
            <p className="mt-2 max-h-60 overflow-y-auto text-sm whitespace-pre-line text-suave">{edicao.termo.texto}</p>
          </details>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={termo} onChange={(e) => setTermo(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]" />
            <span>Li e aceito o termo de uso dos dados.</span>
          </label>
          {tentou && !termo && (
            <span role="alert" className="block text-xs font-medium text-red-600 dark:text-red-400">
              Marque para continuar.
            </span>
          )}
        </fieldset>
      )}

      {/* Antes de enviar: confere na tela e só deixa ir se estiver tudo certo. */}
      <div
        onClickCapture={(ev) => {
          setTentou(true);
          const problemas = problemaNoNome(nome) || Object.keys(validarRespostas(edicao.campos, respostas, opcoes)).length || (edicao.termo && !termo);
          if (problemas) {
            ev.preventDefault();
            ev.stopPropagation();
            requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")?.scrollIntoView({ block: "center" }));
          }
        }}
      >
        <BotaoEnviar icone="ok" className="w-full sm:w-auto" enviando="Enviando inscrição…">
          {edicao.aprovacao === "automatica" && edicao.vagas !== null && edicao.aprovadas >= edicao.vagas ? "Entrar na lista de espera" : "Fazer inscrição"}
        </BotaoEnviar>
      </div>
    </Formulario>
  );
}
