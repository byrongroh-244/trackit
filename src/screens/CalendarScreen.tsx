import React, { useState, useEffect, useRef } from 'react';
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

export interface ClassPeriod {
  name:         string;
  color:        string;
  days:         number[];   // 0=Sun, 1=Mon … 6=Sat
  startHour:    number;
  startMin:     number;
  endHour:      number;
  endMin:       number;
  room?:        string;
  blockDay?:    'A' | 'B' | null;
  altStartHour?: number;  // alt day (late start/early release) start
  altStartMin?:  number;
  altEndHour?:   number;
  altEndMin?:    number;
}

// ── Week view ─────────────────────────────────────────────────────────────────
// Identical visual to DayView — 7 columns side by side, same hour axis,
// same class blocks, same free windows, same current-time line.
function WeekView({ weekStart, byDate, allAssignments, selectedKey, onSelectDay, onNavigate, dayOverrides, setOverride, hourPx, getDerivedBlockDay }: {
  weekStart: Date;
  byDate: Record<string, Assignment[]>;
  allAssignments: Assignment[];
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
  onNavigate: (screen: any, id?: string) => void;
  dayOverrides: Record<string, 'A' | 'B' | 'off'>;
  setOverride: (key: string, val: 'A' | 'B' | 'off' | null) => void;
  hourPx: number;
  getDerivedBlockDay: (key: string) => 'A' | 'B' | null;
}) {
  const t   = today();
  const now = new Date();
  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  const START_HOUR = 7;
  const END_HOUR   = 18;
  const HOUR_PX    = 56;
  const totalH     = (END_HOUR - START_HOUR) * HOUR_PX;
  const hours      = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  function toY(h: number, m: number) { return ((h - START_HOUR) + m / 60) * HOUR_PX; }
  function toH(sh: number, sm: number, eh: number, em: number) {
    return ((eh - sh) + (em - sm) / 60) * HOUR_PX;
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Load schedule only — overrides come from props
  let schedule: ClassPeriod[] = [];
  let scheduleType: 'standard' | 'block' = 'standard';
  try {
    const raw = localStorage.getItem('trackit_class_schedule');
    if (raw) schedule = JSON.parse(raw);
    scheduleType = (localStorage.getItem('trackit_schedule_type') as any) ?? 'standard';
  } catch {}

  // Load adjusted days once for WeekView
  let wvAdjustedDays: { label: string }[] = [];
  try {
    const r = localStorage.getItem('trackit_adjusted_days');
    if (r) wvAdjustedDays = JSON.parse(r);
  } catch {}
  const WV_DAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function getPeriodsForDay(d: Date): ClassPeriod[] {
    const dow = d.getDay();
    const key = toKey(d.getFullYear(), d.getMonth(), d.getDate());
    const override = dayOverrides[key] as 'A' | 'B' | 'off' | undefined;
    if (override === 'off') return [];
    const effectiveDay = (override === 'A' || override === 'B')
      ? override
      : getDerivedBlockDay(key);
    const dowFull = WV_DAY_FULL[dow];
    const adjDay  = wvAdjustedDays.find(a => a.label.toLowerCase().includes(dowFull.toLowerCase()));
    return schedule.filter(p => {
      if (!p.days.includes(dow)) return false;
      if (scheduleType !== 'block' || !p.blockDay) return true;
      if (effectiveDay) return p.blockDay === effectiveDay;
      return true;
    }).map(p => {
      // On alt days, swap in the alt times stored on the period
      if (adjDay && p.altStartHour != null && p.altEndHour != null) {
        return { ...p, startHour: p.altStartHour, startMin: p.altStartMin ?? 0, endHour: p.altEndHour, endMin: p.altEndMin ?? 0 };
      }
      return p;
    });
  }

  function getFreeWindows(periods: ClassPeriod[]) {
    if (periods.length === 0) return [];
    type W = { startH: number; startM: number; endH: number; endM: number; label: string };
    const wins: W[] = [];
    const sorted = [...periods].sort((a,b) => a.startHour*60+a.startMin - (b.startHour*60+b.startMin));
    let cursor = { h: START_HOUR, m: 0 };
    for (const p of sorted) {
      const gap = (p.startHour - cursor.h)*60 + (p.startMin - cursor.m);
      if (gap >= 30) {
        const dur = gap >= 60
          ? `${Math.floor(gap/60)}h${gap%60>0?` ${gap%60}m`:''}`
          : `${gap}m`;
        wins.push({ startH: cursor.h, startM: cursor.m, endH: p.startHour, endM: p.startMin, label: dur });
      }
      cursor = { h: p.endHour, m: p.endMin };
    }
    const after = (END_HOUR - cursor.h)*60 - cursor.m;
    if (after >= 30) {
      const dur = after >= 60 ? `${Math.floor(after/60)}h${after%60>0?` ${after%60}m`:''}` : `${after}m`;
      wins.push({ startH: cursor.h, startM: cursor.m, endH: END_HOUR, endM: 0, label: dur });
    }
    return wins;
  }

  const nowY = toY(now.getHours(), now.getMinutes());

  return (
    <div>
      <div style={{ paddingBottom: 4 }}>
        <div style={{ padding: '10px 10px 0' }}>

          {/* Day header row — identical typography to DayView assignment cards */}
          <div style={{ display: 'flex', marginLeft: 40, marginBottom: 8 }}>
            {days.map(d => {
              const key    = toKey(d.getFullYear(), d.getMonth(), d.getDate());
              const isToday = key === todayKey;
              const override = dayOverrides[key] as 'A' | 'B' | 'off' | undefined;
              const active  = (byDate[key] ?? []).filter(a => !a.done);
              const u       = getUrgencyConfig(daysUntil(key));
              return (
                <div key={key} onClick={() => onSelectDay(key)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                  {/* Day name */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? Colors.forest : Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {DAYS[d.getDay()].slice(0,2)}
                  </div>
                  {/* Date number */}
                  <div style={{ fontSize: 17, fontWeight: isToday ? 800 : 500, color: isToday ? Colors.forest : Colors.textPrimary, lineHeight: 1.1 }}>
                    {d.getDate()}
                  </div>
                  {/* Lime pip under today */}
                  {isToday && <div style={{ width: 14, height: 2.5, borderRadius: 2, background: '#B8E04A', margin: '2px auto' }} />}
                  {/* A/B/off badge */}
                  {override === 'off' && <div style={{ fontSize: 10, fontWeight: 700, color: '#B86B12' }}>off</div>}
                  {(override === 'A' || override === 'B') && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: Colors.forest }}>{override}-day</div>
                  )}
                  {!override && (() => { const d = getDerivedBlockDay(key); return d ? <div style={{ fontSize: 10, fontWeight: 500, color: Colors.textHint }}>{d}-day</div> : null; })()}
                  {/* Due count badge */}
                  {active.length > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: u.text, background: u.bg, borderRadius: 999, padding: '2px 7px', display: 'inline-block', marginTop: 3 }}>
                      {active.length}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time axis + 7 day columns */}
          <div style={{ display: 'flex', width: '100%' }}>

            {/* Hour labels — same style as DayView */}
            <div style={{ width: 40, flexShrink: 0, position: 'relative', height: totalH }}>
              {hours.map(h => (
                <div key={h} style={{
                  position: 'absolute',
                  top: (h - START_HOUR) * HOUR_PX - 6,
                  right: 6,
                  fontSize: 10, fontWeight: 500, color: Colors.textHint, lineHeight: 1,
                }}>
                  {h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}
                </div>
              ))}
            </div>

            {/* 7 columns */}
            {days.map(d => {
              const key      = toKey(d.getFullYear(), d.getMonth(), d.getDate());
              const isToday  = key === todayKey;
              const override = dayOverrides[key] as 'A' | 'B' | 'off' | undefined;
              const isOff    = override === 'off';
              const periods  = getPeriodsForDay(d);
              const freeWins = getFreeWindows(periods);
              const asgns    = (byDate[key] ?? []).filter(a => !a.done);

              return (
                <div key={key} style={{ flex: 1, position: 'relative', height: totalH, minWidth: 0 }}>

                  {/* Hour grid lines — same as DayView */}
                  {hours.map(h => (
                    <div key={h} style={{
                      position: 'absolute', top: (h - START_HOUR) * HOUR_PX, left: 0, right: 0,
                      borderTop: '0.5px solid #E3EBEA', opacity: 0.6,
                    }} />
                  ))}

                  {/* Left border — matches DayView borderLeft */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0,
                    borderLeft: `0.5px solid ${isToday ? Colors.forest + '66' : '#E3EBEA'}`,
                  }} />

                  {/* Today background tint */}
                  {isToday && (
                    <div style={{ position: 'absolute', inset: 0, background: '#E8F4F508', pointerEvents: 'none' }} />
                  )}

                  {/* Current time line — same style as DayView: 1.5px lime + dot */}
                  {isToday && nowY >= 0 && nowY <= totalH && (
                    <div style={{ position: 'absolute', top: nowY, left: 0, right: 0, borderTop: '1.5px solid #B8E04A', zIndex: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#B8E04A', marginTop: -4, marginLeft: -3 }} />
                    </div>
                  )}

                  {/* Off / PIR overlay */}
                  {isOff && (
                    <div style={{ position: 'absolute', inset: 0, background: '#FEF0DC33', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#B86B12', writingMode: 'vertical-rl' as any, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Off</span>
                    </div>
                  )}

                  {/* Free windows — same style as DayView: #E8F4F5 + dashed forest border */}
                  {!isOff && freeWins.map((w, i) => (
                    <div key={i} style={{
                      position: 'absolute', left: 2, right: 2,
                      top: toY(w.startH, w.startM),
                      height: Math.max(toH(w.startH, w.startM, w.endH, w.endM) - 2, 14),
                      background: '#E8F4F5',
                      border: '1px dashed #1c4a4f',
                      borderRadius: 6,
                      zIndex: 1, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {/* Duration label — abbreviated for narrow columns */}
                      <span style={{ fontSize: 10, color: '#1c4a4f', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>{w.label}</span>
                    </div>
                  ))}

                  {/* Class period blocks — same style as DayView: color22 bg + 3px left border */}
                  {!isOff && periods.map((p, i) => (
                    <div key={i} style={{
                      position: 'absolute', left: 2, right: 2,
                      top: toY(p.startHour, p.startMin) + 1,
                      height: Math.max(toH(p.startHour, p.startMin, p.endHour, p.endMin) - 2, 16),
                      background: `${p.color}22`,
                      borderRadius: 6,
                      borderLeft: `3px solid ${p.color}`,
                      padding: '3px 4px',
                      zIndex: 2, overflow: 'hidden',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: p.color, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      {p.room && (
                        <div style={{ fontSize: 10, color: p.color, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.room}</div>
                      )}
                    </div>
                  ))}

                  {/* Assignment chips — anchored above their class period */}
                  {asgns.map((a, ai) => {
                    const u      = getUrgencyConfig(daysUntil(key));
                    const period = periods.find(p => p.name === a.className || p.color === a.classColor);
                    const chipY  = period
                      ? Math.max(2, toY(period.startHour, period.startMin) - 14 - ai * 13)
                      : totalH - 14 - ai * 14;
                    return (
                      <div
                        key={a.id}
                        onClick={() => { onSelectDay(key); onNavigate('detail', a.id); }}
                        style={{
                          position: 'absolute', left: 2, right: 2,
                          top: Math.max(2, Math.min(totalH - 13, chipY)),
                          height: 16,
                          background: u.bg,
                          borderRadius: 4,
                          zIndex: 5, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', overflow: 'hidden', padding: '0 4px', gap: 3,
                        }}
                      >
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: u.accent, flexShrink: 0 }} />
                        <div style={{ fontSize: 10, fontWeight: 700, color: u.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name.split(' ').slice(0,2).join(' ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <UpcomingTestsBanner byDate={byDate} onNavigate={onNavigate} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const { assignments, navigate } = useApp();
  const t = today();

  const [viewMode,    setViewMode]    = useState<'day' | 'week' | 'month'>('week');
  const [dayKey,      setDayKey]      = useState<string>(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; });
  const [month,       setMonth]       = useState(t.m);
  const [year,        setYear]        = useState(t.y);
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ── Zoom state (pinch-to-zoom scales hour height) ──────────────────────────
  const [hourPx, setHourPx] = useState(56);
  const HOUR_PX_MIN = 36;
  const HOUR_PX_MAX = 120;

  // ── Shared A/B day override state — used by both WeekView and DayView ────────
  const [dayOverrides, setDayOverrides] = useState<Record<string, 'A' | 'B' | 'off'>>(() => {
    try { return JSON.parse(localStorage.getItem('trackit_day_overrides') ?? '{}'); } catch { return {}; }
  });

  function setOverride(key: string, val: 'A' | 'B' | 'off' | null) {
    setDayOverrides(prev => {
      const next = { ...prev };
      if (val === null) { delete next[key]; }
      else { next[key] = val; }
      try { localStorage.setItem('trackit_day_overrides', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Derive A or B for any date purely from the anchor week + overrides.
  // No stored inference — calculated on every render.
  // anchor = the Monday of the first week classes were entered (= A-week)
  // Walk backwards from dateKey to find the nearest override or anchor,
  // then count real school days (skipping Off) to determine odd/even.
  function getDerivedBlockDay(dateKey: string): 'A' | 'B' | null {
    const scheduleType = localStorage.getItem('trackit_schedule_type') ?? 'standard';
    if (scheduleType !== 'block') return null;

    let anchor = localStorage.getItem('trackit_block_anchor');
    if (!anchor) {
      // Auto-set anchor to this Monday so block schedule works immediately
      const now = new Date();
      const dow = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      anchor = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
      try { localStorage.setItem('trackit_block_anchor', anchor); } catch {}
    }

    const target = new Date(dateKey + 'T00:00:00');
    if (target.getDay() === 0 || target.getDay() === 6) return null; // skip weekends

    const anchorDate = new Date(anchor + 'T00:00:00');

    // ── Find the most recent A/B override at or before target ─────────────
    // This becomes the new "anchor point" for the rolling 14-day window.
    // If no override exists yet, the original anchor (= A) is used.
    let nearestDate = anchorDate;
    let nearestVal: 'A' | 'B' = 'A';

    for (const [k, v] of Object.entries(dayOverrides)) {
      if (v === 'off') continue; // Off days don't reset the sequence
      const d = new Date(k + 'T00:00:00');
      // Must be at or before target, and more recent than current nearest
      if (d <= target && d >= anchorDate && d > nearestDate) {
        nearestDate = d;
        nearestVal  = v as 'A' | 'B';
      }
    }

    // ── Count school days from nearestDate to target ───────────────────────
    // Skip weekends and Off/PIR days — these don't count in the rotation.
    // Each school day flips the rotation: A → B → A → B...
    let count = 0;
    const cursor = new Date(nearestDate);
    cursor.setDate(cursor.getDate() + 1); // start the day AFTER the anchor

    while (cursor <= target) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) { // weekday
        const k = toKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        if (dayOverrides[k] !== 'off') count++; // off days don't advance rotation
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Even count = same as nearest anchor, odd = flipped
    return count % 2 === 0 ? nearestVal : (nearestVal === 'A' ? 'B' : 'A');
  }

  // ── Swipe to navigate ─────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const pinchStartDist = useRef<number | null>(null);
  const pinchStartHourPx = useRef<number>(56);

  function getTouchDist(e: React.TouchEvent) {
    if (e.touches.length < 2) return null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStartDist.current = getTouchDist(e);
      pinchStartHourPx.current = hourPx;
    } else {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      const dist  = getTouchDist(e);
      if (!dist) return;
      const scale = dist / pinchStartDist.current;
      const next  = Math.round(Math.min(HOUR_PX_MAX, Math.max(HOUR_PX_MIN, pinchStartHourPx.current * scale)));
      setHourPx(next);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (pinchStartDist.current !== null) {
      pinchStartDist.current = null;
      return;
    }
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
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
    if (viewMode === 'day') {
      const d = new Date(dayKey + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      setDayKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    } else if (viewMode === 'week') setWeekOffset(o => o - 1);
    else { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  }
  function nextPeriod() {
    setSelectedKey(null);
    if (viewMode === 'day') {
      const d = new Date(dayKey + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      setDayKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    } else if (viewMode === 'week') setWeekOffset(o => o + 1);
    else { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
  }
  function goToToday() {
    setSelectedKey(null); setWeekOffset(0); setMonth(t.m); setYear(t.y);
    const n = new Date();
    setDayKey(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`);
  }

  const periodLabel = viewMode === 'day'
    ? (() => { const d = new Date(dayKey + 'T00:00:00'); return `${DAYS[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`; })()
    : viewMode === 'week' ? weekLabel() : `${MONTHS[month]} ${year}`;

  return (
    <Screen>
      {/* Dark forest header */}
      <div style={{ background: Colors.forest, padding: '22px 20px 0', flexShrink: 0 }}>

        {/* Title row: Calendar label + Schedule link */}
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
            onClick={() => navigate('schedule')}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}
          >
            Edit schedule
          </button>
        </div>

        {/* Today | Week | Month tabs + chevrons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 }}>
          <button
            onClick={prevPeriod}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <IconChevronLeft size={18} color="rgba(255,255,255,0.7)" />
          </button>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setSelectedKey(null); if (mode === 'day') goToToday(); }}
                style={{
                  padding: '5px 14px', borderRadius: 7, border: 'none',
                  background: viewMode === mode ? '#fff' : 'transparent',
                  color: viewMode === mode ? Colors.forest : 'rgba(255,255,255,0.65)',
                  fontWeight: viewMode === mode ? 700 : 500,
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'day' ? 'Today' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}          </div>

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
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {viewMode === 'day' ? (
            <DayView
              dateKey={dayKey}
              allAssignments={assignments}
              onNavigate={navigate}
              dayOverrides={dayOverrides}
              setOverride={setOverride}
              hourPx={hourPx}
              getDerivedBlockDay={getDerivedBlockDay}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              weekStart={monday}
              byDate={byDate}
              allAssignments={assignments}
              selectedKey={selectedKey}
              onSelectDay={(key) => { setSelectedKey(key); setDayKey(key); setViewMode('day'); }}
              onNavigate={navigate}
              dayOverrides={dayOverrides}
              setOverride={setOverride}
              hourPx={hourPx}
              getDerivedBlockDay={getDerivedBlockDay}
            />
          ) : (
            <MonthView
              year={year} month={month}
              byDate={byDate}
              allAssignments={assignments}
              selectedKey={selectedKey}
              onSelectDay={(key) => { setSelectedKey(key); setDayKey(key); setViewMode('day'); }}
              onNavigate={navigate}
            />
          )}
        </div>
      </ScrollBody>

      <BottomNav current="calendar" onNavigate={s => navigate(s as any)} items={NAV} />
    </Screen>
  );
}

// ── DayView ── time-axis view with class schedule blocks and free windows ─────
// Class schedule data is stored in localStorage under 'trackit_class_schedule'
// Format: [{ name, color, days: number[], startHour: number, startMin: number, endHour: number, endMin: number, room?: string }]
export interface ClassPeriod {
  name:      string;
  color:     string;
  days:      number[];   // 0=Sun…6=Sat — used for standard schedule; for block, which days the rotation can fall on
  startHour: number;
  startMin:  number;
  endHour:   number;
  endMin:    number;
  room?:     string;
  blockDay?: 'A' | 'B' | null;  // null = standard, 'A' or 'B' = block schedule rotation
}

export interface ScheduleSettings {
  type: 'standard' | 'block';
  // For block: which actual calendar dates are A-days vs B-days (user-defined overrides)
  // Key = YYYY-MM-DD, value = 'A' | 'B' | 'off'
  dayOverrides: Record<string, 'A' | 'B' | 'off'>;
  // The default pattern when no override: which day of the cycle comes next
  blockCycleStart?: 'A' | 'B'; // what day is "this Monday"
}

function DayView({ dateKey, allAssignments, onNavigate, dayOverrides, setOverride, hourPx, getDerivedBlockDay }: {
  dateKey:        string;
  allAssignments: Assignment[];
  onNavigate:     (screen: any, id?: string) => void;
  dayOverrides:   Record<string, 'A' | 'B' | 'off'>;
  setOverride:    (key: string, val: 'A' | 'B' | 'off' | null) => void;
  hourPx:         number;
  getDerivedBlockDay: (key: string) => 'A' | 'B' | null;
}) {
  const d    = new Date(dateKey + 'T00:00:00');
  const dow  = d.getDay();

  let schedule: ClassPeriod[] = [];
  let scheduleType: 'standard' | 'block' = 'standard';
  try {
    const raw = localStorage.getItem('trackit_class_schedule');
    if (raw) schedule = JSON.parse(raw);
    scheduleType = (localStorage.getItem('trackit_schedule_type') as any) ?? 'standard';
  } catch {}

  // Load adjusted days and check if this date is one
  let adjustedDays: { label: string; startH?: number; startM?: number; endH?: number; endM?: number }[] = [];
  try {
    const raw = localStorage.getItem('trackit_adjusted_days');
    if (raw) adjustedDays = JSON.parse(raw);
  } catch {}
  const DAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dowFull = DAY_NAMES_FULL[d.getDay()];
  const adjDay = adjustedDays.find(a => a.label.toLowerCase().includes(dowFull.toLowerCase()));

  const dayOverride = dayOverrides[dateKey] as 'A' | 'B' | 'off' | undefined;
  const isOff = dayOverride === 'off';

  // Use explicit override if set, otherwise use derived block day
  const effectiveBlockDay = (dayOverride === 'A' || dayOverride === 'B')
    ? dayOverride
    : getDerivedBlockDay(dateKey);

  const todayPeriods = isOff ? [] : schedule.filter(p => {
    if (!p.days.includes(dow)) return false;
    if (scheduleType !== 'block' || !p.blockDay) return true;
    if (effectiveBlockDay) return p.blockDay === effectiveBlockDay;
    return true;
  }).map(p => {
    // On an adjusted day, swap in alt times if they were set
    if (adjDay && p.altStartHour != null && p.altEndHour != null) {
      return { ...p, startHour: p.altStartHour, startMin: p.altStartMin ?? 0, endHour: p.altEndHour, endMin: p.altEndMin ?? 0 };
    }
    return p;
  });
  const dayAssignments = allAssignments.filter(a => a.dueDate === dateKey && !a.done);

  // Hours to show: 7am – 6pm
  const START_HOUR = 7;
  const END_HOUR   = 18;
  const HOUR_PX    = hourPx; // controlled by pinch-to-zoom

  function toY(h: number, m: number) {
    return ((h - START_HOUR) + m / 60) * HOUR_PX;
  }
  function toH(h: number, m: number, eh: number, em: number) {
    return ((eh - h) + (em - m) / 60) * HOUR_PX;
  }

  // Compute free windows between class periods (>= 30 min)
  interface Window { startH: number; startM: number; endH: number; endM: number; label: string }
  const freeWindows: Window[] = [];
  if (todayPeriods.length > 0) {
    const sorted = [...todayPeriods].sort((a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin));
    let cursor = { h: START_HOUR, m: 0 };
    for (const p of sorted) {
      const gapMin = (p.startHour - cursor.h) * 60 + (p.startMin - cursor.m);
      if (gapMin >= 30) {
        const dur = gapMin >= 60 ? `${Math.floor(gapMin / 60)} hr${Math.floor(gapMin / 60) > 1 ? 's' : ''}${gapMin % 60 > 0 ? ` ${gapMin % 60} min` : ''}` : `${gapMin} min`;
        freeWindows.push({ startH: cursor.h, startM: cursor.m, endH: p.startHour, endM: p.startMin, label: `Free — ${dur}` });
      }
      cursor = { h: p.endHour, m: p.endMin };
    }
    const afterMin = (END_HOUR - cursor.h) * 60 - cursor.m;
    if (afterMin >= 30) {
      const dur = afterMin >= 60 ? `${Math.floor(afterMin / 60)} hr${Math.floor(afterMin / 60) > 1 ? 's' : ''}${afterMin % 60 > 0 ? ` ${afterMin % 60} min` : ''}` : `${afterMin} min`;
      freeWindows.push({ startH: cursor.h, startM: cursor.m, endH: END_HOUR, endM: 0, label: `Free — ${dur}` });
    }
  }

  // Find "next class" for each assignment
  function nextClassLabel(a: Assignment): string | null {
    const periods = schedule.filter(p => p.days.includes(dow) && (p.name === a.className || p.color === a.classColor));
    if (periods.length === 0) return null;
    const now = new Date();
    const isToday = dateKey === toKey(now.getFullYear(), now.getMonth(), now.getDate());
    if (!isToday) return null;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const upcoming = periods.filter(p => p.startHour * 60 + p.startMin > nowMin);
    if (upcoming.length === 0) return null;
    const next = upcoming.sort((a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin))[0];
    const minsAway = next.startHour * 60 + next.startMin - nowMin;
    const hAway = Math.floor(minsAway / 60);
    const minAway = minsAway % 60;
    const timeStr = hAway > 0 ? `${hAway}h ${minAway > 0 ? `${minAway}m` : ''}`.trim() : `${minAway}m`;
    return `Next class ${next.startHour > 12 ? next.startHour - 12 : next.startHour}:${String(next.startMin).padStart(2, '0')}${next.startHour >= 12 ? 'pm' : 'am'} — ${timeStr} away`;
  }

  const totalH = (END_HOUR - START_HOUR) * HOUR_PX;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const noSchedule = todayPeriods.length === 0;

  return (
    <div style={{ padding: '12px 0 16px' }}>

      {/* Assignment cards above timeline if any due */}
      {dayAssignments.length > 0 && (
        <div style={{ padding: '0 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Due this day
          </div>
          {dayAssignments.map(a => {
            const days = daysUntil(a.dueDate);
            const u = getUrgencyConfig(days);
            const ncLabel = nextClassLabel(a);
            return (
              <div
                key={a.id}
                onClick={() => onNavigate('detail', a.id)}
                style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: Colors.textPrimary, flex: 1, marginRight: 8 }}>{a.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: u.bg, color: u.text, padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>{u.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: ncLabel ? 6 : 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.classColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: Colors.textHint }}>{a.className}</span>
                  {a.effort && <><span style={{ color: Colors.textHint, fontSize: 12 }}>·</span><span style={{ fontSize: 12, color: u.text, fontWeight: 600 }}>~{a.effort === 'quick' ? '30 min' : a.effort === 'medium' ? '1–2 hrs' : '2+ hrs'}</span></>}
                </div>
                {ncLabel && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: Colors.forest, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    {ncLabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No assignments message */}
      {dayAssignments.length === 0 && (
        <div style={{ padding: '0 14px', marginBottom: 14 }}>
          <div style={{ background: Colors.background, borderRadius: 12, padding: '10px 14px', fontSize: 13, color: Colors.textHint, textAlign: 'center' }}>
            Nothing due this day
          </div>
        </div>
      )}

      {/* Time axis */}
      <div style={{ padding: '0 14px' }}>
        {/* Block day override controls */}
        {scheduleType === 'block' && !isOff && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dayOverride ? 'Override set' : `Auto: ${getDerivedBlockDay(dateKey) ?? '—'}-day`}
              </div>
              {dayOverride && (
                <button onClick={() => setOverride(dateKey, null)}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: Colors.textHint, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear override
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['A', 'B', 'off'] as const).map(opt => {
                const isActive = dayOverride === opt;
                return (
                  <button key={opt}
                    onClick={() => setOverride(dateKey, isActive ? null : opt)}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, fontFamily: 'inherit', cursor: 'pointer',
                      border: `1.5px solid ${isActive ? Colors.forest : '#E3EBEA'}`,
                      background: isActive ? Colors.forest : '#fff',
                      color: isActive ? '#fff' : Colors.textSecondary,
                      fontSize: 13, fontWeight: 700 }}>
                    {opt === 'off' ? 'Off / PIR' : `${opt}-day`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isOff && (
          <div style={{ background: '#FEF0DC', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B86B12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#7A4608' }}>Marked as off / PIR day — no classes shown</span>
            <button
              onClick={() => setOverride(dateKey, null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 12, color: '#B86B12', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              Undo
            </button>
          </div>
        )}

        <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Schedule</span>
  
        </div>

        <div style={{ display: 'flex', position: 'relative' }}>
          {/* Hour labels */}
          <div style={{ width: 36, flexShrink: 0, position: 'relative', height: totalH }}>
            {hours.map(h => (
              <div key={h} style={{ position: 'absolute', top: (h - START_HOUR) * HOUR_PX - 6, right: 8, fontSize: 10, fontWeight: 500, color: Colors.textHint, lineHeight: 1 }}>
                {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
              </div>
            ))}
          </div>

          {/* Grid + blocks */}
          <div style={{ flex: 1, position: 'relative', borderLeft: '0.5px solid #E3EBEA', height: totalH }}>
            {/* Hour lines */}
            {hours.map(h => (
              <div key={h} style={{ position: 'absolute', top: (h - START_HOUR) * HOUR_PX, left: 0, right: 0, borderTop: '0.5px solid #E3EBEA', opacity: 0.6 }} />
            ))}

            {/* Current time line */}
            {(() => {
              const now = new Date();
              const isToday = dateKey === toKey(now.getFullYear(), now.getMonth(), now.getDate());
              if (!isToday) return null;
              const y = toY(now.getHours(), now.getMinutes());
              if (y < 0 || y > totalH) return null;
              return (
                <div style={{ position: 'absolute', top: y, left: 0, right: 0, borderTop: '1.5px solid #B8E04A', zIndex: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#B8E04A', marginTop: -4, marginLeft: -4 }} />
                </div>
              );
            })()}

            {/* Free windows */}
            {freeWindows.map((w, i) => (
              <div key={i} style={{
                position: 'absolute', left: 4, right: 4,
                top: toY(w.startH, w.startM),
                height: Math.max(toH(w.startH, w.startM, w.endH, w.endM) - 2, 20),
                background: '#E8F4F5', border: '1px dashed #1c4a4f', borderRadius: 6,
                padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5,
                zIndex: 1, overflow: 'hidden',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1c4a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: 11, color: '#1c4a4f', fontWeight: 500 }}>{w.label}</span>
              </div>
            ))}

            {/* Class period blocks */}
            {todayPeriods.map((p, i) => (
              <div key={i} style={{
                position: 'absolute', left: 4, right: 4,
                top: toY(p.startHour, p.startMin) + 1,
                height: Math.max(toH(p.startHour, p.startMin, p.endHour, p.endMin) - 2, 24),
                background: `${p.color}22`, borderRadius: 6, borderLeft: `3px solid ${p.color}`,
                padding: '4px 8px', zIndex: 2, overflow: 'hidden',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: p.color, lineHeight: 1.2 }}>{p.name}</div>
                {p.room && <div style={{ fontSize: 10, color: p.color, opacity: 0.7, marginTop: 2 }}>{p.room}</div>}
              </div>
            ))}

            {/* No schedule placeholder */}
            {noSchedule && (
              <div style={{
                position: 'absolute', left: 4, right: 4, top: toY(8, 0),
                height: HOUR_PX * 6, background: Colors.background, borderRadius: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={Colors.textHint} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div style={{ fontSize: 12, color: Colors.textHint, textAlign: 'center', lineHeight: 1.5 }}>
                  No class schedule added yet.
                </div>
                <button
                  onClick={() => {
                    try { localStorage.setItem('trackit_highlight_schedule', '1'); } catch {}
                    onNavigate('settings');
                  }}
                  style={{ marginTop: 8, background: Colors.forest, border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  Set up in Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
