"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation, useInView } from "motion/react";

interface BoxRevealProps {
  children: React.ReactNode;
  boxColor?: string;
  duration?: number;
  delay?: number;
  className?: string;
}

export function BoxReveal({
  children,
  boxColor = "linear-gradient(90deg, #10b981, #34d399)",
  duration = 0.6,
  delay = 0.1,
  className = "",
}: BoxRevealProps) {
  const mainControls = useAnimation();
  const slideControls = useAnimation();

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    if (isInView) {
      slideControls.start("visible");
      mainControls.start("visible");
    }
  }, [isInView, mainControls, slideControls]);

  return (
    <div ref={ref} className={`relative overflow-hidden w-full ${className}`}>
      {/* Content Fade-in */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 30 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={mainControls}
        transition={{ duration, delay: delay + 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>

      {/* Luminous Emerald Curtain Sweep */}
      <motion.div
        variants={{
          hidden: { left: 0 },
          visible: { left: "100%" },
        }}
        initial="hidden"
        animate={slideControls}
        transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: boxColor,
          boxShadow: "0 0 25px rgba(16, 185, 129, 0.6)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}