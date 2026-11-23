import React, { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#6ee7b7]/20 bg-gradient-to-br from-[#071c17]/90 to-[#030c0a]/80 p-6 backdrop-blur-md shadow-2xl transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}