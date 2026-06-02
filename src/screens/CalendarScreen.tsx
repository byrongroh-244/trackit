import { useState, useEffect, useRef } from 'react';
import { useApp } from '../hooks/useApp';
import { daysUntil } from '../data/store';
import { Colors, getUrgencyConfig } from '../theme';
import { Screen, ScrollBody, BottomNav } from '../components/UI';
import { IconChevronLeft, IconChevronRight, IconChevronRight as IconArrow } from '../components/Icons';
import type { Assignment, Subtask } from '../types';

const NAV = [
  { label: 'Agenda',   icon: '', screen: 'today'    },
  { label: 'Calendar', icon: '', screen: 'calendar' },
  { label: 'Add',      icon: '', screen: 'add'      },
  { label: 'Classes',  icon: '', screen: 'classes'  },
  { label: 'Settings', icon: '', screen: 'settings' },
];

const DAYS         = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function isTestOrQuiz(type: Assignment['type']): boolean {
  return type === 'test' || type === 'quiz';
}
function toKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function today(): { y: number; m: number; d: number } {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
}
function assignmentsByDate(assignments: Assignment[]): Record<string, Assignment[]> {
  const map: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    if (!a.dueDate) continue;
    if (!map[a.dueDate]) map[a.dueDate] = [];
    map[a.dueDate].push(a);
  }
  return map;
}
function sortedMarkers(items: Assignment[]): Assignment[] {
  return [...items].sort((a, b) => {
    const rank = (t: string) => t === 'test' ? 0 : t === 'quiz' ? 1 : 2;
    return rank(a.type) - rank(b.type);
  });
}
function stepsDueOn(assignments: Assignment[], dateKey: string): { step: Subtask; assignment: Assignment }[] {
  const result: { step: Subtask; assignment: Assignment }[] = [];
  for (const a of assignments) {
    for (const s of a.subtasks ?? []) {
      if (s.dueDate === dateKey && !s.done) result.push({ step: s, assignment: a });
    }
  }
  return result;
}

// ── Marker dot/diamond for calendar cells ─────────────────────────────────────
// Dots = assignments (colored by urgency), diamonds = tests/quizzes
function CellMarker({ assignment, dateKey }: { assignment: Assignment; dateKey: string }) {
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
function DayPanel({ dateKey, items, allAssignments, onNavigate }: {
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
    steps: { step: import('../types').Subtask; assignment: Assignment }[];
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
function UpcomingTestsBanner({ byDate, onNavigate }: {
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
function MonthView({ year, month, byDate, allAssignments, selectedKey, onSelectDay, onNavigate }: {
  year: number; month: number;
  byDate: Record<string, Assignment[]>;
  allAssignments: Assignment[];
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
  onNavigate: (screen: any, id?: string) => void;
}) {
  const t = today();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const stepDates = new Set<string>();
  for (const a of allAssignments) {
    for (const s of a.subtasks ?? []) {
      if (s.dueDate && !s.done) stepDates.add(s.dueDate);
    }
  }

  const selectedItems = selectedKey ? (byDate[selectedKey] ?? []) : [];

  return (
    <div>
      {/* Day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 10px', marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: Colors.textHint, padding: '4px 0', letterSpacing: '0.04em' }}>
            {d.charAt(0)}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 10px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key    = toKey(year, month, day);
          const items  = byDate[key] ?? [];
          const active = items.filter(a => !a.done);
          const isToday    = year === t.y && month === t.m && day === t.d;
          const isSelected = key === selectedKey;
          const hasStep    = stepDates.has(key) && active.length === 0;
          const tappable   = items.length > 0 || stepDates.has(key);
          const sorted     = sortedMarkers(active).slice(0, 3);

          return (
            <div
              key={key}
              onClick={() => tappable ? onSelectDay(key) : undefined}
              style={{
                minHeight: 50,
                borderRadius: 10,
                padding: '5px 3px 4px',
                background: isSelected
                  ? Colors.forest
                  : isToday
                  ? '#E8F4F5'
                  : 'transparent',
                border: isToday && !isSelected
                  ? `1.5px solid ${Colors.forest}`
                  : '1.5px solid transparent',
                cursor: tappable ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'background 0.12s',
              }}
            >
              <div style={{
                fontSize: 13,
                fontWeight: isToday || isSelected ? 700 : 400,
                color: isSelected ? '#fff' : isToday ? Colors.forest : Colors.textPrimary,
                lineHeight: 1.3,
              }}>
                {day}
              </div>

              {/* Markers */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, minHeight: 8 }}>
                {sorted.map((a, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {isTestOrQuiz(a.type) ? (
                      <svg width="7" height="7" viewBox="0 0 8 8">
                        <rect x="1" y="1" width="6" height="6" rx="1"
                          transform="rotate(45 4 4)"
                          fill={isSelected ? '#fff' : getUrgencyConfig(daysUntil(key)).accent}
                        />
                      </svg>
                    ) : (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: isSelected ? 'rgba(255,255,255,0.7)' : getUrgencyConfig(daysUntil(key)).accent,
                        display: 'inline-block',
                      }} />
                    )}
                  </span>
                ))}
                {active.length > 3 && (
                  <span style={{ fontSize: 8, color: isSelected ? 'rgba(255,255,255,0.7)' : Colors.textHint, lineHeight: 1.8 }}>
                    +{active.length - 3}
                  </span>
                )}
                {hasStep && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: Colors.textHint, display: 'inline-block' }} />
                )}
              </div>

              {/* Lime pip on today */}
              {isToday && !isSelected && (
                <div style={{ width: 16, height: 2.5, borderRadius: 2, background: '#B8E04A' }} />
              )}
            </div>
          );
        })}
      </div>

      {selectedKey && (
        <DayPanel
          dateKey={selectedKey}
          items={selectedItems}
          allAssignments={allAssignments}
          onNavigate={onNavigate}
        />
      )}

      <UpcomingTestsBanner byDate={byDate} onNavigate={onNavigate} />
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────
function WeekView({ weekStart, byDate, allAssignments, selectedKey, onSelectDay, onNavigate }: {
  weekStart: Date;
  byDate: Record<string, Assignment[]>;
  allAssignments: Assignment[];
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
  onNavigate: (screen: any, id?: string) => void;
}) {
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const stepDates = new Set<string>();
  for (const a of allAssignments) {
    for (const s of a.subtasks ?? []) {
      if (s.dueDate && !s.done) stepDates.add(s.dueDate);
    }
  }

  const selectedItems = selectedKey ? (byDate[selectedKey] ?? []) : [];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, padding: '8px 10px' }}>
        {days.map(d => {
          const key     = toKey(d.getFullYear(), d.getMonth(), d.getDate());
          const items   = byDate[key] ?? [];
          const active  = items.filter(a => !a.done);
          const isToday = d.getFullYear() === t.y && d.getMonth() === t.m && d.getDate() === t.d;
          const isSelected = key === selectedKey;
          const hasStep = stepDates.has(key) && active.length === 0;
          const tappable = items.length > 0 || stepDates.has(key);
          const sorted  = sortedMarkers(active);

          // Show up to 2 names inline if only 1-2 items; dots for 3+
          const showNames = active.length > 0 && active.length <= 2;

          return (
            <div
              key={key}
              onClick={() => tappable ? onSelectDay(key) : undefined}
              style={{
                minHeight: 86,
                borderRadius: 12,
                padding: '7px 5px 6px',
                background: isSelected
                  ? Colors.forest
                  : isToday
                  ? '#E8F4F5'
                  : '#fff',
                border: isToday && !isSelected
                  ? `1.5px solid ${Colors.forest}`
                  : isSelected
                  ? 'none'
                  : '1.5px solid #E3EBEA',
                cursor: tappable ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isSelected ? 'rgba(255,255,255,0.6)' : isToday ? Colors.forest : Colors.textHint }}>
                {DAYS[d.getDay()]}
              </div>
              <div style={{ fontSize: 17, fontWeight: isToday || isSelected ? 700 : 500, color: isSelected ? '#fff' : isToday ? Colors.forest : Colors.textPrimary, lineHeight: 1.1 }}>
                {d.getDate()}
              </div>

              {/* Lime pip under today */}
              {isToday && !isSelected && (
                <div style={{ width: 16, height: 2.5, borderRadius: 2, background: '#B8E04A' }} />
              )}

              {/* Content: names if 1-2, dots if 3+ */}
              {showNames ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%', marginTop: 1 }}>
                  {active.slice(0, 2).map((a, idx) => {
                    const urgColor = isSelected ? 'rgba(255,255,255,0.85)' : getUrgencyConfig(daysUntil(key)).accent;
                    return (
                      <div key={idx} style={{
                        width: '90%', fontSize: 11, fontWeight: 600,
                        color: isSelected ? 'rgba(255,255,255,0.85)' : Colors.textPrimary,
                        background: isSelected ? 'rgba(255,255,255,0.12)' : `${getUrgencyConfig(daysUntil(key)).bg}`,
                        borderRadius: 4, padding: '2px 3px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 2,
                      }}>
                        {isTestOrQuiz(a.type) && (
                          <svg width="5" height="5" viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
                            <rect x="1" y="1" width="6" height="6" rx="1" transform="rotate(45 4 4)" fill={urgColor} />
                          </svg>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : active.length >= 3 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {sorted.slice(0, 4).map((a, idx) => (
                    isTestOrQuiz(a.type) ? (
                      <svg key={idx} width="7" height="7" viewBox="0 0 8 8">
                        <rect x="1" y="1" width="6" height="6" rx="1" transform="rotate(45 4 4)"
                          fill={isSelected ? '#fff' : getUrgencyConfig(daysUntil(key)).accent} />
                      </svg>
                    ) : (
                      <span key={idx} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: isSelected ? 'rgba(255,255,255,0.7)' : getUrgencyConfig(daysUntil(key)).accent,
                        display: 'inline-block',
                      }} />
                    )
                  ))}
                  {active.length > 4 && (
                    <span style={{ fontSize: 8, color: isSelected ? 'rgba(255,255,255,0.6)' : Colors.textHint, lineHeight: 1.8 }}>
                      +{active.length - 4}
                    </span>
                  )}
                </div>
              ) : hasStep ? (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.5)' : Colors.textHint, display: 'inline-block', marginTop: 2 }} />
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedKey && (
        <DayPanel
          dateKey={selectedKey}
          items={selectedItems}
          allAssignments={allAssignments}
          onNavigate={onNavigate}
        />
      )}

      <UpcomingTestsBanner byDate={byDate} onNavigate={onNavigate} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const { assignments, navigate } = useApp();
  const t = today();

  const [viewMode,    setViewMode]    = useState<'week' | 'month'>('week');
  const [month,       setMonth]       = useState(t.m);
  const [year,        setYear]        = useState(t.y);
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ── Swipe to navigate ─────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Only horizontal swipes (dx > 50, dy < 60)
    if (Math.abs(dx) > 50 && dy < 60) {
      if (dx < 0) nextPeriod();
      else prevPeriod();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  useEffect(() => {
    try {
      const target = sessionStorage.getItem('trackit_calendar_date');
      if (!target) return;
      sessionStorage.removeItem('trackit_calendar_date');
      setSelectedKey(target);
      const targetDate = new Date(target + 'T00:00:00');
      const todayDate  = new Date(); todayDate.setHours(0, 0, 0, 0);
      const targetDow  = targetDate.getDay();
      const targetMonDate = new Date(targetDate);
      targetMonDate.setDate(targetDate.getDate() - (targetDow === 0 ? 6 : targetDow - 1));
      const todayDow   = todayDate.getDay();
      const todayMon   = new Date(todayDate);
      todayMon.setDate(todayDate.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
      const weekDiff   = Math.round((targetMonDate.getTime() - todayMon.getTime()) / (7 * 86_400_000));
      setWeekOffset(weekDiff);
      setMonth(targetDate.getMonth());
      setYear(targetDate.getFullYear());
    } catch {}
  }, []);

  const byDate = assignmentsByDate(assignments);

  const now        = new Date();
  const dayOfWeek  = now.getDay();
  const monday     = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const weekLabel = () => {
    const end = new Date(monday);
    end.setDate(monday.getDate() + 6);
    if (monday.getMonth() === end.getMonth())
      return `${MONTHS_SHORT[monday.getMonth()]} ${monday.getDate()}–${end.getDate()}, ${monday.getFullYear()}`;
    return `${MONTHS_SHORT[monday.getMonth()]} ${monday.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;
  };

  function prevPeriod() {
    setSelectedKey(null);
    if (viewMode === 'week') setWeekOffset(o => o - 1);
    else { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  }
  function nextPeriod() {
    setSelectedKey(null);
    if (viewMode === 'week') setWeekOffset(o => o + 1);
    else { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
  }
  function goToToday() { setSelectedKey(null); setWeekOffset(0); setMonth(t.m); setYear(t.y); }

  const periodLabel = viewMode === 'week' ? weekLabel() : `${MONTHS[month]} ${year}`;

  return (
    <Screen>
      {/* Dark forest header — matches Today screen */}
      <div style={{ background: Colors.forest, padding: '22px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 27, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
              Calendar
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {periodLabel}
            </div>
          </div>
          <button
            onClick={goToToday}
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 12, fontWeight: 700, color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: '0.02em',
            }}
          >
            Today
          </button>
        </div>

        {/* Week/Month toggle + chevrons — inside header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 }}>
          <button
            onClick={prevPeriod}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}
          >
            <IconChevronLeft size={18} color="rgba(255,255,255,0.7)" />
          </button>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['week', 'month'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setSelectedKey(null); }}
                style={{
                  padding: '5px 18px', borderRadius: 7, border: 'none',
                  background: viewMode === mode ? '#fff' : 'transparent',
                  color: viewMode === mode ? Colors.forest : 'rgba(255,255,255,0.65)',
                  fontWeight: viewMode === mode ? 700 : 500,
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={nextPeriod}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <IconChevronRight size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>
      </div>

      <ScrollBody hasNav>
        <div
          style={{ paddingTop: 10 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {viewMode === 'week' ? (
            <WeekView
              weekStart={monday}
              byDate={byDate}
              allAssignments={assignments}
              selectedKey={selectedKey}
              onSelectDay={setSelectedKey}
              onNavigate={navigate}
            />
          ) : (
            <MonthView
              year={year} month={month}
              byDate={byDate}
              allAssignments={assignments}
              selectedKey={selectedKey}
              onSelectDay={setSelectedKey}
              onNavigate={navigate}
            />
          )}
        </div>
      </ScrollBody>

      <BottomNav current="calendar" onNavigate={s => navigate(s as any)} items={NAV} />
    </Screen>
  );
}
