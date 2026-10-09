"use client";

import { useEffect, useRef } from "react";

const reduzido = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Fundo animado do DATAHack: pontos que se movem e se ligam por linhas (rede de dados). */
export function RedeDados() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const cx = cv?.getContext("2d");
    if (!cv || !cx) return;
    let nodes: { x: number; y: number; vx: number; vy: number }[] = [];
    let W = 0,
      H = 0,
      raf = 0;
    const lerCor = () => getComputedStyle(document.documentElement).getPropertyValue("--net").trim() || "0,229,255";
    let NET = lerCor();

    const dimensionar = () => {
      const DPR = Math.min(2, window.devicePixelRatio || 1);
      W = innerWidth;
      H = innerHeight;
      cv.width = W * DPR;
      cv.height = H * DPR;
      cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // Menos pontos em telas pequenas (celular) para não pesar.
      const n = Math.round(Math.min(70, (W * H) / 22000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    };
    const desenhar = () => {
      cx.clearRect(0, 0, W, H);
      const L = 130;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < L) {
            cx.strokeStyle = `rgba(${NET},${(1 - d / L) * 0.35})`;
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(a.x, a.y);
            cx.lineTo(b.x, b.y);
            cx.stroke();
          }
        }
      }
      cx.fillStyle = `rgba(${NET},.7)`;
      for (const a of nodes) {
        cx.beginPath();
        cx.arc(a.x, a.y, 1.6, 0, 6.283);
        cx.fill();
      }
    };
    const loop = () => {
      for (const a of nodes) {
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
      }
      desenhar();
      raf = requestAnimationFrame(loop);
    };
    const iniciar = () => {
      cancelAnimationFrame(raf);
      if (reduzido()) desenhar();
      else loop();
    };

    dimensionar();
    iniciar();

    const aoRedimensionar = () => {
      dimensionar();
      if (reduzido()) desenhar();
    };
    // Pausa quando a aba não está visível (economiza bateria).
    const aoOcultar = () => (document.hidden ? cancelAnimationFrame(raf) : iniciar());
    const aoTrocarTema = () => {
      NET = lerCor();
      if (reduzido()) desenhar();
    };
    addEventListener("resize", aoRedimensionar);
    document.addEventListener("visibilitychange", aoOcultar);
    addEventListener("dh-tema", aoTrocarTema);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", aoRedimensionar);
      document.removeEventListener("visibilitychange", aoOcultar);
      removeEventListener("dh-tema", aoTrocarTema);
    };
  }, []);

  return <canvas id="rede-dados" ref={ref} aria-hidden="true" />;
}
