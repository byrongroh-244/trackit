import { daysUntil } from '../../data/store';
import type { Assignment, Subtask } from '../../types';

export const DAYS         = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const DAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export interface ClassPeriod {
  name:          string;
  color:         string;
  days:          number[];   // 0=Sun, 1=Mon … 6=Sat
  startHour:     number;
  startMin:      number;
  endHour:       number;
  endMin:        number;
  room?:         string;
  blockDay?:     'A' | 'B' | null;
  altStartHour?: number;
  altStartMin?:  number;
  altEndHour?:   number;
  altEndMin?:    number;
}

export function isTestOrQuiz(type: Assignment['type']): boolean {
  return type === 'test' || type === 'quiz';
}

export function toKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function today(): { y: number; m: number; d: number } {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
}

export function assignmentsByDate(assignments: Assignment[]): Record<string, Assignment[]> {
  const map: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    if (!a.dueDate) continue;
    if (!map[a.dueDate]) map[a.dueDate] = [];
    map[a.dueDate].push(a);
  }
  return map;
}

export function sortedMarkers(items: Assignment[]): Assignment[] {
  return [...items].sort((a, b) => {
    const rank = (t: string) => t === 'test' ? 0 : t === 'quiz' ? 1 : 2;
    return rank(a.type) - rank(b.type);
  });
}

export function stepsDueOn(assignments: Assignment[], dateKey: string): { step: Subtask; assignment: Assignment }[] {
  const result: { step: Subtask; assignment: Assignment }[] = [];
  for (const a of assignments) {
    for (const s of a.subtasks ?? []) {
      if (s.dueDate === dateKey && !s.done) result.push({ step: s, assignment: a });
    }
  }
  return result;
}

export { daysUntil };
