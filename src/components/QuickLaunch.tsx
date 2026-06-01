import { useEffect, useState } from 'react';
import { Colors } from '../theme';

const SESSION_KEY = 'trackit_quicklaunch_dismissed';

interface Props {
  onAdd:    () => void;
  onFocus:  () => void;
  onAgenda: () => void;
  onWeekly: () => void;
}

// ── Main action tiles ─────────────────────────────────────────────────────────
const ACTION_TILES = [
  {
    id: 'add' as const,
    label: 'Add',
    sub: 'New assignment',
    bg: '#EAE5FB', iconBg: '#7B6DD0', textColor: '#4A3FA0',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
  },
  {
    id: 'focus' as const,
    label: 'Focus',
    sub: 'Start a timer',
    bg: '#FEE8E7', iconBg: '#CC3F3A', textColor: '#8B1E1C',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    id: 'agenda' as const,
    label: 'Agenda',
    sub: "What's due today",
    bg: '#D9F5E5', iconBg: '#1E8A55', textColor: '#145C38',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    id: 'weekly' as const,
    label: 'Calendar',
    sub: 'Week overview',
    bg: '#E0EEFB', iconBg: '#2764A8', textColor: '#1A4880',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

function ActionTile({ tile, delay, onClick }: { tile: typeof ACTION_TILES[number]; delay: number; onClick: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '18px 16px 16px', minHeight: 124,
        borderRadius: 18, border: 'none',
        background: tile.bg,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        transform: pressed ? 'scale(0.955)' : 'scale(1)',
        transition: 'transform 0.11s ease',
        animation: `ql-tile-in 0.38s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: tile.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, flexShrink: 0 }}>
        {tile.icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: tile.textColor, letterSpacing: '-0.02em', marginBottom: 3, lineHeight: 1.15 }}>{tile.label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: tile.textColor, opacity: 0.65 }}>{tile.sub}</div>
    </button>
  );
}

export default function QuickLaunch({ onAdd, onFocus, onAgenda, onWeekly }: Props) {
  const [visible,  setVisible]  = useState(false);
  const [exiting,  setExiting]  = useState(false);

  useEffect(() => {
    try { if (!sessionStorage.getItem(SESSION_KEY)) setVisible(true); }
    catch { setVisible(true); }
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(() => { setVisible(false); setExiting(false); }, 220);
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
  }

  function handleAction(id: typeof ACTION_TILES[number]['id']) {
    dismiss();
    setTimeout(() => {
      if (id === 'add')    onAdd();
      if (id === 'focus')  onFocus();
      if (id === 'agenda') onAgenda();
      if (id === 'weekly') onWeekly();
    }, 100);
  }

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes ql-backdrop-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes ql-backdrop-out { to   { opacity:0 } }
        @keyframes ql-sheet-in  { from { transform:translateY(60px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes ql-sheet-out { to   { transform:translateY(60px); opacity:0 } }
        @keyframes ql-tile-in   { from { transform:translateY(18px) scale(0.95); opacity:0 } to { transform:translateY(0) scale(1); opacity:1 } }
      `}</style>

      {/* Backdrop */}
      <div onClick={dismiss} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(28,74,79,0.78)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        zIndex: 300,
        animation: exiting ? 'ql-backdrop-out 0.22s ease forwards' : 'ql-backdrop-in 0.22s ease both',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 301,
        padding: '0 14px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        animation: exiting ? 'ql-sheet-out 0.22s cubic-bezier(0.4,0,1,1) forwards' : 'ql-sheet-in 0.32s cubic-bezier(0.22,1,0.36,1) both',
      }}>

        <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          What would you like to do?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ACTION_TILES.map((t, i) => (
            <ActionTile key={t.id} tile={t} delay={i * 40} onClick={() => handleAction(t.id)} />
          ))}
        </div>

        <button onClick={dismiss} style={{
          width: '100%', marginTop: 12, padding: '13px', borderRadius: 12,
          background: 'rgba(255,255,255,0.1)', border: 'none',
          color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Dismiss
        </button>
      </div>
    </>
  );
}
