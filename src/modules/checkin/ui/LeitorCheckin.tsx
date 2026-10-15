"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { checkinPorCodigo } from "@/modules/checkin/application/actions";
import type { ResultadoCheckin } from "@/modules/checkin/infra/repositorio";
import { Icone } from "@/shared/ui/Icone";

type Leitura = { quando: number; codigo: string } & ({ ok: true; pessoa: ResultadoCheckin } | { ok: false; erro: string });

// Leitor nativo do navegador (Chrome/Edge no Android); no iPhone, o jsQR lê os quadros do vídeo.
type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
const detectorNativo = (): Detector | null => {
  const D = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  return D ? new D({ formats: ["qr_code"] }) : null;
};

/**
 * Check-in na entrada: a câmera lê o QR de cada participante e a tela diz na hora quem é e se
 * já estava presente (heurística 1), com som/vibração. Dá para digitar o código quando a câmera
 * não lê (heurística 7). A mesma leitura em seguida não conta duas vezes.
 */
export function LeitorCheckin() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fluxo = useRef<MediaStream | null>(null);
  const ultimo = useRef<{ codigo: string; em: number } | null>(null);
  const ocupado = useRef(false);
  const [ligada, setLigada] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [digitado, setDigitado] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function registrar(bruto: string) {
    const codigo = bruto.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const agora = Date.now();
    if (ocupado.current || (ultimo.current?.codigo === codigo && agora - ultimo.current.em < 4000)) return;
    ocupado.current = true;
    ultimo.current = { codigo, em: agora };
    setEnviando(true);
    try {
      const r = await checkinPorCodigo(codigo);
      setLeituras((ls) => [{ quando: agora, codigo, ...r }, ...ls].slice(0, 20));
      navigator.vibrate?.(r.ok ? (r.pessoa.ja_estava ? [60, 80, 60] : 120) : [200, 100, 200]);
    } catch {
      setLeituras((ls) => [{ quando: agora, codigo, ok: false as const, erro: "Sem conexão. Tente de novo." }, ...ls].slice(0, 20));
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  }

  function desligar() {
    fluxo.current?.getTracks().forEach((t) => t.stop());
    fluxo.current = null;
    setLigada(false);
  }

  async function ligar() {
    setErroCamera(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      fluxo.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play();
      }
      setLigada(true);
    } catch {
      setErroCamera("Não deu para abrir a câmera. Permita o acesso à câmera no navegador (o site precisa estar em https) ou digite o código abaixo.");
    }
  }

  // Lê um quadro a cada 250 ms enquanto a câmera está ligada.
  useEffect(() => {
    if (!ligada) return;
    const nativo = detectorNativo();
    let parar = false;
    const ler = async () => {
      if (parar) return;
      const v = video.current;
      if (v && v.readyState >= 2 && !ocupado.current) {
        let texto: string | null = null;
        if (nativo) {
          texto = (await nativo.detect(v).catch(() => []))[0]?.rawValue ?? null;
        } else if (canvas.current) {
          const c = canvas.current;
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(v, 0, 0);
            texto = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data ?? null;
          }
        }
        if (texto) await registrar(texto);
      }
      setTimeout(ler, 250);
    };
    ler();
    return () => {
      parar = true;
    };
  }, [ligada]);

  // Sai da tela: desliga a câmera.
  useEffect(() => () => fluxo.current?.getTracks().forEach((t) => t.stop()), []);

  const atual = leituras[0];
  const presentes = leituras.filter((l) => l.ok && !l.pessoa.ja_estava).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="card space-y-3">
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={video} playsInline muted className={`aspect-[4/3] w-full object-cover ${ligada ? "" : "opacity-0"}`} />
          <canvas ref={canvas} className="hidden" />
          {ligada ? (
            <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/.35)]" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
              <div className="space-y-3">
                <Icone nome="qr" className="mx-auto size-10" />
                <p className="text-sm">Aponte a câmera para o QR de entrada do participante.</p>
                <button type="button" onClick={() => void ligar()} className="btn-primario">
                  Abrir câmera
                </button>
              </div>
            </div>
          )}
        </div>
        {ligada && (
          <button type="button" onClick={desligar} className="btn-secundario min-h-9 px-3 text-xs">
            <Icone nome="fechar" className="size-4" /> Fechar câmera
          </button>
        )}
        {erroCamera && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {erroCamera}
          </p>
        )}

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (digitado.trim()) void registrar(digitado).then(() => setDigitado(""));
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="rotulo">Digitar o código</span>
            <input
              value={digitado}
              onChange={(e) => setDigitado(e.target.value.toUpperCase())}
              maxLength={9}
              autoComplete="off"
              placeholder="ABCD 2345"
              className="campo font-mono tracking-[0.2em] uppercase"
            />
          </label>
          <button className="btn-secundario min-h-11 px-4" disabled={enviando || !digitado.trim()}>
            Confirmar
          </button>
        </form>
      </section>

      <aside className="space-y-3">
        <div
          role="status"
          aria-live="assertive"
          className={`card space-y-1 border-2 ${
            !atual ? "border-borda" : !atual.ok ? "border-red-500 bg-red-50 dark:bg-red-950/40" : atual.pessoa.ja_estava ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40" : "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
          }`}
        >
          {!atual ? (
            <p className="text-sm text-suave">{enviando ? "Conferindo…" : "A última leitura aparece aqui."}</p>
          ) : atual.ok ? (
            <>
              <p className="text-xs font-semibold tracking-wide uppercase">
                {atual.pessoa.ja_estava ? "Já tinha entrado" : atual.pessoa.papel === "aluno" ? "Presença marcada" : "Bem-vindo(a)"}
              </p>
              <p className="text-2xl font-extrabold break-words">{atual.pessoa.nome}</p>
              <p className="text-sm">
                {atual.pessoa.papel === "aluno" ? (atual.pessoa.equipe ? `Equipe ${atual.pessoa.equipe}` : "Sem equipe ainda") : `Papel: ${atual.pessoa.papel}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-wide uppercase">Não reconhecido</p>
              <p className="text-sm">{atual.erro}</p>
            </>
          )}
        </div>

        {leituras.length > 0 && (
          <div className="card space-y-2">
            <p className="text-xs text-suave">
              Nesta tela: <strong>{presentes}</strong> entrada(s) nova(s)
            </p>
            <ul className="space-y-1 text-sm">
              {leituras.map((l) => (
                <li key={`${l.quando}-${l.codigo}`} className="flex items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${!l.ok ? "bg-red-500" : l.pessoa.ja_estava ? "bg-sky-500" : "bg-emerald-500"}`} />
                  <span className="min-w-0 flex-1 truncate">{l.ok ? l.pessoa.nome : `${l.codigo}: ${l.erro}`}</span>
                  <span className="font-mono text-[11px] text-suave">{new Date(l.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
