// Centralised SVG icons. All icons are 20×20 by default, strokeWidth 1.8,
// stroke="currentColor" so they inherit color from their parent.
// Import only what you need — tree-shaking keeps the bundle lean.

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = (size: number, sw: number) => ({
  width: size, height: size,
  display: 'inline-block', flexShrink: 0, verticalAlign: 'middle',
  strokeWidth: sw, stroke: 'currentColor', fill: 'none',
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  // ADA: icons are decorative — parent element carries the accessible label
  'aria-hidden': true as const,
  focusable: 'false' as const,
});

// ── Navigation & UI chrome ────────────────────────────────────────────────────

export const IconCheck = ({ size = 20, color, strokeWidth = 2 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconX = ({ size = 20, color, strokeWidth = 2 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconChevronRight = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const IconChevronDown = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IconChevronUp = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export const IconChevronLeft = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const IconSettings = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const IconArrowLeft = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

export const IconTrash = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ── Status & feedback ─────────────────────────────────────────────────────────

export const IconCircleCheck = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const IconInfo = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const IconAlertCircle = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ── Actions & operations ──────────────────────────────────────────────────────

export const IconPlay = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const IconRefreshCw = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const IconZap = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const IconClock = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

export const IconBattery = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
    <line x1="23" y1="13" x2="23" y2="11" />
    <line x1="6" y1="10" x2="6" y2="14" /><line x1="10" y1="10" x2="10" y2="14" />
  </svg>
);

export const IconStar = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const IconParty = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  // Celebration / sparkle icon — replaces 🎉
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

export const IconLoader = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  // Spinner / processing — replaces ⏳
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// ── Academic / content ────────────────────────────────────────────────────────

export const IconBook = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const IconClipboard = ({ size = 20, color, strokeWidth = 1.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size, strokeWidth), stroke: color ?? 'currentColor' }}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

// ── Stop / square ─────────────────────────────────────────────────────────────

export const IconStop = ({ size = 20, color }: IconProps) => (
  // Replaces ◼ stop recording
  <svg viewBox="0 0 24 24" style={{ ...base(size, 0), stroke: 'none', fill: color ?? 'currentColor' }}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);
