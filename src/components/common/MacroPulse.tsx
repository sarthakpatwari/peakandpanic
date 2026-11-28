type MacroPulseVariant = "global" | "markets" | "macros" | "policy" | "inflation" | "growth";

type PulseGeometry = { structure: string[]; active: string[]; highlights: string[] };

const geometry: Record<MacroPulseVariant, PulseGeometry> = {
  global: {
    structure: [
      "M330 184 C425 106 520 102 610 152 C688 196 777 182 866 102",
      "M420 214 C505 142 590 137 674 173 C757 208 840 183 936 105",
      "M508 74 C590 111 665 105 733 65 C803 24 876 37 956 98",
      "M286 130 C373 162 442 148 510 94 C579 39 654 37 735 85",
    ],
    active: [
      "M330 184 C425 106 520 102 610 152 C688 196 777 182 866 102",
      "M420 214 C505 142 590 137 674 173 C757 208 840 183 936 105",
      "M508 74 C590 111 665 105 733 65 C803 24 876 37 956 98",
    ],
    highlights: [
      "M330 184 C425 106 520 102 610 152 C688 196 777 182 866 102",
      "M420 214 C505 142 590 137 674 173 C757 208 840 183 936 105",
      "M508 74 C590 111 665 105 733 65 C803 24 876 37 956 98",
    ],
  },
  markets: {
    structure: [
      "M410 62 C525 52 620 72 730 62 S906 48 1040 60",
      "M360 94 C492 82 610 108 731 96 S910 80 1050 94",
      "M395 127 C520 116 627 139 748 128 S920 112 1048 126",
      "M345 161 C490 148 620 176 760 162 S920 148 1060 159",
      "M420 198 C548 185 656 209 784 197 S936 184 1052 195",
    ],
    active: [
      "M360 94 C492 82 610 108 731 96 S910 80 1050 94",
      "M395 127 C520 116 627 139 748 128 S920 112 1048 126",
      "M345 161 C490 148 620 176 760 162 S920 148 1060 159",
      "M420 198 C548 185 656 209 784 197 S936 184 1052 195",
    ],
    highlights: [
      "M360 94 C492 82 610 108 731 96 S910 80 1050 94",
      "M395 127 C520 116 627 139 748 128 S920 112 1048 126",
      "M420 198 C548 185 656 209 784 197 S936 184 1052 195",
    ],
  },
  macros: {
    structure: [
      "M492 25 C535 69 596 112 756 207",
      "M642 10 C658 72 689 126 756 207",
      "M804 18 C794 83 777 141 756 207",
      "M960 34 C895 88 835 144 756 207",
    ],
    active: [
      "M492 25 C535 69 596 112 756 207",
      "M642 10 C658 72 689 126 756 207",
      "M804 18 C794 83 777 141 756 207",
      "M960 34 C895 88 835 144 756 207",
    ],
    highlights: [
      "M492 25 C535 69 596 112 756 207",
      "M642 10 C658 72 689 126 756 207",
      "M960 34 C895 88 835 144 756 207",
    ],
  },
  policy: {
    structure: [
      "M430 192 H540 V164 H648 V128 H762 V144 H860 V91 H978",
      "M455 214 H566 V187 H674 V151 H790 V168 H890 V115 H995",
      "M515 109 H622 V91 H714 V63 H822 V76 H932 V43",
    ],
    active: [
      "M430 192 H540 V164 H648 V128 H762 V144 H860 V91 H978",
      "M515 109 H622 V91 H714 V63 H822 V76 H932 V43",
    ],
    highlights: [
      "M430 192 H540 V164 H648 V128 H762 V144 H860 V91 H978",
      "M515 109 H622 V91 H714 V63 H822 V76 H932 V43",
    ],
  },
  inflation: {
    structure: [
      "M462 47 C580 38 679 50 770 46 C851 42 925 47 1018 42",
      "M438 76 C565 66 674 81 772 75 C858 70 934 76 1025 70",
      "M468 105 C584 95 688 112 781 104 C865 97 941 104 1028 98",
      "M435 134 C566 123 682 142 788 133 C875 125 950 132 1034 126",
      "M475 163 C590 153 698 171 796 162 C882 154 957 160 1036 156",
      "M448 193 C578 181 698 202 806 191 C894 182 968 190 1040 185",
    ],
    active: [
      "M438 76 C565 66 674 81 772 75 C858 70 934 76 1025 70",
      "M468 105 C584 95 688 112 781 104 C865 97 941 104 1028 98",
      "M435 134 C566 123 682 142 788 133 C875 125 950 132 1034 126",
      "M475 163 C590 153 698 171 796 162 C882 154 957 160 1036 156",
    ],
    highlights: [
      "M468 105 C584 95 688 112 781 104 C865 97 941 104 1028 98",
      "M475 163 C590 153 698 171 796 162 C882 154 957 160 1036 156",
    ],
  },
  growth: {
    structure: [
      "M438 224 C542 211 617 186 686 151 C757 114 840 92 1008 86",
      "M418 205 C518 192 600 165 674 128 C749 91 838 70 1007 66",
      "M452 186 C548 170 624 143 696 107 C768 72 850 50 1014 46",
      "M430 166 C525 150 608 120 681 86 C758 51 846 31 1009 28",
      "M488 226 C590 213 669 189 741 157 C811 126 889 108 1024 104",
      "M474 145 C561 129 642 101 715 70 C786 40 866 22 1009 18",
      "M514 205 C607 191 687 167 758 136 C831 105 902 88 1030 84",
    ],
    active: [
      "M438 224 C542 211 617 186 686 151 C757 114 840 92 1008 86",
      "M418 205 C518 192 600 165 674 128 C749 91 838 70 1007 66",
      "M452 186 C548 170 624 143 696 107 C768 72 850 50 1014 46",
      "M430 166 C525 150 608 120 681 86 C758 51 846 31 1009 28",
      "M488 226 C590 213 669 189 741 157 C811 126 889 108 1024 104",
    ],
    highlights: [
      "M438 224 C542 211 617 186 686 151 C757 114 840 92 1008 86",
      "M452 186 C548 170 624 143 696 107 C768 72 850 50 1014 46",
      "M488 226 C590 213 669 189 741 157 C811 126 889 108 1024 104",
    ],
  },
};

function renderPaths(paths: string[], className: string) {
  return paths.map((path, index) => (
    <path key={`${className}-${index}`} className={`${className} ${className}--${index + 1}`} d={path} />
  ));
}

export default function MacroPulse({ variant, className = "" }: { variant: MacroPulseVariant; className?: string }) {
  const paths = geometry[variant];
  return (
    <svg className={`macro-pulse macro-pulse--${variant} ${className}`.trim()} viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g className="macro-pulse__structure">{renderPaths(paths.structure, "macro-pulse__structure-path")}</g>
      <g className="macro-pulse__active">{renderPaths(paths.active, "macro-pulse__active-path")}</g>
      <g className="macro-pulse__highlight-glow">{renderPaths(paths.highlights, "macro-pulse__highlight-glow-path")}</g>
      <g className="macro-pulse__highlight">{renderPaths(paths.highlights, "macro-pulse__highlight-path")}</g>
    </svg>
  );
}
