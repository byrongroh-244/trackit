import { useState } from 'react';
import { Colors } from '../theme';

const SUPABASE_FUNCTION_URL = 'https://vnofpgowelblwkonkeab.supabase.co/functions/v1/advocacy-script';
const SUPABASE_ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub2ZwZ293ZWxibHdrb25rZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTIzNDEsImV4cCI6MjA5NTQ4ODM0MX0.WPHYoSzUjlXlB8ezsh_IrnFqWt_F33HL36tZgk0vjZc';

type Situation = 'overdue' | 'due_soon' | 'need_extension' | 'confused';

interface Props {
  assignmentName: string;
  className: string;
  dueDate: string;
  daysUntil: number;
  onClose: () => void;
}

const SITUATIONS: { id: Situation; label: string; sub: string; bg: string; iconBg: string; textColor: string }[] = [
  {
    id: 'overdue',
    label: "I missed the deadline",
    sub: "Script to repair and recover",
    bg: '#FEE8E7', iconBg: '#CC3F3A', textColor: '#8B1E1C',
  },
  {
    id: 'due_soon',
    label: "I'm struggling to finish",
    sub: "Script to ask for support",
    bg: '#FEF0DC', iconBg: '#B86B12', textColor: '#7A4608',
  },
  {
    id: 'need_extension',
    label: "I need more time",
    sub: "Script to request an extension",
    bg: '#EAE5FB', iconBg: '#7B6DD0', textColor: '#4A3FA0',
  },
  {
    id: 'confused',
    label: "I don't understand the assignment",
    sub: "Script to ask for clarification",
    bg: '#D9F5E5', iconBg: '#1E8A55', textColor: '#145C38',
  },
];

const ICONS: Record<Situation, JSX.Element> = {
  overdue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  due_soon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  need_extension: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  confused: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

async function generateScript(
  situation: Situation,
  assignmentName: string,
  className: string,
  dueDate: string,
  daysUntil: number,
): Promise<string> {
  const situationLabels: Record<Situation, string> = {
    overdue:        'missed the deadline',
    due_soon:       'struggling to finish before the deadline',
    need_extension: 'needs more time and wants to request an extension',
    confused:       'confused about the assignment requirements',
  };

  const prompt = `You are helping a neurodivergent student write a short, respectful email or verbal script to talk to their teacher. 

Assignment: "${assignmentName}"
Class: ${className}
Due date: ${dueDate}
Days until due: ${daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days away`}
Situation: The student has ${situationLabels[situation]}.

Write a short, honest, and respectful script they can say or send to their teacher. 
- Keep it under 100 words
- Use simple, direct language appropriate for a high school student
- Include: a greeting, what they're reaching out about, what they need, and a thank you
- Don't be overly formal or use language that sounds like an adult wrote it
- Format it as a ready-to-use message with [Teacher Name] as a placeholder
- After the script, add 2-3 short "tips" on how to deliver it

Return only the script and tips, no preamble.`;

  const response = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) throw new Error('Could not generate script');
  const data = await response.json();
  // Extract text from content blocks
  return data.script || 'Could not generate script. Please try again.';
}

export default function AdvocacySheet({ assignmentName, className, dueDate, daysUntil, onClose }: Props) {
  const [step,     setStep]     = useState<'pick' | 'loading' | 'script'>('pick');
  const [selected, setSelected] = useState<Situation | null>(null);
  const [script,   setScript]   = useState('');
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);

  async function generate(sit: Situation) {
    setSelected(sit);
    setStep('loading');
    setError('');
    try {
      const text = await generateScript(sit, assignmentName, className, dueDate, daysUntil);
      setScript(text);
      setStep('script');
    } catch {
      setError('Could not generate script. Check your connection and try again.');
      setStep('pick');
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sel = SITUATIONS.find(s => s.id === selected);

  return (
    <>
      <style>{`
        @keyframes sheet-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(28,74,79,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'fade-in 0.2s ease both' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
        background: '#fff',
        borderRadius: '22px 22px 0 0',
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        animation: 'sheet-up 0.32s cubic-bezier(0.22,1,0.36,1) both',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E3EBEA' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 14px', borderBottom: '0.5px solid #E3EBEA', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: Colors.textPrimary, letterSpacing: '-0.02em' }}>
              Talk to your teacher
            </div>
            <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {assignmentName} · {className}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: Colors.textHint }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>

          {/* ── Pick situation ── */}
          {step === 'pick' && (
            <>
              <p style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 1.5 }}>
                What's going on? I'll write a script you can say or send.
              </p>
              {error && (
                <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: Colors.redLight, color: Colors.red, fontSize: 13, marginBottom: 14 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SITUATIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => generate(s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, border: 'none', background: s.bg, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {ICONS[s.id]}
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

          {/* ── Loading ── */}
          {step === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: sel?.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selected && ICONS[selected]}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary }}>Writing your script…</div>
              <div style={{ fontSize: 13, color: Colors.textHint }}>This takes a few seconds</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: Colors.forest,
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.3,
                  }} />
                ))}
              </div>
              <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
            </div>
          )}

          {/* ── Script ── */}
          {step === 'script' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: sel?.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected && <span style={{ transform: 'scale(0.7)', display: 'flex' }}>{ICONS[selected]}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: sel?.textColor }}>{sel?.label}</div>
                <button onClick={() => setStep('pick')} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 12, color: Colors.textHint, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Change
                </button>
              </div>

              {/* Script box */}
              <div style={{ background: Colors.background, borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '16px', marginBottom: 14, position: 'relative' }}>
                <div style={{ fontSize: 13, color: Colors.textPrimary, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {script}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={copyToClipboard}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: copied ? '#D9F5E5' : Colors.forest, color: copied ? '#145C38' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                >
                  {copied ? (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy script</>
                  )}
                </button>
                <button
                  onClick={() => generate(selected!)}
                  style={{ padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E3EBEA', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: Colors.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Retry
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
