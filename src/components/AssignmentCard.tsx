import { useState } from 'react';
import type { Assignment } from '../types';
import { daysUntil } from '../data/store';
import { Colors, getUrgencyConfig, getSubjectIconPaths } from '../theme';
import { UrgencyPill } from './UI';
import { Styles } from '../styles';

interface Props {
  assignment: Assignment;
  onPress: () => void;
  onToggleDone: () => void;
  completing?: boolean;
  onAnimationEnd?: () => void;
}

function SubjectIcon({ className, bg, stroke }: { className: string; bg: string; stroke: string }) {
  const paths = getSubjectIconPaths(className);
  return (
    <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    </div>
  );
}

export default function AssignmentCard({
  assignment: a, onPress, onToggleDone, completing = false, onAnimationEnd,
}: Props) {
  const [hovered,   setHovered]   = useState(false);
  const [checkPop,  setCheckPop]  = useState(false);
  const days      = daysUntil(a.dueDate);
  const u         = getUrgencyConfig(days);
  const completed = (a.subtasks ?? []).filter(s => s.done).length;
  const total     = (a.subtasks ?? []).length;
  const iconBg     = a.done ? Colors.grayLight : u.bg;
  const iconStroke = a.done ? Colors.textHint  : u.text;

  return (
    <>
      <style>{`
        @keyframes card-complete {
          0%   { transform: translateY(0)   scale(1);    opacity: 1; max-height: 90px; }
          30%  { transform: translateY(-6px) scale(0.98); opacity: 0.6; }
          100% { transform: translateY(-18px) scale(0.96); opacity: 0; max-height: 0; margin: 0; padding: 0; }
        }
        .card-completing {
          animation: card-complete 0.38s cubic-bezier(0.4,0,0.2,1) forwards;
          overflow: hidden;
          pointer-events: none;
        }
        @keyframes check-pop {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.35); }
          60%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        @keyframes check-draw {
          0%   { stroke-dashoffset: 20; opacity: 0; }
          40%  { opacity: 1; }
          100% { stroke-dashoffset: 0; }
        }
        .check-popping {
          animation: check-pop 0.32s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .check-draw polyline {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: check-draw 0.22s ease 0.06s forwards;
        }
      `}</style>
    <div
      onAnimationEnd={completing ? onAnimationEnd : undefined}
      className={completing ? 'card-completing' : undefined}
      style={{
        ...Styles.card,
        border: hovered ? '1.5px solid #C8D5D3' : '1.5px solid #E3EBEA',
        display: 'flex', alignItems: 'center', gap: 0,
        margin: '0 14px 6px',
        padding: 0,
        opacity: a.done && !completing ? 0.5 : 1,
        transition: 'border-color 0.18s ease, opacity 0.15s',
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      {/* ── Left / body — tappable area for detail view ── */}
      <button
        onClick={completing ? undefined : onPress}
        onMouseEnter={() => { if (!completing) setHovered(true); }}
        onMouseLeave={() => { if (!completing) setHovered(false); }}
        style={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 0 13px 12px',
          background: 'none', border: 'none',
          cursor: completing ? 'default' : 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <SubjectIcon className={a.className ?? ''} bg={iconBg} stroke={iconStroke} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700,
            letterSpacing: '-0.02em',
            textDecoration: a.done ? 'line-through' : 'none',
            color: a.done ? Colors.textSecondary : Colors.textPrimary,
            marginBottom: 3,
          }}>
            {a.name}
          </div>
          <div style={{ fontSize: 12, color: Colors.textHint, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.classColor, display: 'inline-block', flexShrink: 0 }} />
            {a.className}
            {total > 0 && !a.done && (
              <><span style={{ color: '#E3EBEA' }}>·</span>
              <span style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, fontWeight: 600 }}>
                {completed} / {total} steps
              </span></>
            )}
            {a.effort && !a.done && (
              <><span style={{ color: '#E3EBEA' }}>·</span>
              <span style={{ fontSize: 11 }}>
                {a.effort === 'quick' ? 'Quick' : a.effort === 'medium' ? 'Medium' : 'Long'}
              </span></>
            )}
          </div>
          {total > 0 && !a.done && (
            <div style={{ height: 2.5, background: '#F5F7F6', borderRadius: 2, marginTop: 7, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: '#B8E04A', width: `${Math.round((completed / total) * 100)}%` }} />
            </div>
          )}
        </div>
      </button>

      {/* ── Right — urgency pill + check button ── */}
      {/* Separate button — completely independent tap target, no stopPropagation needed */}
      <button
        onClick={() => {
          if (!a.done) {
            setCheckPop(true);
            setTimeout(() => setCheckPop(false), 400);
          }
          onToggleDone();
        }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 7, padding: '13px 14px',
          background: 'none', border: 'none',
          cursor: 'pointer', flexShrink: 0,
          minWidth: 64,
        }}
      >
        {!a.done && days < 0 && <UrgencyPill label={`${Math.abs(days)}d late`} bg={u.bg} text={u.text} />}
        {!a.done && days >= 0 && <UrgencyPill label={u.label} bg={u.bg} text={u.text} />}

        {/* Check circle — inline, no CheckCircle wrapper needed */}
        <div
          className={checkPop ? 'check-popping' : undefined}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            border: `2px solid ${a.done ? '#B8E04A' : 'rgba(0,0,0,0.18)'}`,
            background: a.done ? '#B8E04A' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          {a.done && (
            <svg className="check-draw" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </button>
    </div>
    </>
  );
}
