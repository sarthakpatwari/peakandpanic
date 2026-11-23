"use client";

import React, { useEffect, useRef, useState } from "react";

export function LaserScanReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Laser Light Bar with intense neon glow */}
      <div
        style={{
          position: "absolute",
          left: "var(--gutter)",
          right: "var(--gutter)",
          height: "3px",
          background: "linear-gradient(90deg, transparent, #34d399 20%, #ffffff 50%, #34d399 80%, transparent)",
          boxShadow: "0 0 24px #10b981, 0 0 8px #ffffff",
          top: active ? "100%" : "0%",
          opacity: active ? 0 : 1,
          transition: `top 1.1s cubic-bezier(0.25, 1, 0.5, 1) ${delay}s, opacity 0.3s ease ${delay + 0.9}s`,
          zIndex: 40,
          pointerEvents: "none",
        }}
      />

      {/* Content wiped open from top to bottom */}
      <div
        style={{
          clipPath: active ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
          transition: `clip-path 1.1s cubic-bezier(0.25, 1, 0.5, 1) ${delay}s`,
        }}
      >
        {children}
      </div>
    </div>
  );
}