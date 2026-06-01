import {
  forwardRef, useState, useCallback, useContext, createContext,
  useEffect, useRef,
  type CSSProperties, type ReactNode,
} from 'react';
import { Colors } from '../theme';
import { Styles } from '../styles';
import { IconCircleCheck, IconInfo, IconAlertCircle } from './Icons';

// ── Toast system ──────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastCtx {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} });

let _nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = _nextId++;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const VARIANT_STYLES: Record<ToastVariant, { background: string; color: string; icon: React.ReactNode }> = {
    success: { background: Colors.teal,   color: '#fff', icon: <IconCircleCheck size={16} /> },
    info:    { background: Colors.purple, color: '#fff', icon: <IconInfo size={16} /> },
    error:   { background: Colors.red,    color: '#fff', icon: <IconAlertCircle size={16} /> },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast stack — bottom-center, above BottomNav */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom) + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 200,
        pointerEvents: 'none',
        width: '90%',
        maxWidth: 380,
      }}>
        {toasts.map(t => {
          const s = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              style={{
                background: s.background,
                color: s.color,
                borderRadius: 12,
                padding: '11px 18px',
                fontSize: 14,
                fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                animation: 'toast-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{s.icon}</span>
              <span style={{ flex: 1, lineHeight: 1.35 }}>{t.message}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(14px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  return useContext(ToastContext);
}

// ── ConfirmSheet ──────────────────────────────────────────────────────────────
// A bottom-anchored confirmation panel. Replaces window.confirm() everywhere.

interface ConfirmSheetProps {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  title, body, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel,
}: ConfirmSheetProps) {
  // Close on backdrop click
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.38)',
        zIndex: 150,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: Colors.surface,
          borderRadius: '18px 18px 0 0',
          padding: '24px 20px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          animation: 'sheet-in 0.22s ease-out both',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, color: Colors.textPrimary, marginBottom: body ? 8 : 20 }}>
          {title}
        </div>
        {body && (
          <div style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 1.45, marginBottom: 20 }}>
            {body}
          </div>
        )}
        <button
          onClick={onConfirm}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: danger ? Colors.red : Colors.purple,
            color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '13px', borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.15)',
            background: '#fff', color: Colors.textSecondary,
            fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
      </div>
      <style>{`
        @keyframes sheet-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function Screen({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', height: '100%', ...style }}>
      {children}
    </div>
  );
}

export function ScrollBody({ children, style, hasNav = false }: { children: ReactNode; style?: CSSProperties; hasNav?: boolean }) {
  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingBottom: hasNav ? 'calc(72px + env(safe-area-inset-bottom))' : 16,
      WebkitOverflowScrolling: 'touch' as any,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div style={{
      padding: '20px 18px 14px',
      borderBottom: '0.5px solid rgba(0,0,0,0.1)',
      background: Colors.surface,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: Colors.textPrimary, margin: 0, lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 13, color: Colors.textSecondary, margin: '3px 0 0' }}>{subtitle}</p>}
        </div>
        {right && <div style={{ flexShrink: 0, marginLeft: 12 }}>{right}</div>}
      </div>
    </div>
  );
}

// ── Back bar ──────────────────────────────────────────────────────────────────
export function BackBar({ label = '← Back', onBack, right }: { label?: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 18px', minHeight: 52,
      borderBottom: '0.5px solid rgba(0,0,0,0.1)',
      background: Colors.surface, flexShrink: 0,
    }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: Colors.purple,
        fontSize: 15, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: 'inherit', padding: '8px 0',
        minHeight: 44, minWidth: 44,
      }}>
        {label}
      </button>
      {right}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 500, color: Colors.textSecondary,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      padding: '14px 18px 6px',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />}
      {children}
    </div>
  );
}

// ── Urgency pill ──────────────────────────────────────────────────────────────
export function UrgencyPill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 999, background: bg, color: text, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

// ── Check circle ──────────────────────────────────────────────────────────────
export function CheckCircle({
  checked, onToggle, size = 22, animationKey,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  animationKey?: string | number;
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      onTouchEnd={e => { e.stopPropagation(); }}
      style={{
        width: 44, height: 44,
        background: 'none', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      <span
        key={animationKey}
        className={checked && animationKey !== undefined ? 'check-pop' : undefined}
        style={{
          width: size, height: size, borderRadius: '50%',
          border: `1.5px solid ${checked ? Colors.teal : 'rgba(0,0,0,0.2)'}`,
          background: checked ? Colors.teal : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#fff',
          transition: checked ? 'border-color 0.1s, background 0.1s' : 'all 0.15s',
          flexShrink: 0,
        }}
      >
        {checked ? (
          <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none"
            stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = Colors.purple }: { value: number; color?: string }) {
  return (
    <div style={{ height: 4, background: Colors.grayLight, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.round(value * 100)}%`,
        background: value === 1 ? Colors.teal : color,
        borderRadius: 2, transition: 'width 0.3s',
      }} />
    </div>
  );
}

// ── Save button ───────────────────────────────────────────────────────────────
export function SaveButton({ label, onClick, color = Colors.purple }: { label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...Styles.primaryButton,
        background: color,
        padding: '15px 14px', fontSize: 15, fontWeight: 500,
        minHeight: 52, transition: 'opacity 0.15s',
      }}
      onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
      onMouseOut={e => (e.currentTarget.style.opacity = '1')}
    >
      {label}
    </button>
  );
}

// ── Form field ────────────────────────────────────────────────────────────────
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={{
        ...Styles.fieldLabel,
        marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase: CSSProperties = {
  width: '100%',
  fontSize: 16,
  color: Colors.textPrimary,
  background: Colors.surface,
  border: '0.5px solid rgba(0,0,0,0.18)',
  borderRadius: 8,
  padding: '12px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  minHeight: 48,
};

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => <input ref={ref} {...props} style={{ ...inputBase, ...props.style }} />
);
TextInput.displayName = 'TextInput';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => <textarea ref={ref} {...props} style={{ ...inputBase, minHeight: 88, resize: 'none', ...props.style }} />
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  (props, ref) => <select ref={ref} {...props} style={{ ...inputBase, appearance: 'none', cursor: 'pointer', ...props.style }} />
);
Select.displayName = 'Select';

// ── Bottom nav ────────────────────────────────────────────────────────────────
interface NavItem { label: string; icon: string; screen: string; }

const NAV_ICONS: Record<string, JSX.Element> = {
  today: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  classes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

export function BottomNav({ current, onNavigate, items }: {
  current: string;
  onNavigate: (s: string) => void;
  items: NavItem[];
}) {
  // Split items around the Add button (always center)
  const addIdx   = items.findIndex(i => i.screen === 'add');
  const left     = addIdx >= 0 ? items.slice(0, addIdx)  : items.slice(0, 2);
  const right    = addIdx >= 0 ? items.slice(addIdx + 1) : items.slice(2);
  const isAddActive = current === 'add';

  function NavBtn({ item }: { item: NavItem }) {
    const isActive = current === item.screen;
    const icon = NAV_ICONS[item.screen] ?? NAV_ICONS['today'];
    return (
      <button
        onClick={() => onNavigate(item.screen)}
        style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 3,
          padding: '10px 2px 12px',
          background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
          minHeight: 64,
          position: 'relative',
          color: isActive ? Colors.forest : Colors.textHint,
          transition: 'color 0.15s',
        }}
      >
        {/* Active indicator — forest underline at top */}
        {isActive && (
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%',
            height: 2.5, borderRadius: '0 0 3px 3px',
            background: Colors.forest,
          }} />
        )}
        {/* Icon pill — forest tint when active */}
        <div style={{
          width: 42, height: 26,
          borderRadius: 13,
          background: isActive ? '#E8F4F5' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 10, fontWeight: isActive ? 700 : 500,
          letterSpacing: '0.02em',
          color: isActive ? Colors.forest : Colors.textHint,
        }}>
          {item.label}
        </span>
      </button>
    );
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'center',
      background: '#fff',
      borderTop: '0.5px solid #E3EBEA',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {/* Left items */}
      {left.map(item => <NavBtn key={item.screen} item={item} />)}

      {/* Add — raised circular center button */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 6px 12px',
        position: 'relative',
        flexShrink: 0,
      }}>
        <button
          onClick={() => onNavigate('add')}
          style={{
            width: 54, height: 54,
            borderRadius: '50%',
            background: Colors.forest,
            border: '3px solid #fff',
            boxShadow: '0 2px 12px rgba(28,74,79,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            marginTop: -18,
            transition: 'transform 0.15s, box-shadow 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={isAddActive ? '#B8E04A' : '#fff'}
            strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <span style={{
          fontSize: 10, fontWeight: isAddActive ? 700 : 500,
          color: isAddActive ? Colors.forest : Colors.textHint,
          letterSpacing: '0.02em',
          marginTop: 4,
        }}>
          Add
        </span>
      </div>

      {/* Right items */}
      {right.map(item => <NavBtn key={item.screen} item={item} />)}
    </nav>
  );
}

// ── Import row ────────────────────────────────────────────────────────────────
export function ImportRow({ icon, iconBg, label, desc, onClick }: {
  icon: string; iconBg: string; label: string; desc: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        borderBottom: '0.5px solid rgba(0,0,0,0.1)',
        cursor: 'pointer', minHeight: 64,
        transition: 'background 0.1s',
      }}
      onMouseOver={e => (e.currentTarget.style.background = Colors.background)}
      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: Colors.textPrimary }}>{label}</div>
        <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ fontSize: 22, color: Colors.textHint, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, emoji, title, body }: {
  icon?: ReactNode;
  emoji?: string;
  title: string;
  body: string;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon ?? emoji}
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{title}</h3>
      <p style={{ fontSize: 14, color: Colors.textSecondary, margin: 0, lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}
