import React, { useState, useEffect, useRef } from 'react';
import { NAV } from '../data/nav';
import { useApp } from '../hooks/useApp';
import { Colors } from '../theme';
import { Screen, ScrollBody, BottomNav } from '../components/UI';
import { IconChevronLeft, IconChevronRight } from '../components/Icons';
import type { Assignment, CalendarEvent } from '../types';
import { toKey, today, assignmentsByDate, DAYS, MONTHS, MONTHS_SHORT, type ClassPeriod } from './calendar/calendarUtils';
import { DayPanel, UpcomingTestsBanner } from './calendar/DayPanel';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import EventEditor from '../components/EventEditor';
import {
  getSchedule, getScheduleType, getAdjustedDays,
  getDayOverrides, setDayOverrides,
  getOrCreateBlockAnchor,
  getCalendarEvents, setCalendarEvents, eventOccursOn,
} from '../data/scheduleStorage';

export default function CalendarScreen() {
  const { assignments, courses, navigate } = useApp();
  const t = today();

  const [viewMode,    setViewMode]    = useState<'day' | 'week' | 'month'>('week');
  const [dayKey,      setDayKey]      = useState<string>(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; });
  const [month,       setMonth]       = useState(t.m);
  const [year,        setYear]        = useState(t.y);
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ── Calendar events ────────────────────────────────────────────────────────
  const [events,       setEventsState] = useState<CalendarEvent[]>(() => getCalendarEvents());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null | 'new'>(null);

  function saveEvent(e: CalendarEvent) {
    const updated = editingEvent && editingEvent !== 'new'
      ? events.map(x => x.id === e.id ? e : x)
      : [...events, e];
    setEventsState(updated);
    setCalendarEvents(updated);
    setEditingEvent(null);
  }

  function deleteEvent(e: CalendarEvent) {
    const updated = events.filter(x => x.id !== e.id);
    setEventsState(updated);
    setCalendarEvents(updated);
    setEditingEvent(null);
  }

  function eventsForDate(dateKey: string): CalendarEvent[] {
    return events.filter(e => eventOccursOn(e, dateKey));
  }

  // ── Schedule state — read once on mount, not on every render ──────────────
  const [schedule,      setSchedule]      = useState<ClassPeriod[]>(() => getSchedule());
  const [scheduleType,  setScheduleType]  = useState<'standard' | 'block'>(() => getScheduleType());
  const [adjustedDays,  setAdjustedDays]  = useState<{ label: string; startH?: number; startM?: number; endH?: number; endM?: number }[]>(() => getAdjustedDays());

  // Re-sync schedule state when returning from ScheduleScreen
  useEffect(() => {
    function onFocus() {
      setSchedule(getSchedule());
      setScheduleType(getScheduleType());
      setAdjustedDays(getAdjustedDays());
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // ── Zoom state (pinch-to-zoom scales hour height) ──────────────────────────
  const [hourPx, setHourPx] = useState(56);
  const HOUR_PX_MIN = 36;
  const HOUR_PX_MAX = 120;

  // ── Shared A/B day override state — used by both WeekView and DayView ────────
  const [dayOverrides, setDayOverridesState] = useState<Record<string, 'A' | 'B' | 'off'>>(() => getDayOverrides());

  function setOverride(key: string, val: 'A' | 'B' | 'off' | null) {
    setDayOverridesState(prev => {
      const next = { ...prev };
      if (val === null) { delete next[key]; } else { next[key] = val; }
      setDayOverrides(next);
      return next;
    });
  }

  // Derive A or B for any date purely from the anchor week + overrides.
  // No stored inference — calculated on every render.
  // anchor = the Monday of the first week classes were entered (= A-week)
  // Walk backwards from dateKey to find the nearest override or anchor,
  // then count real school days (skipping Off) to determine odd/even.
  function getDerivedBlockDay(dateKey: string): 'A' | 'B' | null {
    if (scheduleType !== 'block') return null;
    const anchor = getOrCreateBlockAnchor();

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
    else { if (month === 0) { setMonth(11); setYear((y: number) => y - 1); } else setMonth((m: number) => m - 1); }
  }
  function nextPeriod() {
    setSelectedKey(null);
    if (viewMode === 'day') {
      const d = new Date(dayKey + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      setDayKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    } else if (viewMode === 'week') setWeekOffset(o => o + 1);
    else { if (month === 11) { setMonth(0); setYear((y: number) => y + 1); } else setMonth((m: number) => m + 1); }
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setEditingEvent('new')}
              style={{ background: '#B8E04A', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: Colors.forest, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Event
            </button>
            <button
              onClick={() => navigate('schedule')}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}
            >
              Edit schedule
            </button>
          </div>
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
              schedule={schedule}
              scheduleType={scheduleType}
              adjustedDays={adjustedDays}
              events={eventsForDate(dayKey)}
              onEditEvent={(e) => setEditingEvent(e)}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              weekStart={monday}
              byDate={byDate}
              allAssignments={assignments}
              selectedKey={selectedKey}
              onSelectDay={(key: string) => { setSelectedKey(key); setDayKey(key); setViewMode('day'); }}
              onNavigate={navigate}
              dayOverrides={dayOverrides}
              setOverride={setOverride}
              hourPx={hourPx}
              getDerivedBlockDay={getDerivedBlockDay}
              schedule={schedule}
              scheduleType={scheduleType}
              adjustedDays={adjustedDays}
              eventsForDate={eventsForDate}
              onEditEvent={(e) => setEditingEvent(e)}
            />
          ) : (
            <MonthView
              year={year} month={month}
              byDate={byDate}
              allAssignments={assignments}
              selectedKey={selectedKey}
              onSelectDay={(key: string) => { setSelectedKey(key); setDayKey(key); setViewMode('day'); }}
              onNavigate={navigate}
            />
          )}
        </div>
      </ScrollBody>

      <BottomNav current="calendar" onNavigate={(s: string) => navigate(s as any)} items={NAV} />
      {editingEvent !== null && (
        <EventEditor
          initial={editingEvent === 'new' ? null : editingEvent}
          anchorDate={dayKey}
          courses={courses}
          onSave={saveEvent}
          onDelete={editingEvent !== 'new' ? deleteEvent : undefined}
          onCancel={() => setEditingEvent(null)}
        />
      )}
    </Screen>
  );
}
