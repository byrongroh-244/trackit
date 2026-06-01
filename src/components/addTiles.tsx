// ── Shared tile config — single source of truth for AddScreen + QuickLaunch ───
// Spec: diagnostic pastel fills, 42px squircles, border-radius 12px, 20×20 SVG

export const ADD_TILES = [
  {
    type: 'homework' as const,
    label: 'Homework',
    sub: 'Assignment or worksheet',
    bg: '#EAE5FB', iconBg: '#7B6DD0', textColor: '#4A3FA0',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    type: 'test' as const,
    label: 'Test',
    sub: 'Exam or major assessment',
    bg: '#FEE8E7', iconBg: '#CC3F3A', textColor: '#8B1E1C',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    type: 'quiz' as const,
    label: 'Quiz',
    sub: 'Short check-in',
    bg: '#FEF0DC', iconBg: '#B86B12', textColor: '#7A4608',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    type: 'task' as const,
    label: 'Task',
    sub: 'Quick to-do, no steps',
    bg: '#D9F5E5', iconBg: '#1E8A55', textColor: '#145C38',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
] as const;

export type AddTileType = typeof ADD_TILES[number]['type'];

// ── Shared Tile button component ──────────────────────────────────────────────
import { useState } from 'react';

export function AddTile({
  tile, delay = 0, fullWidth = false, onClick,
}: {
  tile: typeof ADD_TILES[number];
  delay?: number;
  fullWidth?: boolean;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: fullWidth ? '100%' : undefined,
        display: 'flex',
        flexDirection: fullWidth ? 'row' : 'column',
        alignItems: fullWidth ? 'center' : 'flex-start',
        gap: fullWidth ? 16 : 0,
        padding: fullWidth ? '16px 18px' : '18px 16px 16px',
        minHeight: fullWidth ? 0 : 124,
        borderRadius: 18,
        border: 'none',
        background: tile.bg,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 0.11s ease',
        animation: `ql-tile-in 0.38s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: tile.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: fullWidth ? 0 : 14, flexShrink: 0,
      }}>
        {tile.icon}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: tile.textColor, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {tile.label}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: tile.textColor, opacity: 0.65, marginTop: 3 }}>
          {tile.sub}
        </div>
      </div>
    </button>
  );
}
