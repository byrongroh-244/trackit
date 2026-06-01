import { useEffect, useState } from 'react';
import { Colors } from '../theme';

const SESSION_KEY = 'trackit_quicklaunch_dismissed';

interface Props {
  onAdd:    (type: 'homework' | 'test' | 'quiz' | 'class') => void;
  onFocus:  () => void;
  onAgenda: () => void;
  onWeekly: () => void;
}

// ── Shared SVG icon helper ────────────────────────────────────────────────────
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 30, height: 30 }}>
      {children}
    </svg>
  );
}

// ── Tile data ─────────────────────────────────────────────────────────────────
const mainTiles = [
  {
    id:    'add' as const,
    label: 'Add',
    sub:   'New assignment',
    color:  Colors.purple,
    light:  Colors.purpleLight,
    icon: <Icon><circle cx="12" cy="12" r="10"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/></Icon>,
  },
  {
    id:    'focus' as const,
    label: 'Focus',
    sub:   'Start a timer',
    color:  Colors.red,
    light:  Colors.redLight,
    icon: <Icon><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>,
  },
  {
    id:    'agenda' as const,
    label: 'Agenda',
    sub:   "What's due",
    color:  Colors.teal,
    light:  Colors.tealLight,
    icon: <Icon><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Icon>,
  },
  {
    id:    'weekly' as const,
    label: 'Week',
    sub:   'Overview',
    color:  Colors.amber,
    light:  Colors.amberLight,
    icon: <Icon><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>,
  },
];

const addSubTiles = [
  {
    id:    'homework' as const,
    label: 'Homework',
    sub:   'Practice / worksheet',
    color:  Colors.purple,
    light:  Colors.purpleLight,
    icon: <Icon><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>,
  },
  {
    id:    'test' as const,
    label: 'Test',
    sub:   'Exam / midterm',
    color:  Colors.red,
    light:  Colors.redLight,
    icon: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Icon>,
  },
  {
    id:    'quiz' as const,
    label: 'Quiz',
    sub:   'Short check-in',
    color:  Colors.teal,
    light:  Colors.tealLight,
    icon: <Icon><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>,
  },
  {
    id:    'class' as const,
    label: 'Add Class',
    sub:   'New subject',
    color:  Colors.amber,
    light:  Colors.amberLight,
    icon: <Icon><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></Icon>,
  },
];

// ── Tile component ────────────────────────────────────────────────────────────
function Tile({
  label, sub, color, light, icon, delay, onClick,
}: {
  label: string; sub: string; color: string; light: string;
  icon: React.ReactNode; delay: number; onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '18px 16px 16px',
        minHeight: 132,
        borderRadius: 20,
        border: 'none',
        background: '#fff',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        boxShadow: pressed
          ? '0 1px 6px rgba(0,0,0,0.10)'
          : '0 6px 24px rgba(0,0,0,0.11), 0 1px 4px rgba(0,0,0,0.06)',
        transform: pressed ? 'scale(0.955)' : 'scale(1)',
        transition: 'transform 0.11s ease, box-shadow 0.11s ease',
        animation: `ql-tile-in 0.40s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
      }}
    >
      <div style={{
        width: 50, height: 50, borderRadius: 14,
        background: light,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, marginBottom: 14, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: Colors.textPrimary, letterSpacing: '-0.02em', marginBottom: 3, lineHeight: 1.15 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: Colors.textSecondary }}>
        {sub}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuickLaunch({ onAdd, onFocus, onAgenda, onWeekly }: Props) {
  const [visible,  setVisible]  = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const [subMenu,  setSubMenu]  = useState(false); // showing add-type picker

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) setVisible(true);
    } catch { setVisible(true); }
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(() => { setVisible(false); setExiting(false); setSubMenu(false); }, 220);
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
  }

  function handleMainTile(id: typeof mainTiles[number]['id']) {
    if (id === 'add') { setSubMenu(true); return; }
    dismiss();
    setTimeout(() => {
      if (id === 'focus')  onFocus();
      if (id === 'agenda') onAgenda();
      if (id === 'weekly') onWeekly();
    }, 100);
  }

  function handleAddType(type: typeof addSubTiles[number]['id']) {
    dismiss();
    setTimeout(() => onAdd(type), 100);
  }

  if (!visible) return null;

  const tiles = subMenu ? addSubTiles : mainTiles;
  const heading = subMenu ? "What are you adding?" : "What would you like to do?";

  return (
    <>
      <style>{`
        @keyframes ql-backdrop-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes ql-backdrop-out { to   { opacity:0 } }
        @keyframes ql-sheet-in  { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes ql-sheet-out { to   { transform:translateY(100%); opacity:0 } }
        @keyframes ql-tile-in   { from { transform:translateY(16px) scale(0.96); opacity:0 } to { transform:translateY(0) scale(1); opacity:1 } }
      `}</style>

      {/* Backdrop */}
      <div onClick={dismiss} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(12,12,11,0.52)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 300,
        animation: exiting ? 'ql-backdrop-out 0.22s ease forwards' : 'ql-backdrop-in 0.25s ease both',
      }} />

      {/* Sheet — starts 40% from top */}
      <div style={{
        position: 'fixed',
        top: '38%', left: 0, right: 0, bottom: 0,
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 14px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        animation: exiting ? 'ql-sheet-out 0.22s cubic-bezier(0.4,0,1,1) forwards' : 'ql-sheet-in 0.36s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Back button for sub-menu */}
        {subMenu && (
          <button
            onClick={() => setSubMenu(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
              fontFamily: 'inherit', textAlign: 'left',
              padding: '0 4px 12px', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ← Back
          </button>
        )}

        {/* Heading */}
        <div style={{
          textAlign: 'center', marginBottom: 16,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
        }}>
          {heading}
        </div>

        {/* 2×2 Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {tiles.map((t, i) => (
            <Tile
              key={t.id}
              label={t.label}
              sub={t.sub}
              color={t.color}
              light={t.light}
              icon={t.icon}
              delay={i * 45}
              onClick={() =>
                subMenu
                  ? handleAddType(t.id as typeof addSubTiles[number]['id'])
                  : handleMainTile(t.id as typeof mainTiles[number]['id'])
              }
            />
          ))}
        </div>

        {/* Dismiss */}
        <div onClick={dismiss} style={{
          textAlign: 'center', marginTop: 16,
          fontSize: 13, fontWeight: 500,
          color: 'rgba(255,255,255,0.38)',
          cursor: 'pointer', padding: '6px 0',
        }}>
          Dismiss
        </div>
      </div>
    </>
  );
}
