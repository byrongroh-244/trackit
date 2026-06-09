import { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { uid } from '../data/store';
import { Colors, CLASS_COLORS } from '../theme';
import { Screen, ScrollBody } from '../components/UI';
import { IconArrowLeft } from '../components/Icons';
import PeriodEditor from '../components/PeriodEditor';
import type { ClassPeriod } from './calendar/calendarUtils';
import {
  getSchedule, setSchedule,
  getScheduleType, setScheduleType,
  getAdjustedDays, setAdjustedDays,
  getOrCreateBlockAnchor,
} from '../data/scheduleStorage';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_SHORT  = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HOURS      = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm
const HOUR_PX    = 56;
const START_H    = 7;

function fmt(h: number, m: number) {
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(m).padStart(2,'0')}${ap}`;
}
function toY(h: number, m: number) { return ((h - START_H) + m / 60) * HOUR_PX; }
function toH(sh: number, sm: number, eh: number, em: number) {
  return Math.max(((eh - sh) + (em - sm) / 60) * HOUR_PX - 2, 20);
}

export default function ScheduleScreen() {
  const { courses, navigate, updateCourses, saveScheduleToSupabase } = useApp();

  const [scheduleType,  setSchedType]   = useState<'standard' | 'block'>(() => getScheduleType());
  const [adjDays,       setAdjDaysState] = useState<{ label: string }[]>(() => getAdjustedDays());
  const [showAltEditor, setShowAltEditor] = useState(false);
  const [adjLabel,      setAdjLabel]     = useState('');

  function saveAdjDays(updated: { label: string }[]) {
    setAdjDaysState(updated);
    setAdjustedDays(updated as any);
    saveScheduleToSupabase();
  }

  const DAY_NAMES_SHORT = ['Mo','Tu','We','Th','Fr'];
  const DAY_NAMES_FULL  = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

  const [periods,      setPeriods]      = useState<ClassPeriod[]>(() => getSchedule());
  const [editing,      setEditing]      = useState<ClassPeriod | null>(null);
  const [showEditor,   setShowEditor]   = useState(false);
  const [viewDay,      setViewDay]      = useState<number>(
    () => { const d = new Date().getDay(); return d === 0 || d === 6 ? 1 : d; }
  );
  const [previewWeek,  setPreviewWeek]  = useState<1 | 2>(1);
  const [viewMode,     setViewMode]     = useState<'week' | 'day'>('week');

  function savePeriods(updated: ClassPeriod[]) {
    setPeriods(updated);
    setSchedule(updated);
    saveScheduleToSupabase();
  }

  function saveType(t: 'standard' | 'block') {
    setSchedType(t);
    setScheduleType(t);
    if (t === 'block') getOrCreateBlockAnchor();
    saveScheduleToSupabase();
  }

  function deletePeriod(p: ClassPeriod) {
    savePeriods(periods.filter(x => x !== p));
  }

  function onSave(p: ClassPeriod) {
    if (editing) savePeriods(periods.map(x => x === editing ? p : x));
    else savePeriods([...periods, p]);

    // If this class doesn't exist in the Courses list yet, create it
    const existsInCourses = courses.some(
      c => c.name.toLowerCase().trim() === p.name.toLowerCase().trim()
    );
    if (!existsInCourses) {
      updateCourses([...courses, {
        id:    uid(),
        name:  p.name,
        color: p.color,
        room:  p.room,
      }]);
    }

    setEditing(null); setShowEditor(false);
  }

  const totalH = HOURS.length * HOUR_PX;

  // Get periods for a given day-of-week
  // Map dow (0=Sun) to full name for alt day matching
  const DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function periodsForDow(dow: number) {
    // Week 1 = A on Mon/Wed/Fri, B on Tue/Thu
    // Week 2 = B on Mon/Wed/Fri, A on Tue/Thu
    const baseIsA = [1, 3, 5].includes(dow);
    const previewDay: 'A' | 'B' = scheduleType === 'block'
      ? (previewWeek === 1 ? (baseIsA ? 'A' : 'B') : (baseIsA ? 'B' : 'A'))
      : 'A';
    const dowName = DOW_FULL[dow];
    const adjDay  = adjDays.find((a: { label: string }) =>
      a.label.toLowerCase().includes(dowName.toLowerCase())
    );
    return periods
      .filter(p => {
        if (!p.days.includes(dow)) return false;
        if (scheduleType !== 'block' || !p.blockDay) return true;
        return p.blockDay === previewDay;
      })
      .map(p => {
        if (adjDay && p.altStartHour != null && p.altEndHour != null) {
          return { ...p, startHour: p.altStartHour, startMin: p.altStartMin ?? 0, endHour: p.altEndHour, endMin: p.altEndMin ?? 0 };
        }
        return p;
      });
  }

  const WORK_DAYS = [1, 2, 3, 4, 5];

  return (
    <Screen>
      {/* Header */}
      <div style={{ background: Colors.forest, padding: '18px 18px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => navigate('calendar')} aria-label="Back"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Schedule</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
              {periods.length} class{periods.length !== 1 ? 'es' : ''} · {scheduleType === 'block' ? 'Block A/B' : 'Traditional'}
            </div>
          </div>
          <button
            onClick={() => { setEditing(null); setShowEditor(true); }}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
          <button
            onClick={() => navigate('calendar')}
            style={{ background: '#B8E04A', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: Colors.forest }}>
            Save
          </button>
        </div>

        {/* Controls row: schedule type + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14 }}>
          {/* Schedule type — reflects settings, can still toggle here */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 2, gap: 2 }}>
            {([['standard','Traditional'],['block','Block A/B']] as const).map(([t, label]) => (
              <button key={t} onClick={() => saveType(t as 'standard' | 'block')}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: scheduleType === t ? '#fff' : 'transparent', color: scheduleType === t ? Colors.forest : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: scheduleType === t ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Alt day — tappable to manage when in block mode */}
          {scheduleType === 'block' && (
            <button onClick={() => setShowAltEditor(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 9px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {adjDays.length > 0 ? `Alt: ${adjDays[0].label}` : 'Set alt day'}
            </button>
          )}

          {/* Week 1 / Week 2 toggle — block only */}
          {scheduleType === 'block' && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 2, gap: 2 }}>
              {([1, 2] as const).map(w => (
                <button key={w} onClick={() => setPreviewWeek(w)}
                  style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: previewWeek === w ? '#B8E04A' : 'transparent', color: previewWeek === w ? Colors.forest : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: previewWeek === w ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Wk {w}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 2, gap: 2 }}>
            {(['week', 'day'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: viewMode === v ? '#fff' : 'transparent', color: viewMode === v ? Colors.forest : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: viewMode === v ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {v === 'week' ? 'Week' : 'Day'}
              </button>
            ))}
          </div>
        </div>

        {/* Day selector for day view */}
        {viewMode === 'day' && (
          <div style={{ display: 'flex', gap: 4, paddingBottom: 14 }}>
            {WORK_DAYS.map(d => (
              <button key={d} onClick={() => setViewDay(d)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', background: viewDay === d ? '#B8E04A' : 'rgba(255,255,255,0.1)', color: viewDay === d ? Colors.forest : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: viewDay === d ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {DAY_SHORT[d]}
              </button>
            ))}
          </div>
        )}
      </div>

      <ScrollBody>
        {periods.length === 0 ? (
          /* Empty state */
          <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: Colors.textPrimary, letterSpacing: '-0.02em' }}>No classes yet</div>
            <div style={{ fontSize: 14, color: Colors.textHint, lineHeight: 1.6, maxWidth: 260 }}>
              Tap "Add +" to build your schedule. Your classes will appear on the day and week views in Calendar.
            </div>
            <button onClick={() => { setEditing(null); setShowEditor(true); }}
              style={{ marginTop: 8, padding: '13px 28px', borderRadius: 12, border: 'none', background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Add first class
            </button>
          </div>
        ) : viewMode === 'week' ? (
          /* ── Week grid view ── */
          <div style={{ padding: '12px 0 24px' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
              <div style={{ minWidth: 360, padding: '0 12px' }}>

                {/* Day headers */}
                <div style={{ display: 'flex', marginLeft: 44, marginBottom: 6 }}>
                  {WORK_DAYS.map(d => (
                    <div key={d} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAY_LABELS[d].slice(0,3)}</div>
                    </div>
                  ))}
                </div>

                {/* Time axis + columns */}
                <div style={{ display: 'flex' }}>
                  {/* Hour labels */}
                  <div style={{ width: 44, flexShrink: 0, position: 'relative', height: totalH }}>
                    {HOURS.map(h => (
                      <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_PX - 6, right: 6, fontSize: 10, fontWeight: 500, color: Colors.textHint, lineHeight: 1, whiteSpace: 'nowrap' }}>
                        {h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {WORK_DAYS.map(dow => {
                    const dayPeriods = periodsForDow(dow);
                    return (
                      <div key={dow} style={{ flex: 1, position: 'relative', height: totalH, borderLeft: '0.5px solid #E3EBEA' }}>
                        {/* Grid lines */}
                        {HOURS.map(h => (
                          <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_PX, left: 0, right: 0, borderTop: '0.5px solid #E3EBEA', opacity: 0.5 }} />
                        ))}
                        {/* Class blocks */}
                        {dayPeriods.map((p, i) => (
                          <div key={i}
                            onClick={() => { setEditing(p); setShowEditor(true); }}
                            style={{ position: 'absolute', left: 2, right: 2, top: toY(p.startHour, p.startMin) + 1, height: toH(p.startHour, p.startMin, p.endHour, p.endMin), background: `${p.color}22`, borderLeft: `3px solid ${p.color}`, borderRadius: '0 6px 6px 0', padding: '3px 5px', cursor: 'pointer', overflow: 'hidden', zIndex: 2 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: p.color, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            {toH(p.startHour, p.startMin, p.endHour, p.endMin) > 30 && (
                              <div style={{ fontSize: 9, color: p.color, opacity: 0.7, marginTop: 1 }}>{fmt(p.startHour, p.startMin)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Class list below grid */}
            <div style={{ padding: '20px 14px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>All classes</div>
              <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #E3EBEA', overflow: 'hidden' }}>
                {periods.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: i < periods.length - 1 ? '0.5px solid #E3EBEA' : 'none' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 2 }}>
                        {p.days.map((d: number) => DAY_LABELS[d].slice(0,3)).join(', ')} · {fmt(p.startHour, p.startMin)}–{fmt(p.endHour, p.endMin)}
                        {p.blockDay ? ` · ${p.blockDay}-day` : ''}
                        {p.room ? ` · ${p.room}` : ''}
                      </div>
                    </div>
                    <button onClick={() => { setEditing(p); setShowEditor(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: Colors.textHint }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => deletePeriod(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: Colors.red }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Day view ── */
          <div style={{ padding: '12px 14px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary, marginBottom: 12 }}>{DAY_LABELS[viewDay]}</div>

            <div style={{ display: 'flex' }}>
              {/* Hour labels */}
              <div style={{ width: 44, flexShrink: 0, position: 'relative', height: totalH }}>
                {HOURS.map(h => (
                  <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_PX - 6, right: 6, fontSize: 10, fontWeight: 500, color: Colors.textHint, lineHeight: 1 }}>
                    {h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}
                  </div>
                ))}
              </div>

              {/* Column */}
              <div style={{ flex: 1, position: 'relative', height: totalH, borderLeft: '0.5px solid #E3EBEA' }}>
                {HOURS.map(h => (
                  <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_PX, left: 0, right: 0, borderTop: '0.5px solid #E3EBEA', opacity: 0.5 }} />
                ))}

                {periodsForDow(viewDay).length === 0 && (
                  <div style={{ position: 'absolute', top: toY(10, 0), left: 8, right: 8, background: Colors.background, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: Colors.textHint }}>No classes on {DAY_LABELS[viewDay]}</div>
                    <button onClick={() => { setEditing(null); setShowEditor(true); }}
                      style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', background: Colors.forest, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Add
                    </button>
                  </div>
                )}

                {periodsForDow(viewDay).map((p, i) => (
                  <div key={i}
                    onClick={() => { setEditing(p); setShowEditor(true); }}
                    style={{ position: 'absolute', left: 4, right: 4, top: toY(p.startHour, p.startMin) + 1, height: Math.max(toH(p.startHour, p.startMin, p.endHour, p.endMin), 28), background: `${p.color}22`, borderLeft: `3px solid ${p.color}`, borderRadius: '0 8px 8px 0', padding: '6px 10px', cursor: 'pointer', zIndex: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: p.color, opacity: 0.8, marginTop: 2 }}>{fmt(p.startHour, p.startMin)} – {fmt(p.endHour, p.endMin)}{p.room ? ` · ${p.room}` : ''}</div>
                    {p.blockDay && <div style={{ fontSize: 10, fontWeight: 700, color: p.color, opacity: 0.7, marginTop: 1 }}>{p.blockDay}-day</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ScrollBody>

      {/* Period editor sheet */}
      {showEditor && (
        <PeriodEditor
          initial={editing}
          courses={courses}
          scheduleType={scheduleType}
          onSave={onSave}
          onCancel={() => { setShowEditor(false); setEditing(null); }}
        />
      )}
      {/* Alt day editor sheet */}
      {showAltEditor && (
        <>
          <div onClick={() => { setShowAltEditor(false); setAdjLabel(''); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 101,
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '20px 18px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            maxHeight: '70vh', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: Colors.textPrimary, marginBottom: 4, letterSpacing: '-0.02em' }}>Alternate schedule days</div>
            <div style={{ fontSize: 13, color: Colors.textHint, marginBottom: 16, lineHeight: 1.5 }}>
              Days that follow the A/B rotation but with different class times — e.g. late start, early release.
            </div>

            {/* Existing alt days */}
            {adjDays.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #E3EBEA' }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>{d.label}</div>
                <button onClick={() => saveAdjDays(adjDays.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: Colors.red }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            ))}

            {/* Add new */}
            <div style={{ marginTop: 14 }}>
              <input
                autoFocus
                value={adjLabel}
                onChange={e => setAdjLabel(e.target.value)}
                placeholder="e.g. Late Start Wednesday"
                style={{ width: '100%', fontSize: 14, padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${Colors.forest}`, outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, background: '#fff', boxSizing: 'border-box', marginBottom: 10 }}
              />
              {/* Day picker */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {DAY_NAMES_SHORT.map((day, i) => {
                  const active = adjLabel.toLowerCase().includes(DAY_NAMES_FULL[i].toLowerCase());
                  return (
                    <button key={day} onClick={() => {
                      const base = adjLabel.replace(/monday|tuesday|wednesday|thursday|friday/gi, '').trim();
                      setAdjLabel(`${base} ${DAY_NAMES_FULL[i]}`.trim());
                    }} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1.5px solid ${active ? Colors.forest : '#E3EBEA'}`, background: active ? Colors.forest : '#fff', color: active ? '#fff' : Colors.textHint, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {day}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowAltEditor(false); setAdjLabel(''); }}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E3EBEA', background: '#fff', fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Done
                </button>
                <button
                  disabled={!adjLabel.trim()}
                  onClick={() => {
                    if (!adjLabel.trim()) return;
                    saveAdjDays([...adjDays, { label: adjLabel.trim() }]);
                    setAdjLabel('');
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: adjLabel.trim() ? Colors.forest : '#E3EBEA', color: adjLabel.trim() ? '#fff' : Colors.textHint, fontSize: 14, fontWeight: 700, cursor: adjLabel.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Screen>
  );
}
