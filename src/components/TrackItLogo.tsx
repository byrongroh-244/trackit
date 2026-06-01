interface Props {
  size?: number;
  style?: React.CSSProperties;
}

export default function TrackItLogo({ size = 56, style }: Props) {
  const r = Math.round(size * 0.22);

  // All coords in a fixed 100×100 internal space, scaled via viewBox
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: '#B8E04A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, ...style,
    }}>
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Row 1 — checkmark only, no circle */}
        <polyline
          points="6,18 14,26 28,10"
          stroke="#1c4a4f"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="34" y="13" width="32" height="9" rx="4.5" fill="#1c4a4f" opacity="0.85"/>

        {/* Row 2 — pending */}
        <circle cx="14" cy="38" r="8" stroke="#1c4a4f" strokeWidth="3" opacity="0.4"/>
        <rect x="28" y="34" width="36" height="9" rx="4.5" fill="#1c4a4f" opacity="0.2"/>

        {/* Row 3 — pending, shorter bar */}
        <circle cx="14" cy="58" r="8" stroke="#1c4a4f" strokeWidth="3" opacity="0.4"/>
        <rect x="28" y="54" width="26" height="9" rx="4.5" fill="#1c4a4f" opacity="0.2"/>
      </svg>
    </div>
  );
}
