type MacroPulseVariant = "global" | "markets" | "macros" | "policy" | "inflation" | "growth";

const paths: Record<MacroPulseVariant, string[]> = {
  global: [
    "M-40 170 C150 20 330 250 520 110 S860 40 1040 150",
    "M-80 235 C140 90 320 300 550 165 S850 90 1080 215",
    "M60 70 C250 185 420 10 625 100 S880 180 1050 55",
  ],
  markets: [
    "M-80 105 C160 80 330 145 570 110 S820 70 1080 105",
    "M-60 155 C180 125 390 195 610 150 S820 115 1060 155",
    "M-100 205 C120 185 360 235 590 205 S850 170 1100 210",
  ],
  macros: [
    "M80 15 C130 95 210 130 260 235",
    "M315 10 C350 90 385 145 410 235",
    "M650 10 C610 85 585 145 570 235",
    "M900 15 C835 95 785 145 735 235",
  ],
  policy: [
    "M80 190 L235 190 L235 150 L410 150 L410 115 L590 115 L590 145 L760 145 L760 95 L950 95",
    "M80 205 L235 205 L235 165 L410 165 L410 130 L590 130 L590 160 L760 160 L760 110 L950 110",
  ],
  inflation: [
    "M-30 65 C160 25 270 105 480 65 S790 25 1030 70",
    "M-30 120 C160 80 285 160 500 120 S790 80 1030 125",
    "M-30 180 C160 140 300 220 520 180 S800 140 1030 185",
  ],
  growth: [
    "M120 225 C185 160 270 160 335 225",
    "M35 225 C145 90 315 90 425 225",
    "M-70 225 C90 15 365 15 530 225",
    "M455 225 C535 140 650 140 730 225",
    "M350 225 C495 55 700 55 845 225",
  ],
};

export default function MacroPulse({ variant, className = "" }: { variant: MacroPulseVariant; className?: string }) {
  return (
    <svg
      className={`macro-pulse macro-pulse--${variant} ${className}`.trim()}
      viewBox="0 0 1000 240"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="macro-pulse__static">
        {paths[variant].map((path, index) => <path key={`static-${index}`} d={path} />)}
      </g>
      <g className="macro-pulse__moving">
        {paths[variant].map((path, index) => <path key={`moving-${index}`} className={`macro-pulse__path macro-pulse__path--${index + 1}`} d={path} />)}
      </g>
    </svg>
  );
}
