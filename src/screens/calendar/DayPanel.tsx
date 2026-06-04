import React from 'react';
import { Colors, getUrgencyConfig } from '../../theme';
import { daysUntil } from '../../data/store';
import type { Assignment, Subtask } from '../../types';
import { IconChevronRight as IconArrow } from '../../components/Icons';
import { isTestOrQuiz, toKey, today, sortedMarkers, stepsDueOn, DAYS, MONTHS_SHORT } from './calendarUtils';

export function CellMarker({ assignment, dateKey }: { assignment: Assignment; dateKey: string }) {
  const days = daysUntil(dateKey);
  const u = getUrgencyConfig(days);
  const color = assignment.done ? Colors.textHint : u.accent;

  if (isTestOrQuiz(assignment.type)) {
    // Diamond shape for tests/quizzes — visually distinct from dots
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
        <rect x="1" y="1" width="6" height="6" rx="1" transform="rotate(45 4 4)" fill={color} />
      </svg>
    );
  }
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: color,
      display: 'inline-block', flexShrink: 0,
    }} />
  );
}

// ── Day detail panel — grouped by class ──────────────────────────────────────
export function DayPanel({ dateKey, items, allAssignments, onNavigate }: {
  dateKey: string;
  items: Assignment[];
  allAssignments: Assignment[];
  onNavigate: (screen: any, id?: string) => void;
}) {
  const d          = new Date(dateKey + 'T00:00:00');
  const label      = `${DAYS[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  const active     = items.filter(a => !a.done);
  const done       = items.filter(a => a.done);
  const stepsToday = stepsDueOn(allAssignments, dateKey);
  const days       = daysUntil(dateKey);
  const u          = getUrgencyConfig(days);
  const isEmpty    = active.length === 0 && done.length === 0 && stepsToday.length === 0;

  // ── Group active assignments + steps by className ──────────────────────────
  type ClassGroup = {
    className: string;
    classColor: string;
    assignments: Assignment[];
    steps: { step: Subtask; assignment: Assignment }[];
  };

  const groupMap = new Map<string, ClassGroup>();

  for (const a of active) {
    const key = a.className ?? 'Other';
    if (!groupMap.has(key)) groupMap.set(key, { className: key, classColor: a.classColor, assignments: [], steps: [] });
    groupMap.get(key)!.assignments.push(a);
  }
  for (const { step, assignment: a } of stepsToday) {
    const key = a.className ?? 'Other';
    if (!groupMap.has(key)) groupMap.set(key, { className: key, classColor: a.classColor, assignments: [], steps: [] });
    groupMap.get(key)!.steps.push({ step, assignment: a });
  }

  const groups = Array.from(groupMap.values()).sort((a, b) => a.className.localeCompare(b.className));

  return (
    <div style={{ margin: '10px 14px 4px', background: '#fff', borderRadius: 18, border: '1.5px solid #E3EBEA', overflow: 'hidden' }}>

      {/* Panel header */}
      <div style={{ padding: '12px 16px 10px', borderBottom: '0.5px solid #E3EBEA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: Colors.textPrimary, letterSpacing: '-0.02em' }}>{label}</div>
        {active.length > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, background: u.bg, color: u.text, padding: '2px 8px', borderRadius: 999 }}>
            {active.length} due
          </span>
        )}
      </div>

      {isEmpty && (
        <div style={{ padding: '14px 16px', fontSize: 13, color: Colors.textHint }}>Nothing due this day.</div>
      )}

      {/* Class groups */}
      {groups.map((group, gi) => (
        <div key={group.className} style={{ borderBottom: gi < groups.length - 1 || done.length > 0 ? '0.5px solid #E3EBEA' : 'none' }}>

          {/* Class heading */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px 6px',
            background: Colors.background,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.classColor, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: Colors.textPrimary, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              {group.className}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: Colors.textHint, marginLeft: 2 }}>
              {group.assignments.length + group.steps.length} item{group.assignments.length + group.steps.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Assignments — indented */}
          {group.assignments.map((a, i) => {
            const u2 = getUrgencyConfig(daysUntil(a.dueDate));
            const isLast = i === group.assignments.length - 1 && group.steps.length === 0;
            return (
              <div
                key={a.id}
                onClick={() => onNavigate('detail', a.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px 10px 28px',
                  borderBottom: isLast ? 'none' : '0.5px solid #F0F4F3',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = Colors.background)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Indent connector line */}
                <div style={{ width: 2, height: 32, borderRadius: 1, background: u2.accent, flexShrink: 0, opacity: 0.6 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    {isTestOrQuiz(a.type) && (
                      <span style={{ fontSize: 10, fontWeight: 600, background: u2.bg, color: u2.text, padding: '1px 6px', borderRadius: 999 }}>
                        {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: u2.text, background: u2.bg, padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>
                  {u2.label}
                </span>
                <IconArrow size={13} color={Colors.textHint} />
              </div>
            );
          })}

          {/* Steps — indented below assignments */}
          {group.steps.map(({ step, assignment: a }, i) => (
            <div
              key={step.id}
              onClick={() => onNavigate('detail', a.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '8px 16px 8px 28px',
                borderBottom: i < group.steps.length - 1 ? '0.5px solid #F0F4F3' : 'none',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = Colors.background)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${group.classColor}`, flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: Colors.textPrimary, lineHeight: 1.4 }}>{step.text}</div>
                <div style={{ fontSize: 11, color: Colors.textHint, marginTop: 1 }}>{a.name}</div>
              </div>
              <IconArrow size={13} color={Colors.textHint} />
            </div>
          ))}
        </div>
      ))}

      {/* Completed — collapsed at bottom */}
      {done.length > 0 && (
        <div style={{ borderTop: '0.5px solid #E3EBEA' }}>
          <div style={{ padding: '7px 16px 5px', fontSize: 10, fontWeight: 600, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Completed
          </div>
          {done.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 8px 28px', opacity: 0.45 }}>
              <div style={{ width: 2, height: 24, borderRadius: 1, background: Colors.textHint, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: Colors.textSecondary, textDecoration: 'line-through', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Upcoming tests banner (amber, both views) ─────────────────────────────────
export function UpcomingTestsBanner({ byDate, onNavigate }: {
  byDate: Record<string, Assignment[]>;
  onNavigate: (screen: any, id?: string) => void;
}) {
  const upcoming: Assignment[] = [];
  for (const items of Object.values(byDate)) {
    for (const a of items) {
      const d = daysUntil(a.dueDate);
      if (!a.done && isTestOrQuiz(a.type) && d >= 0 && d <= 21) upcoming.push(a);
    }
  }
  upcoming.sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
  if (upcoming.length === 0) return null;

  return (
    <div style={{
      margin: '10px 14px 4px',
      background: Colors.amberLight,
      borderRadius: 18,
      border: `1.5px solid ${Colors.amberAccent}33`,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '11px 16px 9px',
        fontSize: 12, fontWeight: 700,
        color: Colors.amberDark,
        borderBottom: '0.5px solid rgba(186,117,23,0.15)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {/* Diamond icon for tests */}
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="1" y="1" width="8" height="8" rx="1.5" transform="rotate(45 5 5)" fill={Colors.amber} />
        </svg>
        Upcoming tests & quizzes
      </div>
      {upcoming.map((a, i) => {
        const d = daysUntil(a.dueDate);
        const label = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`;
        const urgent = d <= 3;
        return (
          <div
            key={a.id}
            onClick={() => onNavigate('detail', a.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: i < upcoming.length - 1 ? '0.5px solid rgba(186,117,23,0.12)' : 'none',
              cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(186,117,23,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: Colors.amberDark, letterSpacing: '-0.01em' }}>{a.name}</div>
              <div style={{ fontSize: 11, color: Colors.amber, marginTop: 1 }}>{a.className}</div>
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 12,
              color: urgent ? Colors.red : Colors.amber,
              background: urgent ? Colors.redLight : 'transparent',
              padding: urgent ? '2px 8px' : '0',
              borderRadius: 999,
            }}>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
