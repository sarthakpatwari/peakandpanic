"use client";

import React, { useEffect, useRef, useState } from "react";

export function PerspectiveDockReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
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
    <div style={{ perspective: "1000px" }}>
      <div
        ref={ref}
        style={{
          transform: active
            ? "rotateX(0deg) scale(1) translateY(0)"
            : "rotateX(18deg) scale(0.92) translateY(50px)",
          opacity: active ? 1 : 0.2,
          filter: active ? "blur(0px)" : "blur(8px)",
          transformOrigin: "center bottom",
          transition: `transform 0.95s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, opacity 0.95s ease ${delay}s, filter 0.95s ease ${delay}s`,
          willChange: "transform, opacity, filter",
        }}
      >
        {children}
      </div>
    </div>
  );
}