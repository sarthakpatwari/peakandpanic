"use client";

import { useEffect, useRef } from "react";

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const wrap = cv.parentElement;
    if (!wrap) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    )
      return;

    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    interface Particle { x: number; y: number; vx: number; vy: number; bx: number; by: number; r: number }
    let W = 0,
      H = 0,
      ps: Particle[] = [],
      visible = true;
    const m = { x: -999, y: -999, on: false };
    const R = 110,
      LINK = 80,
      MLINK = 130;

    function size() {
      if (!wrap || !cv || !ctx) return;
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(Math.round((W * H) / 9000), 220);
      ps = [];
      for (let i = 0; i < n; i++) {
        const vx = (Math.random() - 0.5) * 0.25;
        const vy = (Math.random() - 0.5) * 0.25;
        ps.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx,
          vy,
          bx: vx,
          by: vy,
          r: Math.random() * 1.4 + 0.8,
        });
      }
    }
    size();

    const ro = new ResizeObserver(size);
    ro.observe(wrap);

    const onPointerMove = (e: PointerEvent) => {
      const b = wrap.getBoundingClientRect();
      m.x = e.clientX - b.left;
      m.y = e.clientY - b.top;
      m.on = true;
    };
    const onPointerLeave = () => {
      m.on = false;
      m.x = -999;
      m.y = -999;
    };

    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    io.observe(wrap);

    let animId: number;
    function tick() {
      animId = requestAnimationFrame(tick);
      if (!visible || !ctx) return;
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (m.on) {
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < R && d > 0) {
            const f = (1 - d / R) * 1.1;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
        p.vx += (p.bx - p.vx) * 0.05;
        p.vy += (p.by - p.vy) * 0.05;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const ex = ps[i].x - ps[j].x;
          const ey = ps[i].y - ps[j].y;
          const dd = ex * ex + ey * ey;
          if (dd < LINK * LINK) {
            ctx.strokeStyle = `rgba(16,185,129,${0.28 * (1 - Math.sqrt(dd) / LINK)})`;
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.stroke();
          }
        }
        if (m.on) {
          const mx = ps[i].x - m.x;
          const my = ps[i].y - m.y;
          const md = Math.sqrt(mx * mx + my * my);
          if (md < MLINK) {
            ctx.strokeStyle = `rgba(110,231,183,${0.6 * (1 - md / MLINK)})`;
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = "#10B981";
      for (let i = 0; i < ps.length; i++) {
        ctx.beginPath();
        ctx.arc(ps[i].x, ps[i].y, ps[i].r, 0, 6.2832);
        ctx.fill();
      }
    }
    tick();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} id="particles" aria-hidden="true" />;
}
