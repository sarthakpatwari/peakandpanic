"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

interface BorderBeamProps {
  children: React.ReactNode;
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

export function BorderBeam({
  children,
  size = 250,
  duration = 12,
  colorFrom = "#10b981",
  colorTo = "#34d399",
  className = "",
}: BorderBeamProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 35 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 35 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`relative rounded-[16px] overflow-hidden ${className}`}
    >
      {/* Animated Light Ray Circling the Border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          padding: "1px",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: size,
            height: size,
            background: `radial-gradient(circle, ${colorFrom} 0%, ${colorTo} 40%, transparent 70%)`,
            animation: `border-beam-spin ${duration}s linear infinite`,
            top: "-50%",
            left: "-50%",
          }}
        />
      </div>

      {children}
    </motion.div>
  );
}