import { useState } from 'react';
import type { Assignment } from '../types';
import { daysUntil } from '../data/store';
import { Colors, getUrgencyConfig, getSubjectIconPaths } from '../theme';
import { UrgencyPill, CheckCircle } from './UI';
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
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg
        width={22} height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    </div>
  );
}

export default function AssignmentCard({
  assignment: a, onPress, onToggleDone, completing = false, onAnimationEnd,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const days      = daysUntil(a.dueDate);
  const u         = getUrgencyConfig(days);
  const completed = (a.subtasks ?? []).filter(s => s.done).length;
  const total     = (a.subtasks ?? []).length;

  // Icon bg/stroke matches urgency schema; muted when done
  const iconBg     = a.done ? Colors.grayLight : u.bg;
  const iconStroke = a.done ? Colors.textHint  : u.text;

  return (
    <div
      onClick={completing ? undefined : onPress}
      onAnimationEnd={completing ? onAnimationEnd : undefined}
      className={completing ? 'card-completing' : undefined}
      onMouseEnter={() => { if (!completing) setHovered(true);  }}
      onMouseLeave={() => { if (!completing) setHovered(false); }}
      style={{
        ...Styles.card,
        // Soft hover: border nudges to a mid gray-green, no opacity slam
        border: hovered
          ? '1.5px solid #C8D5D3'
          : '1.5px solid #E3EBEA',
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '0 14px 6px',
        padding: '13px 14px 13px 12px',
        cursor: completing ? 'default' : 'pointer',
        opacity: a.done && !completing ? 0.5 : 1,
        transition: 'border-color 0.18s ease, opacity 0.15s',
        borderRadius: 18,
        overflow: 'visible',
      }}
    >
      {/* Subject icon — color from urgency, shape from class name */}
      <SubjectIcon
        className={a.className ?? ''}
        bg={iconBg}
        stroke={iconStroke}
      />

      {/* Body */}
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

        {/* Progress bar — only when steps exist and not done */}
        {total > 0 && !a.done && (
          <div style={{ height: 2.5, background: '#F5F7F6', borderRadius: 2, marginTop: 7, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: '#B8E04A',
              width: `${Math.round((completed / total) * 100)}%`,
            }} />
          </div>
        )}
      </div>

      {/* Right — pill + chevron */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
        {!a.done && days < 0 && (
          <UrgencyPill label={`${Math.abs(days)}d late`} bg={u.bg} text={u.text} />
        )}
        {!a.done && days >= 0 && (
          <UrgencyPill label={u.label} bg={u.bg} text={u.text} />
        )}
        <CheckCircle checked={a.done} onToggle={onToggleDone} />
      </div>
    </div>
  );
}
