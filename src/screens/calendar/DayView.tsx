import React from 'react';
import { Colors, getUrgencyConfig } from '../../theme';
import { daysUntil } from '../../data/store';
import type { Assignment, CalendarEvent } from '../../types';
import { toKey, today, DAY_NAMES_FULL, type ClassPeriod } from './calendarUtils';
import { DayPanel } from './DayPanel';

export function DayView({ dateKey, allAssignments, onNavigate, dayOverrides, setOverride, hourPx, getDerivedBlockDay, schedule, scheduleType, adjustedDays, events, onEditEvent }: {
  dateKey:        string;
  allAssignments: Assignment[];
  onNavigate:     (screen: any, id?: string) => void;
  dayOverrides:   Record<string, 'A' | 'B' | 'off'>;
  setOverride:    (key: string, val: 'A' | 'B' | 'off' | null) => void;
  hourPx:         number;
  getDerivedBlockDay: (key: string) => 'A' | 'B' | null;
  schedule: ClassPeriod[];
  scheduleType: 'standard' | 'block';
  adjustedDays: { label: string; startH?: number; startM?: number; endH?: number; endM?: number }[];
  events: CalendarEvent[];
  onEditEvent: (e: CalendarEvent) => void;
}) {
  const d    = new Date(dateKey + 'T00:00:00');
  const dow  = d.getDay();

  // schedule, scheduleType, adjustedDays come from props (read once at CalendarScreen level)
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

  // Hours to show: 7am – 10pm
  const START_HOUR = 7;
  const END_HOUR   = 22;
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

            {/* Class period blocks with due assignments inside */}
            {todayPeriods.map((p, i) => {
              const periodAssignments = dayAssignments.filter(
                a => a.className === p.name || a.classColor === p.color
              );
              const blockH = Math.max(toH(p.startHour, p.startMin, p.endHour, p.endMin) - 2, 24);
              return (
                <div key={i} style={{
                  position: 'absolute', left: 4, right: 4,
                  top: toY(p.startHour, p.startMin) + 1,
                  height: blockH,
                  background: `${p.color}22`, borderRadius: 6, borderLeft: `3px solid ${p.color}`,
                  padding: '4px 8px', zIndex: 2, overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: p.color, lineHeight: 1.2 }}>{p.name}</div>
                  {p.room && <div style={{ fontSize: 10, color: p.color, opacity: 0.7, marginTop: 1 }}>{p.room}</div>}
                  {periodAssignments.map(a => {
                    const u = getUrgencyConfig(daysUntil(a.dueDate));
                    return (
                      <div key={a.id} onClick={(e) => { e.stopPropagation(); onNavigate('detail', a.id); }}
                        style={{ marginTop: 5, background: u.bg, borderRadius: 5, padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: u.accent, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: u.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Calendar event blocks */}
            {events.map((e, i) => (
              <div key={e.id} onClick={() => onEditEvent(e)}
                style={{
                  position: 'absolute', left: 4, right: 4,
                  top: toY(e.startHour, e.startMin) + 1,
                  height: Math.max(toH(e.startHour, e.startMin, e.endHour, e.endMin) - 2, 24),
                  background: `${e.color}22`, borderRadius: 6, borderLeft: `3px solid ${e.color}`,
                  padding: '4px 8px', zIndex: 2, overflow: 'hidden', cursor: 'pointer',
                }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: e.color, lineHeight: 1.2 }}>{e.name}</div>
                {e.className && <div style={{ fontSize: 10, color: e.color, opacity: 0.7, marginTop: 1 }}>{e.className}</div>}
                {e.recurrence !== 'none' && (
                  <div style={{ fontSize: 9, color: e.color, opacity: 0.6, marginTop: 1 }}>
                    {e.recurrence === 'daily' ? 'Daily' : e.recurrence === 'weekly' ? 'Weekly' : e.recurrence === 'biweekly' ? 'Every 2 wks' : 'Monthly'}
                  </div>
                )}
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
