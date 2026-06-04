import React from 'react';
import { Colors, getUrgencyConfig } from '../../theme';
import { daysUntil } from '../../data/store';
import type { Assignment, CalendarEvent } from '../../types';
import { toKey, today, DAYS, DAY_NAMES_FULL, type ClassPeriod } from './calendarUtils';
import { UpcomingTestsBanner } from './DayPanel';

export function WeekView({ weekStart, byDate, allAssignments, selectedKey, onSelectDay, onNavigate, dayOverrides, setOverride, hourPx, getDerivedBlockDay, schedule, scheduleType, adjustedDays, eventsForDate, onEditEvent }: {
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
  schedule: ClassPeriod[];
  scheduleType: 'standard' | 'block';
  adjustedDays: { label: string }[];
  eventsForDate: (dateKey: string) => CalendarEvent[];
  onEditEvent: (e: CalendarEvent) => void;
}) {
  const t   = today();
  const now = new Date();
  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  const START_HOUR = 7;
  const END_HOUR   = 22;
  const HOUR_PX    = 56;
  const totalH     = (END_HOUR - START_HOUR) * HOUR_PX;
  const hours      = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  function toY(h: number, m: number) { return ((h - START_HOUR) + m / 60) * HOUR_PX; }
  function toH(sh: number, sm: number, eh: number, em: number) {
    return ((eh - sh) + (em - sm) / 60) * HOUR_PX;
  }
  function fmt(h: number, m: number) {
    const ap = h >= 12 ? 'p' : 'a';
    const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hh}:${String(m).padStart(2,'0')}${ap}`;
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Load schedule only — overrides come from props
  // schedule, scheduleType, adjustedDays come from props (read once at CalendarScreen level)
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
    const adjDay  = adjustedDays.find(a => a.label.toLowerCase().includes(dowFull.toLowerCase()));
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


                  {/* Class period blocks with assignment chips inside */}
                  {!isOff && periods.map((p, pi) => {
                    const periodAsgns = asgns.filter(
                      a => a.className === p.name || a.classColor === p.color
                    );
                    const blockH = Math.max(toH(p.startHour, p.startMin, p.endHour, p.endMin) - 2, 20);
                    return (
                      <div key={pi} style={{
                        position: 'absolute', left: 2, right: 2,
                        top: toY(p.startHour, p.startMin) + 1,
                        height: blockH,
                        background: `${p.color}22`, borderLeft: `3px solid ${p.color}`,
                        borderRadius: '0 6px 6px 0', padding: '3px 4px',
                        cursor: 'pointer', overflow: 'hidden', zIndex: 2,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: p.color, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        {blockH > 30 && <div style={{ fontSize: 9, color: p.color, opacity: 0.7, marginTop: 1 }}>{fmt(p.startHour, p.startMin)}</div>}
                        {periodAsgns.map(a => {
                          const u = getUrgencyConfig(daysUntil(key));
                          return (
                            <div key={a.id}
                              onClick={(e) => { e.stopPropagation(); onSelectDay(key); onNavigate('detail', a.id); }}
                              style={{ marginTop: 3, background: u.bg, borderRadius: 3, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <div style={{ width: 4, height: 4, borderRadius: '50%', background: u.accent, flexShrink: 0 }} />
                              <span style={{ fontSize: 9, fontWeight: 700, color: u.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.name.split(' ').slice(0, 2).join(' ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Unmatched assignment chips (no class period match) */}
                  {asgns.filter(a => !periods.some(p => p.name === a.className || p.color === a.classColor)).map((a, ai) => {
                    const u = getUrgencyConfig(daysUntil(key));
                    return (
                      <div key={a.id}
                        onClick={() => { onSelectDay(key); onNavigate('detail', a.id); }}
                        style={{
                          position: 'absolute', left: 2, right: 2,
                          top: Math.max(2, totalH - 14 - ai * 14),
                          height: 14, background: u.bg, borderRadius: 4,
                          zIndex: 5, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', overflow: 'hidden', padding: '0 4px', gap: 3,
                        }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: u.accent, flexShrink: 0 }} />
                        <div style={{ fontSize: 9, fontWeight: 700, color: u.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name.split(' ').slice(0, 2).join(' ')}
                        </div>
                      </div>
                    );
                  })}

                  {/* Calendar event chips */}
                  {eventsForDate(key).map(ev => (
                    <div key={ev.id} onClick={(e) => { e.stopPropagation(); onEditEvent(ev); }}
                      style={{
                        position: 'absolute', left: 2, right: 2,
                        top: toY(ev.startHour, ev.startMin) + 1,
                        height: Math.max(toH(ev.startHour, ev.startMin, ev.endHour, ev.endMin) - 2, 18),
                        background: `${ev.color}22`, borderLeft: `3px solid ${ev.color}`,
                        borderRadius: '0 6px 6px 0', padding: '3px 4px',
                        cursor: 'pointer', overflow: 'hidden', zIndex: 3,
                      }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: ev.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</div>
                    </div>
                  ))}
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
