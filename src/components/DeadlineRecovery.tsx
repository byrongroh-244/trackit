import { useState } from 'react';
import type { Assignment, CommunicationLog } from '../types';
import {
  DEADLINE_TIERS, getTierForDays, fillTemplate,
  type TierConfig, type TemplateOption,
} from '../data/deadlineTemplates';
import { Colors } from '../theme';
import { uid, daysUntil, formatLongDate } from '../data/store';
import { useToast } from './UI';
import { IconChevronLeft, IconRefreshCw, IconInfo } from './Icons';

// ── Colour map ────────────────────────────────────────────────────────────────

const URGENCY_COLORS: Record<TierConfig['urgencyColor'], string> = {
  teal:   Colors.teal,
  amber:  '#F59E0B',
  orange: '#F97316',
  red:    Colors.red,
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'triage' | 'pick_template' | 'in_person' | 'customize' | 'outcome';

interface Props {
  assignment:         Assignment;
  studentName:        string;
  onLogCommunication: (log: CommunicationLog) => void;
  onNewDeadline:      (date: string) => void;
}

// ── Shared input style ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 14,
  padding: '10px 12px',
  borderRadius: 8,
  border: '0.5px solid rgba(0,0,0,0.18)',
  fontFamily: 'inherit',
  color: Colors.textPrimary,
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeadlineRecovery({
  assignment, studentName, onLogCommunication, onNewDeadline,
}: Props) {
  const { showToast } = useToast();

  const rawDays    = daysUntil(assignment.dueDate);
  const daysPast   = rawDays < 0 ? Math.abs(rawDays) : 0;
  const tier       = getTierForDays(rawDays < 0 ? daysPast : rawDays);
  const accent     = URGENCY_COLORS[tier.urgencyColor];

  const [step,               setStep]               = useState<Step>('triage');
  const [selectedId,         setSelectedId]         = useState<string | null>(null);
  const [teacherName,        setTeacherName]        = useState(
    assignment.className || 'Teacher',
  );
  const [proposedDate,       setProposedDate]       = useState('');
  const [outcome,            setOutcome]            = useState<
    'yes' | 'no' | 'partial' | 'waiting' | null
  >(null);
  const [newDeadline,        setNewDeadline]        = useState('');
  const [outcomeNote,        setOutcomeNote]        = useState('');
  const [copied,             setCopied]             = useState(false);

  // Existing communication count
  const commCount = assignment.communications?.length ?? 0;

  // ── Token map ───────────────────────────────────────────────────────────────

  function tokens(): Record<string, string> {
    return {
      assignmentName: assignment.name,
      dueDate:        formatLongDate(assignment.dueDate),
      daysPastDue:    String(daysPast),
      teacherName:    teacherName || 'Teacher',
      className:      assignment.className,
      studentName:    studentName || 'Student',
      proposedDate:   proposedDate || '[new date]',
      counselorName:  'Counselor',
    };
  }

  function filled(text: string): string {
    return fillTemplate(text, tokens());
  }

  function selectedTemplate(): TemplateOption | null {
    return tier.templates.find(t => t.id === selectedId) ?? null;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  function handleCopy() {
    const t = selectedTemplate();
    if (!t) return;
    const text = `Subject: ${filled(t.subject)}\n\n${filled(t.body)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpenMail() {
    const t = selectedTemplate();
    if (!t) return;
    const s = encodeURIComponent(filled(t.subject));
    const b = encodeURIComponent(filled(t.body));
    window.open(`mailto:?subject=${s}&body=${b}`, '_blank');
  }

  function handleLogOutcome() {
    if (!outcome) return;
    const log: CommunicationLog = {
      id:          uid(),
      date:        new Date().toISOString().split('T')[0],
      tier:        tier.tier,
      type:        'email',
      status:
        outcome === 'yes'     ? 'teacher_yes'     :
        outcome === 'no'      ? 'teacher_no'       :
        outcome === 'partial' ? 'teacher_partial'  :
                                'sent_waiting',
      newDeadline: outcome === 'yes' ? (newDeadline || null) : null,
      notes:       outcomeNote,
    };
    onLogCommunication(log);
    if (outcome === 'yes' && newDeadline) {
      onNewDeadline(newDeadline);
    }
    showToast(
      outcome === 'yes'     ? 'New deadline saved'                      :
      outcome === 'no'      ? 'Logged. Focus on what comes next.'       :
      outcome === 'waiting' ? "Logged. We'll remind you to follow up."  :
                              'Logged.',
      outcome === 'yes' ? 'success' : 'info',
    );
    setStep('triage');
    setOutcome(null);
    setOutcomeNote('');
    setNewDeadline('');
  }

  // ── Shared back button ───────────────────────────────────────────────────────

  function BackButton({ to }: { to: Step }) {
    return (
      <button
        onClick={() => setStep(to)}
        style={{
          background: 'none', border: 'none',
          color: Colors.purple, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
          padding: 0, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <IconChevronLeft size={14} /> Back
      </button>
    );
  }

  // ── Grade reality check ──────────────────────────────────────────────────────

  function GradeCheck() {
    if (!assignment.weight) return null;
    return (
      <div style={{
        background: '#fff',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 14,
        fontSize: 12,
        color: Colors.textSecondary,
        lineHeight: 1.6,
        border: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <strong style={{ color: Colors.textPrimary }}>Grade impact:</strong>{' '}
        This assignment is worth {assignment.weight}% of your grade.
        Partial credit is significantly better than a zero. Sending a message is worth sending.
      </div>
    );
  }

  // ── STEP: triage ─────────────────────────────────────────────────────────────

  if (step === 'triage') return (
    <div style={{
      margin: '12px 18px',
      borderRadius: 14,
      border: `1.5px solid ${accent}`,
      background: `${accent}10`,
      padding: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 2 }}>
        {tier.title}
      </div>
      <div style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: 14 }}>
        {filled(tier.subtitle)}
      </div>

      <GradeCheck />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {/* Primary CTA */}
        <button
          onClick={() => setStep('pick_template')}
          style={{
            padding: '13px 16px', borderRadius: 11, border: 'none',
            background: accent, color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          ✉ {tier.actionLabel} →
        </button>

        {/* In-person script */}
        {tier.inPersonScript && (
          <button
            onClick={() => setStep('in_person')}
            style={{
              padding: '12px 16px', borderRadius: 11,
              border: `1px solid ${accent}`,
              background: 'transparent', color: accent,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            🗣 What to say in person
          </button>
        )}

        {/* Log outcome of prior communication */}
        {commCount > 0 && (
          <button
            onClick={() => setStep('outcome')}
            style={{
              padding: '11px 16px', borderRadius: 11,
              border: '0.5px solid rgba(0,0,0,0.12)',
              background: '#fff', color: Colors.textSecondary,
              fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <IconRefreshCw size={13} /> Log what happened after my last message
          </button>
        )}
      </div>

      {/* Emotional note */}
      <div style={{
        background: Colors.purpleLight,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        color: Colors.purple,
        lineHeight: 1.55,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
      }}>
        <IconInfo size={14} color={Colors.purple} />
        <span>{tier.emotionalNote}</span>
      </div>

      {/* Prior communication log */}
      {commCount > 0 && (
        <div style={{
          marginTop: 12,
          fontSize: 11,
          color: Colors.textHint,
          lineHeight: 1.5,
        }}>
          {commCount} prior message{commCount !== 1 ? 's' : ''} logged for this assignment.
        </div>
      )}
    </div>
  );

  // ── STEP: pick_template ───────────────────────────────────────────────────────

  if (step === 'pick_template') return (
    <div style={{ margin: '12px 18px' }}>
      <BackButton to="triage" />

      {/* Teacher name */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>
          TEACHER NAME
        </label>
        <input
          value={teacherName}
          onChange={e => setTeacherName(e.target.value)}
          placeholder="Mr. Smith / Ms. Jones"
          style={inputStyle}
        />
      </div>

      {/* Proposed date — Tiers 1 & 2 */}
      {(tier.tier === 1 || tier.tier === 2) && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>
            PROPOSED NEW DATE — be specific
          </label>
          <input
            type="date"
            value={proposedDate}
            onChange={e => setProposedDate(e.target.value)}
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: Colors.textHint, marginTop: 4 }}>
            A specific date gets more yes answers than "a few more days."
          </div>
        </div>
      )}

      {/* Template picker */}
      <div style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, marginBottom: 8 }}>
        CHOOSE A TEMPLATE
      </div>
      {tier.templates.map(t => (
        <div
          key={t.id}
          onClick={() => { setSelectedId(t.id); setStep('customize'); }}
          style={{
            borderRadius: 12,
            border: `1.5px solid ${selectedId === t.id ? accent : 'rgba(0,0,0,0.1)'}`,
            background: selectedId === t.id ? `${accent}08` : '#fff',
            padding: '12px 14px',
            marginBottom: 8,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>
            {t.label}
          </div>
          <div style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
            {t.situation}
          </div>
          {!t.toTeacher && (
            <div style={{
              fontSize: 11, color: accent, marginTop: 4, fontWeight: 500,
            }}>
              Sends to counselor, not teacher
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // ── STEP: customize (preview + send) ─────────────────────────────────────────

  if (step === 'customize') {
    const t = selectedTemplate();
    if (!t) { setStep('pick_template'); return null; }
    return (
      <div style={{ margin: '12px 18px' }}>
        <BackButton to="pick_template" />

        {/* Subject preview */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, marginBottom: 4 }}>
            SUBJECT
          </div>
          <div style={{
            background: Colors.grayLight, borderRadius: 8,
            padding: '8px 12px', fontSize: 13,
            color: Colors.textPrimary, fontWeight: 500,
          }}>
            {filled(t.subject)}
          </div>
        </div>

        {/* Body preview */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, marginBottom: 4 }}>
            BODY PREVIEW
          </div>
          <div style={{
            background: Colors.grayLight,
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 12,
            color: Colors.textPrimary,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            maxHeight: 260,
            overflowY: 'auto',
            fontFamily: 'monospace',
          }}>
            {filled(t.body)}
          </div>
        </div>

        {/* Five-minute rule */}
        <div style={{
          background: Colors.tealLight,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 12,
          color: Colors.tealDark,
          lineHeight: 1.55,
          marginBottom: 14,
        }}>
          <strong>The five-minute rule:</strong> Read it once. Send it.
          Do not wait until you feel ready — every hour of waiting makes it harder, not easier.
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            onClick={handleOpenMail}
            style={{
              flex: 1, padding: '13px', borderRadius: 11, border: 'none',
              background: accent, color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Open in Mail app
          </button>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, padding: '13px', borderRadius: 11,
              border: `1px solid ${accent}`,
              background: 'transparent', color: accent,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {copied ? '✓ Copied' : 'Copy text'}
          </button>
        </div>

        <button
          onClick={() => setStep('outcome')}
          style={{
            width: '100%', padding: '12px', borderRadius: 11,
            border: '0.5px solid rgba(0,0,0,0.12)',
            background: '#fff', color: Colors.textSecondary,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          I sent it — log what happened →
        </button>
      </div>
    );
  }

  // ── STEP: in_person ───────────────────────────────────────────────────────────

  if (step === 'in_person') {
    if (!tier.inPersonScript) { setStep('triage'); return null; }
    return (
      <div style={{ margin: '12px 18px' }}>
        <BackButton to="triage" />
        <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, marginBottom: 12 }}>
          What to say in person
        </div>
        <div style={{
          background: Colors.grayLight,
          borderRadius: 10,
          padding: '14px 16px',
          fontSize: 13,
          color: Colors.textPrimary,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {filled(tier.inPersonScript)}
        </div>
        <button
          onClick={() => setStep('outcome')}
          style={{
            width: '100%', marginTop: 14, padding: '12px', borderRadius: 11,
            border: '0.5px solid rgba(0,0,0,0.12)',
            background: '#fff', color: Colors.textSecondary,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Log how the conversation went →
        </button>
      </div>
    );
  }

  // ── STEP: outcome ─────────────────────────────────────────────────────────────

  if (step === 'outcome') return (
    <div style={{ margin: '12px 18px' }}>
      <BackButton to="triage" />
      <div style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, marginBottom: 14 }}>
        How did it go?
      </div>

      {([
        { key: 'yes',     label: 'They said yes — I have a new deadline',  color: Colors.teal          },
        { key: 'partial', label: 'Partial — something was worked out',      color: Colors.purple         },
        { key: 'waiting', label: 'Waiting — no response yet',               color: Colors.textSecondary  },
        { key: 'no',      label: 'They said no — the grade stands',         color: Colors.red            },
      ] as const).map(opt => (
        <div
          key={opt.key}
          onClick={() => setOutcome(opt.key)}
          style={{
            borderRadius: 12,
            border: `1.5px solid ${outcome === opt.key ? opt.color : 'rgba(0,0,0,0.1)'}`,
            background: outcome === opt.key ? `${opt.color}10` : '#fff',
            padding: '12px 16px',
            marginBottom: 8,
            cursor: 'pointer',
            fontSize: 14,
            color: outcome === opt.key ? opt.color : Colors.textPrimary,
            fontWeight: outcome === opt.key ? 600 : 400,
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </div>
      ))}

      {/* New deadline input — shown when teacher said yes */}
      {outcome === 'yes' && (
        <div style={{ marginTop: 8, marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: Colors.textSecondary, display: 'block', marginBottom: 5 }}>
            NEW DEADLINE
          </label>
          <input
            type="date"
            value={newDeadline}
            onChange={e => setNewDeadline(e.target.value)}
            style={{ ...inputStyle, border: `1px solid ${Colors.teal}` }}
          />
        </div>
      )}

      {/* Contextual notes */}
      {outcome === 'no' && (
        <div style={{
          background: Colors.purpleLight, borderRadius: 10,
          padding: '10px 14px', fontSize: 12, color: Colors.purple,
          lineHeight: 1.55, marginBottom: 10,
        }}>
          This is one grade. It is not your whole class. Here is what to focus on next.
        </div>
      )}
      {outcome === 'waiting' && (
        <div style={{
          fontSize: 12, color: Colors.textSecondary,
          lineHeight: 1.55, marginBottom: 10,
        }}>
          We will remind you in 2 days to follow up if you have not heard back.
        </div>
      )}

      {/* Optional notes */}
      <input
        placeholder="Optional notes about the conversation…"
        value={outcomeNote}
        onChange={e => setOutcomeNote(e.target.value)}
        style={{ ...inputStyle, marginTop: 6, marginBottom: 14 }}
      />

      <button
        onClick={handleLogOutcome}
        disabled={!outcome}
        style={{
          width: '100%', padding: '13px', borderRadius: 11, border: 'none',
          background: outcome ? Colors.purple : Colors.grayLight,
          color: outcome ? '#fff' : Colors.textHint,
          fontSize: 15, fontWeight: 600,
          cursor: outcome ? 'pointer' : 'default',
          fontFamily: 'inherit',
        }}
      >
        Save and continue
      </button>
    </div>
  );

  return null;
}
