// ─────────────────────────────────────────────────────────────────────────────
// src/data/scheduleStorage.ts
//
// Single source of truth for all trackit_* localStorage keys.
// Import read/write helpers from here instead of using raw localStorage calls.
// This prevents silent breakage from key typos and makes reset/migration easy.
// ─────────────────────────────────────────────────────────────────────────────

import type { ClassPeriod } from '../screens/calendar/calendarUtils';

// ── Key constants ─────────────────────────────────────────────────────────────

export const KEYS = {
  CLASS_SCHEDULE:      'trackit_class_schedule',
  SCHEDULE_TYPE:       'trackit_schedule_type',
  BLOCK_ANCHOR:        'trackit_block_anchor',
  DAY_OVERRIDES:       'trackit_day_overrides',
  ADJUSTED_DAYS:       'trackit_adjusted_days',
  CANVAS_DOMAIN:       'trackit_canvas_domain',
  CANVAS_TOKEN:        'trackit_canvas_token',
  CANVAS_SELECTED_IDS: 'trackit_canvas_selected_ids',
} as const;

export type ScheduleType = 'standard' | 'block';

export interface AdjustedDay {
  label:  string;
  startH?: number;
  startM?: number;
  endH?:   number;
  endM?:   number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
}

function lsDel(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}

// ── Class schedule ────────────────────────────────────────────────────────────

export function getSchedule(): ClassPeriod[] {
  try { const r = lsGet(KEYS.CLASS_SCHEDULE); return r ? JSON.parse(r) : []; } catch { return []; }
}

export function setSchedule(periods: ClassPeriod[]): void {
  lsSet(KEYS.CLASS_SCHEDULE, JSON.stringify(periods));
}

// ── Schedule type ─────────────────────────────────────────────────────────────

export function getScheduleType(): ScheduleType {
  return (lsGet(KEYS.SCHEDULE_TYPE) as ScheduleType) ?? 'standard';
}

export function setScheduleType(type: ScheduleType): void {
  lsSet(KEYS.SCHEDULE_TYPE, type);
}

// ── Block anchor ──────────────────────────────────────────────────────────────

export function getBlockAnchor(): string | null {
  return lsGet(KEYS.BLOCK_ANCHOR);
}

export function setBlockAnchor(dateKey: string): void {
  lsSet(KEYS.BLOCK_ANCHOR, dateKey);
}

/** Returns the anchor, auto-creating it from the current Monday if missing. */
export function getOrCreateBlockAnchor(): string {
  const existing = getBlockAnchor();
  if (existing) return existing;
  const now = new Date();
  const dow = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const key = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
  setBlockAnchor(key);
  return key;
}

// ── Day overrides ─────────────────────────────────────────────────────────────

export function getDayOverrides(): Record<string, 'A' | 'B' | 'off'> {
  try { const r = lsGet(KEYS.DAY_OVERRIDES); return r ? JSON.parse(r) : {}; } catch { return {}; }
}

export function setDayOverrides(overrides: Record<string, 'A' | 'B' | 'off'>): void {
  lsSet(KEYS.DAY_OVERRIDES, JSON.stringify(overrides));
}

// ── Adjusted days ─────────────────────────────────────────────────────────────

export function getAdjustedDays(): AdjustedDay[] {
  try { const r = lsGet(KEYS.ADJUSTED_DAYS); return r ? JSON.parse(r) : []; } catch { return []; }
}

export function setAdjustedDays(days: AdjustedDay[]): void {
  lsSet(KEYS.ADJUSTED_DAYS, JSON.stringify(days));
}

// ── Canvas credentials ────────────────────────────────────────────────────────

export function getCanvasDomain(): string {
  return lsGet(KEYS.CANVAS_DOMAIN) ?? '';
}

export function setCanvasDomain(domain: string): void {
  lsSet(KEYS.CANVAS_DOMAIN, domain);
}

export function getCanvasToken(): string {
  return lsGet(KEYS.CANVAS_TOKEN) ?? '';
}

export function setCanvasToken(token: string): void {
  lsSet(KEYS.CANVAS_TOKEN, token);
}

export function getCanvasSelectedIds(): number[] {
  try { const r = lsGet(KEYS.CANVAS_SELECTED_IDS); return r ? JSON.parse(r) : []; } catch { return []; }
}

export function setCanvasSelectedIds(ids: number[]): void {
  lsSet(KEYS.CANVAS_SELECTED_IDS, JSON.stringify(ids));
}

// ── Reset all schedule keys ───────────────────────────────────────────────────

export function resetScheduleStorage(): void {
  [
    KEYS.CLASS_SCHEDULE,
    KEYS.SCHEDULE_TYPE,
    KEYS.BLOCK_ANCHOR,
    KEYS.DAY_OVERRIDES,
    KEYS.ADJUSTED_DAYS,
  ].forEach(lsDel);
}

export function resetCanvasStorage(): void {
  [
    KEYS.CANVAS_DOMAIN,
    KEYS.CANVAS_TOKEN,
    KEYS.CANVAS_SELECTED_IDS,
  ].forEach(lsDel);
}

export function resetAllStorage(): void {
  resetScheduleStorage();
  resetCanvasStorage();
  lsDel(EVENTS_KEY);
}

// ── Calendar events ───────────────────────────────────────────────────────────

export const EVENTS_KEY = 'trackit_calendar_events';

export function getCalendarEvents(): import('../types').CalendarEvent[] {
  try { const r = lsGet(EVENTS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

export function setCalendarEvents(events: import('../types').CalendarEvent[]): void {
  lsSet(EVENTS_KEY, JSON.stringify(events));
}

/** Returns true if a CalendarEvent should appear on the given YYYY-MM-DD date. */
export function eventOccursOn(event: import('../types').CalendarEvent, dateKey: string): boolean {
  const anchor = new Date(event.anchorDate + 'T00:00:00');
  const target = new Date(dateKey + 'T00:00:00');
  if (target < anchor) return false;
  if (event.recurrence === 'none') return dateKey === event.anchorDate;
  const diffDays = Math.round((target.getTime() - anchor.getTime()) / 86_400_000);
  if (event.recurrence === 'daily')    return true;
  if (event.recurrence === 'weekly')   return diffDays % 7 === 0;
  if (event.recurrence === 'biweekly') return diffDays % 14 === 0;
  if (event.recurrence === 'monthly') {
    return anchor.getDate() === target.getDate();
  }
  return false;
}
