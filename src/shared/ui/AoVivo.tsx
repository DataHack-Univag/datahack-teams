"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { clienteNavegador } from "@/shared/db/navegador";

/**
 * Atualiza a tela na hora em que uma linha do banco muda (Supabase Realtime), sem a pessoa
 * recarregar nada (heurística 1). Ex.: a inscrição foi aprovada, o check-in foi feito.
 * Se o canal não abrir (rede, Realtime desligado), volta a conferir a cada `reserva` segundos.
 */
export function AoVivo({ tabela, filtro, reserva = 20 }: { tabela: "inscricoes" | "participacoes"; filtro: string; reserva?: number }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = clienteNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    let plano: ReturnType<typeof setInterval> | undefined;
    // Várias mudanças seguidas viram uma atualização só.
    const atualizar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => router.refresh(), 300);
    };
    const planoB = () => {
      if (!plano) plano = setInterval(() => !document.hidden && router.refresh(), reserva * 1000);
    };

    let canal: ReturnType<typeof supabase.channel> | undefined;
    let ativo = true;
    void (async () => {
      // O canal precisa do login da pessoa para o banco aplicar as permissões.
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (!ativo) return; // a tela saiu antes do canal abrir
      // Nome único por montagem: o React pode montar duas vezes e o canal não é reaproveitado.
      canal = supabase
        .channel(`ao-vivo:${tabela}:${filtro}:${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: tabela, filter: filtro }, atualizar)
        .subscribe((estado) => {
          if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT" || estado === "CLOSED") planoB();
        });
    })();

    // Voltou para a aba depois de um tempo: confere na hora.
    const voltou = () => !document.hidden && router.refresh();
    document.addEventListener("visibilitychange", voltou);
    return () => {
      ativo = false;
      clearTimeout(espera);
      clearInterval(plano);
      document.removeEventListener("visibilitychange", voltou);
      if (canal) void supabase.removeChannel(canal);
    };
  }, [router, tabela, filtro, reserva]);

  return null;
}
