import { useState } from 'react';
import { Colors } from '../theme';
import { ADVOCACY_TEMPLATES, fillTemplate, type Situation } from '../data/advocacyTemplates';

interface Props {
  assignmentName: string;
  className: string;
  teacherName?: string;
  dueDate: string;
  daysUntil: number;
  onClose: () => void;
}

const SITUATIONS: {
  id: Situation; label: string; sub: string;
  bg: string; iconBg: string; textColor: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'overdue', label: "I missed the deadline", sub: "Script to recover and repair",
    bg: '#FEE8E7', iconBg: '#CC3F3A', textColor: '#8B1E1C',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
  {
    id: 'due_soon', label: "I'm struggling to finish", sub: "Script to ask for support",
    bg: '#FEF0DC', iconBg: '#B86B12', textColor: '#7A4608',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    id: 'need_extension', label: "I need more time", sub: "Script to request an extension",
    bg: '#EAE5FB', iconBg: '#7B6DD0', textColor: '#4A3FA0',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    id: 'confused', label: "I don't understand it", sub: "Script to ask for clarification",
    bg: '#D9F5E5', iconBg: '#1E8A55', textColor: '#145C38',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
];

export default function AdvocacySheet({ assignmentName, className, teacherName, dueDate, daysUntil, onClose }: Props) {
  const [step,     setStep]     = useState<'pick' | 'script'>('pick');
  const [selected, setSelected] = useState<Situation | null>(null);
  const [copied,   setCopied]   = useState(false);

  const daysLateStr = daysUntil < 0
    ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
    : daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

  function pick(sit: Situation) {
    setSelected(sit);
    setStep('script');
    setCopied(false);
  }

  function getScript(): { subject: string; body: string; tips: string[] } {
    if (!selected) return { subject: '', body: '', tips: [] };
    const t = ADVOCACY_TEMPLATES[selected];
    const vars = { assignment: assignmentName, class: className, days_late: daysLateStr, teacher: teacherName || undefined };
    return {
      subject: fillTemplate(t.subject, vars),
      body:    fillTemplate(t.script,  vars),
      tips:    t.tips,
    };
  }

  function copyToClipboard() {
    const { subject, body } = getScript();
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const sel     = SITUATIONS.find(s => s.id === selected);
  const content = step === 'script' ? getScript() : null;

  return (
    <>
      <style>{`
        @keyframes adv-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes adv-sheet { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(28,74,79,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'adv-fade 0.2s ease both' }} />

      {/* Sheet */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201, background: '#fff', borderRadius: '22px 22px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column', animation: 'adv-sheet 0.32s cubic-bezier(0.22,1,0.36,1) both', paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E3EBEA' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 14px', borderBottom: '0.5px solid #E3EBEA', display: 'flex', alignItems: 'center', gap: 12 }}>
          {step === 'script' && (
            <button onClick={() => setStep('pick')} style={{ background: 'rgba(28,74,79,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
            </button>
          )}
          <div style={{ width: 38, height: 38, borderRadius: 11, background: step === 'script' && sel ? sel.bg : '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {step === 'script' && sel ? (
              <div style={{ transform: 'scale(0.75)', display: 'flex' }}>{sel.icon}</div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: Colors.textPrimary, letterSpacing: '-0.02em' }}>
              {step === 'script' && sel ? sel.label : 'Talk to your teacher'}
            </div>
            <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {assignmentName} · {className}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: Colors.textHint, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>

          {/* ── Pick ── */}
          {step === 'pick' && (
            <>
              <p style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 1.5 }}>
                What's going on? Pick a situation and I'll give you a ready-to-send script.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SITUATIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => pick(s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, border: 'none', background: s.bg, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: s.textColor, letterSpacing: '-0.01em' }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: s.textColor, opacity: 0.7, marginTop: 2 }}>{s.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Script ── */}
          {step === 'script' && content && (
            <>
              {/* Subject line */}
              <div style={{ background: Colors.background, borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Subject</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary }}>{content.subject}</div>
              </div>

              {/* Script body */}
              <div style={{ background: Colors.background, borderRadius: 12, border: '1.5px solid #E3EBEA', padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: Colors.textPrimary, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {content.body}
                </div>
              </div>

              {/* Tips */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Tips</div>
                {content.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: Colors.forest, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.5, flex: 1 }}>{tip}</div>
                  </div>
                ))}
              </div>

              {/* Copy button */}
              <button
                onClick={copyToClipboard}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: copied ? '#D9F5E5' : Colors.forest, color: copied ? '#145C38' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
              >
                {copied ? (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied to clipboard!</>
                ) : (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy subject + message</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
