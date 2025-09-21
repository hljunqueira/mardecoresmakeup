import { BRAND_NAME } from "@/lib/constants";

type SealBadgeProps = {
  size?: number; // px
  primary?: string; // stroke/text color
  brand?: string;
  year?: string;
};

// SVG selo redondo estilo carimbo
export default function SealBadge({
  size = 96,
  primary = "#111111",
  brand = BRAND_NAME.toUpperCase(),
  year = "2025",
}: SealBadgeProps) {
  const s = Math.max(64, size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 400 400"
      aria-label={`Selo ${brand} ${year}`}
      role="img"
    >
      <defs>
        <path id="curveTop" d="M60 200 A140 140 0 0 1 340 200" />
        <path id="curveBottom" d="M340 200 A140 140 0 0 1 60 200" />
      </defs>
      {/* Outer ring */}
      <circle cx="200" cy="200" r="170" fill="none" stroke={primary} strokeWidth="16" />
      <circle cx="200" cy="200" r="120" fill="none" stroke={primary} strokeWidth="12" />
      {/* Horizontal bars */}
      <line x1="60" y1="200" x2="175" y2="200" stroke={primary} strokeWidth="12" strokeLinecap="round" />
      <line x1="225" y1="200" x2="340" y2="200" stroke={primary} strokeWidth="12" strokeLinecap="round" />
      {/* Brand */}
      <text x="200" y="225" fontFamily="Inter, ui-sans-serif, system-ui" fontWeight={800} fontSize="44" textAnchor="middle" fill={primary}>
        {brand}
      </text>
      {/* Year center top/bottom */}
      <text x="200" y="175" fontFamily="Inter, ui-sans-serif, system-ui" fontWeight={800} fontSize="36" textAnchor="middle" fill={primary}>
        {year}
      </text>
      <text x="200" y="280" fontFamily="Inter, ui-sans-serif, system-ui" fontWeight={800} fontSize="36" textAnchor="middle" fill={primary}>
        {year}
      </text>
      {/* Arc texts */}
      <text fill={primary} fontFamily="Inter, ui-sans-serif, system-ui" fontSize="28" fontWeight={700}>
        <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
          MAKE UP PRO
        </textPath>
      </text>
      <text fill={primary} fontFamily="Inter, ui-sans-serif, system-ui" fontSize="28" fontWeight={700}>
        <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">
          MAKE UP PRO
        </textPath>
      </text>
    </svg>
  );
}


