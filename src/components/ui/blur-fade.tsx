"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  yOffset?: number;
  blur?: string;
}

export function BlurFade({
  children,
  className,
  duration = 0.6,
  delay = 0,
  yOffset = 24,
  blur = "8px",
}: BlurFadeProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={{
          hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
          visible: { y: 0, opacity: 1, filter: "blur(0px)" },
        }}
        transition={{
          delay,
          duration,
          ease: [0.21, 0.47, 0.32, 0.98],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}