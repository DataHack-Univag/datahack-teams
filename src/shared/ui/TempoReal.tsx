"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { clienteNavegador } from "@/shared/db/navegador";
import { agruparAvisos, casaRegra, chaveDoAviso, type Assinatura, type RegraAviso } from "@/shared/lib/tempoReal";
import { useToast } from "@/shared/ui/Toast";

// Uma atualização só para a tela inteira, mesmo com vários canais abertos (layout + página).
let espera: ReturnType<typeof setTimeout> | undefined;
let atualizarAgora: (() => void) | undefined;

/** Ocupada: digitando ou com uma janela aberta. Atualiza assim que ela terminar. */
const ocupada = () => {
  const ativo = document.activeElement;
  return (!!ativo && ["INPUT", "TEXTAREA", "SELECT"].includes(ativo.tagName)) || !!document.querySelector("dialog[open]");
};

function agendar(refresh: () => void, ms = 400) {
  atualizarAgora = refresh;
  clearTimeout(espera);
  espera = setTimeout(function tentar() {
    if (document.hidden) return; // a aba escondida confere quando voltar
    if (ocupada()) {
      espera = setTimeout(tentar, 1500);
      return;
    }
    atualizarAgora?.();
  }, ms);
}

// Avisos já mostrados nesta aba (a mesma linha não avisa duas vezes).
const avisados = new Set<string>();

/**
 * Tela ao vivo (Supabase Realtime): quando uma linha acompanhada muda no banco, a tela se
 * atualiza na hora e, se a mudança casar com uma regra, mostra um aviso ("Nova inscrição
 * recebida", com "Ver") — heurística 1. Não atualiza no meio da digitação nem com janela
 * aberta. Se o canal não abrir (rede, Realtime desligado), confere a cada `reserva` segundos.
 * As permissões do banco valem: cada pessoa só recebe mudanças do que já podia ver.
 */
export function TempoReal({ assinaturas, avisos = [], reserva = 20 }: { assinaturas: Assinatura[]; avisos?: RegraAviso[]; reserva?: number }) {
  const router = useRouter();
  const mostrar = useToast();
  // Regras e assinaturas chegam do servidor a cada atualização: compara pelo conteúdo.
  const chave = JSON.stringify(assinaturas);
  const regras = useRef(avisos);
  useEffect(() => {
    regras.current = avisos;
  }, [avisos]);

  useEffect(() => {
    const lista: Assinatura[] = JSON.parse(chave);
    const supabase = clienteNavegador();
    const refresh = () => router.refresh();
    let plano: ReturnType<typeof setInterval> | undefined;
    let fila: RegraAviso[] = [];
    let juntar: ReturnType<typeof setTimeout> | undefined;

    const avisar = (regra: RegraAviso) => {
      fila.push(regra);
      clearTimeout(juntar);
      juntar = setTimeout(() => {
        for (const a of agruparAvisos(fila))
          mostrar(a.texto, { tom: "info", segundos: 7, acao: a.link ? { rotulo: "Ver", executar: () => router.push(a.link!) } : undefined });
        fila = [];
      }, 800);
    };

    const aoMudar = (p: { table: string; eventType: string; new: Record<string, unknown> }) => {
      agendar(refresh);
      const m = { tabela: p.table, evento: p.eventType, linha: p.new ?? {} };
      for (const r of regras.current) {
        if (!casaRegra(r, m)) continue;
        const k = chaveDoAviso(r, m);
        if (avisados.has(k)) continue;
        avisados.add(k);
        avisar(r);
      }
    };
    const planoB = () => {
      if (!plano) plano = setInterval(() => !document.hidden && !ocupada() && refresh(), reserva * 1000);
    };

    let canal: ReturnType<typeof supabase.channel> | undefined;
    let ativo = true;
    void (async () => {
      // O canal precisa do login da pessoa para o banco aplicar as permissões.
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (!ativo) return; // a tela saiu antes do canal abrir
      // Nome único por montagem: o React pode montar duas vezes e o canal não é reaproveitado.
      let c = supabase.channel(`ao-vivo:${Math.random().toString(36).slice(2)}`);
      for (const a of lista)
        c = c.on("postgres_changes", { event: "*", schema: "public", table: a.tabela, ...(a.filtro ? { filter: a.filtro } : {}) }, aoMudar);
      canal = c.subscribe((estado) => {
        if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT" || estado === "CLOSED") planoB();
      });
    })();

    // Voltou para a aba depois de um tempo: confere na hora.
    const voltou = () => !document.hidden && agendar(refresh, 0);
    document.addEventListener("visibilitychange", voltou);
    return () => {
      ativo = false;
      clearTimeout(juntar);
      clearInterval(plano);
      document.removeEventListener("visibilitychange", voltou);
      if (canal) void supabase.removeChannel(canal);
    };
  }, [router, mostrar, chave, reserva]);

  return null;
}
