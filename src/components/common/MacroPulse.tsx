type MacroPulseVariant = "global" | "markets" | "macros" | "policy" | "inflation" | "growth";

type PulseGeometry = { waves: string[]; highlights: number[] };

const broadWaves = [
  "M280 218 C390 176 478 222 574 181 S744 91 852 118 S973 166 1060 124",
  "M272 194 C378 153 468 201 566 160 S741 69 850 96 S972 143 1064 102",
  "M294 170 C401 128 490 177 586 136 S752 47 860 74 S976 120 1060 81",
  "M306 146 C409 105 498 153 594 112 S765 25 870 52 S978 99 1062 59",
  "M326 122 C426 82 511 129 606 89 S774 5 878 31 S982 77 1065 38",
  "M346 98 C444 60 526 106 620 67 S785 -12 890 12 S990 55 1068 19",
  "M370 230 C478 189 560 232 654 194 S820 111 922 135 S1014 167 1080 139",
];

const marketWaves = [
  "M300 205 C420 180 508 215 614 190 S795 154 900 169 S1000 194 1080 178",
  "M286 174 C408 149 502 184 610 159 S790 123 899 138 S1004 163 1082 147",
  "M312 143 C430 118 520 153 626 128 S804 92 910 107 S1008 132 1084 116",
  "M296 112 C414 87 510 122 618 97 S798 61 906 76 S1006 101 1085 85",
  "M326 81 C442 56 532 91 638 66 S816 30 922 45 S1016 70 1088 54",
  "M348 50 C462 25 550 60 656 35 S830 1 934 15 S1022 40 1090 24",
];

const pressureWaves = [
  "M330 214 C442 180 525 219 625 185 S792 120 894 142 S1006 178 1082 150",
  "M318 186 C431 152 518 191 618 157 S790 94 892 115 S1008 151 1084 123",
  "M340 158 C450 125 536 163 636 130 S800 68 902 89 S1012 124 1086 96",
  "M326 130 C438 97 526 135 626 102 S796 42 898 62 S1010 97 1088 69",
  "M350 102 C458 70 544 107 644 74 S808 15 910 35 S1018 70 1090 42",
  "M338 74 C448 42 534 79 634 46 S804 -12 906 8 S1016 43 1092 15",
  "M364 226 C472 195 558 231 658 199 S824 142 924 161 S1024 192 1094 166",
];

const geometry: Record<MacroPulseVariant, PulseGeometry> = {
  global: { waves: broadWaves, highlights: [1, 3, 5] },
  markets: { waves: marketWaves, highlights: [0, 2, 4] },
  macros: { waves: broadWaves, highlights: [0, 2, 4] },
  policy: { waves: marketWaves, highlights: [1, 3] },
  inflation: { waves: pressureWaves, highlights: [1, 3] },
  growth: { waves: broadWaves, highlights: [0, 2, 4] },
};

function renderPaths(paths: string[], className: string) {
  return paths.map((path, index) => (
    <path key={`${className}-${index}`} className={`${className} ${className}--${index + 1}`} d={path} />
  ));
}

export default function MacroPulse({ variant, className = "" }: { variant: MacroPulseVariant; className?: string }) {
  const field = geometry[variant];
  const highlights = field.highlights.map((index) => field.waves[index]);

  return (
    <svg className={`macro-pulse macro-pulse--${variant} ${className}`.trim()} viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g className="macro-pulse__structure">{renderPaths(field.waves, "macro-pulse__structure-path")}</g>
      <g className="macro-pulse__active">{renderPaths(field.waves, "macro-pulse__active-path")}</g>
      <g className="macro-pulse__highlight-glow">{renderPaths(highlights, "macro-pulse__highlight-glow-path")}</g>
      <g className="macro-pulse__highlight">{renderPaths(highlights, "macro-pulse__highlight-path")}</g>
    </svg>
  );
}
