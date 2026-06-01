import type { Assignment, AssignmentType, Course, Subtask } from '../types';
import stepLibrary from './stepLibrary.json';

const SETTINGS_KEY = 'trackit_settings';

// ── AI subtask fallback ───────────────────────────────────────────────────────
const AI_FUNCTION_URL = 'https://vnofpgowelblwkonkeab.supabase.co/functions/v1/parse-assignment';
const AI_ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub2ZwZ293ZWxibHdrb25rZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTIzNDEsImV4cCI6MjA5NTQ4ODM0MX0.WPHYoSzUjlXlB8ezsh_IrnFqWt_F33HL36tZgk0vjZc';

export function uid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dateStr + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  } catch { return dateStr; }
}

export function formatLongDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  } catch { return dateStr; }
}

// ── Settings ──────────────────────────────────────────────────────────────────
export interface AppSettings {
  agendaLookaheadDays: number;
  focusWorkMinutes: number;
  focusBreakMinutes: number;
  gradeLevel: string;
  currentSemester: string;
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  agendaLookaheadDays: 0,
  focusWorkMinutes: 10,
  focusBreakMinutes: 3,
  gradeLevel: '',
  currentSemester: 'fall',
  onboardingComplete: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

// ── Type inference ────────────────────────────────────────────────────────────
export function inferType(name: string): AssignmentType {
  const l = name.toLowerCase();
  if (/\btest\b|exam|midterm|final/.test(l))          return 'test';
  if (/\bquiz\b/.test(l))                              return 'quiz';
  if (/essay|paper|report|write|writing/.test(l))      return 'project';
  if (/project|presentation|poster|slideshow/.test(l)) return 'project';
  return 'homework';
}

// ── Grade level helper ────────────────────────────────────────────────────────
function gradeCategory(gradeLevel: string): 'high_school' | 'college' {
  if (gradeLevel.startsWith('hs_')) return 'high_school';
  return 'college';
}

// ── Step library lookup ───────────────────────────────────────────────────────
type LibraryNode = { [key: string]: string[] | LibraryNode };

function lookupSteps(path: string[], fallback: string[]): string[] {
  let node: LibraryNode | string[] = stepLibrary as unknown as LibraryNode;
  for (const key of path) {
    if (typeof node === 'object' && !Array.isArray(node) && key in node) {
      node = (node as LibraryNode)[key] as LibraryNode | string[];
    } else {
      return fallback;
    }
  }
  return Array.isArray(node) ? node : fallback;
}

// ── Smart subtask generation ──────────────────────────────────────────────────
function spaceSteps(steps: string[], dueDate: string): Subtask[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate + 'T00:00:00');
  const totalDays = Math.max(0, Math.round((due.getTime() - today.getTime()) / 86_400_000));
  return steps.map((text, i) => {
    let stepDate: string | null = null;
    if (totalDays > 0) {
      const offset = Math.round(((i + 1) / steps.length) * totalDays);
      const d = new Date(today);
      d.setDate(today.getDate() + Math.min(offset, totalDays));
      stepDate = d.toISOString().split('T')[0];
    } else if (dueDate) {
      stepDate = dueDate;
    }
    return { id: uid(), text, done: false, dueDate: stepDate };
  });
}

// ── Reschedule incomplete subtask dates ───────────────────────────────────────
// Keeps done subtasks untouched. Redistributes undone step dates proportionally
// between today and the assignment due date using the same logic as spaceSteps.
// If the assignment is already overdue, all undone steps are set to today.
export function rescheduleSubtasks(subtasks: Subtask[], assignmentDueDate: string): Subtask[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(assignmentDueDate + 'T00:00:00');
  const totalDays = Math.max(0, Math.round((due.getTime() - today.getTime()) / 86_400_000));
  const todayStr  = today.toISOString().split('T')[0];

  const undone  = subtasks.filter(s => !s.done);
  const doneSet = new Set(subtasks.filter(s => s.done).map(s => s.id));

  const rescheduled = undone.map((s, i) => {
    let newDate: string | null;
    if (totalDays === 0) {
      // Already at or past due date — everything is today
      newDate = todayStr;
    } else {
      const offset = Math.round(((i + 1) / undone.length) * totalDays);
      const d = new Date(today);
      d.setDate(today.getDate() + Math.min(offset, totalDays));
      newDate = d.toISOString().split('T')[0];
    }
    return { ...s, dueDate: newDate };
  });

  // Merge back preserving original order and done subtasks
  const rescheduledById = new Map(rescheduled.map(s => [s.id, s]));
  return subtasks.map(s => doneSet.has(s.id) ? s : (rescheduledById.get(s.id) ?? s));
}

function shortLabel(name: string): string {
  return name
    .replace(/^(chapter|ch\.?|unit|section|sec\.?|module|mod\.?)\s*[\d.]+\s*/i, '')
    .replace(/\s*[-–—]\s*.*$/, '')
    .trim()
    .toLowerCase()
    .slice(0, 40);
}

export async function generateSubtasks(name: string, dueDate: string, gradeLevel = '', effort: 'quick' | 'medium' | 'long' | null = null): Promise<Subtask[]> {
  const l     = name.toLowerCase();
  const label = shortLabel(name);
  const grade = gradeCategory(gradeLevel);
  let steps: string[];

  // ── Try library first ──
  if (/essay|paper|write|writing/.test(l)) {
    const sub = /persuasive|argument/.test(l) ? 'argumentative'
              : /analys/.test(l)              ? 'analytical'
              : /research/.test(l)            ? 'research'
              : /personal|reflect/.test(l)    ? 'personal'
              : 'argumentative';
    steps = lookupSteps(['essay', sub, grade], []);
  } else if (/lab\s*report/.test(l)) {
    const sub = /bio/.test(l) ? 'biology' : /chem/.test(l) ? 'chemistry' : /phys/.test(l) ? 'physics' : 'biology';
    steps = lookupSteps(['lab_report', sub, grade], []);
  } else if (/read|chapter|ch\.|pages|pg\./.test(l)) {
    const sub = /article|paper|journal/.test(l) ? 'article' : 'chapter';
    steps = lookupSteps(['reading', sub, grade], []);
  } else if (/\btest\b|exam/.test(l)) {
    const sub = /midterm/.test(l) ? 'midterm' : /final/.test(l) ? 'final' : 'exam';
    steps = lookupSteps(['test_prep', sub, grade], []);
  } else if (/\bquiz\b/.test(l)) {
    steps = lookupSteps(['test_prep', 'quiz', grade], []);
  } else if (/midterm/.test(l)) {
    steps = lookupSteps(['test_prep', 'midterm', grade], []);
  } else if (/final/.test(l)) {
    steps = lookupSteps(['test_prep', 'final', grade], []);
  } else if (/problem|homework|hw|worksheet|set|practice/.test(l)) {
    const sub = /calc/.test(l) ? 'calculus' : /stat/.test(l) ? 'statistics' : /math/.test(l) ? 'math' : /bio|chem|phys/.test(l) ? 'science' : 'math';
    steps = lookupSteps(['problem_set', sub, grade], []);
    if (!steps.length) steps = lookupSteps(['worksheet', 'general', grade], []);
  } else if (/presentation|slides/.test(l)) {
    steps = lookupSteps(['project', 'presentation', grade], []);
  } else if (/group\s*project/.test(l)) {
    steps = lookupSteps(['project', 'group', grade], []);
  } else if (/discussion|post|forum|respond/.test(l)) {
    steps = lookupSteps(['discussion_post', 'general', grade], []);
  } else if (/creative\s*writ/.test(l)) {
    steps = lookupSteps(['creative', 'writing', grade], []);
  } else {
    steps = [];
  }

  // ── Fallback: try AI, then generic ─────────────────────────────────────────
  if (!steps.length) {
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(AI_FUNCTION_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_ANON_KEY}` },
        body:    JSON.stringify({ mode: 'subtasks', assignmentName: name, dueDate, gradeLevel }),
        signal:  controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.steps) && data.steps.length > 0) {
          steps = data.steps as string[];
        }
      }
    } catch {
      // Network error or timeout — fall through to generic
    }
    // Generic fallback if AI also fails or returns nothing
    if (!steps.length) {
      steps = [
        `Review the requirements for "${label}"`,
        `Gather any materials or resources needed`,
        `Work through the first part`,
        `Complete the rest`,
        `Review your work before submitting`,
      ];
    }
  }

  // ── Apply effort cap ──
  // quick → max 3 steps, medium/null → max 5, long → no cap
  const cap = effort === 'quick' ? 3 : effort === 'long' ? Infinity : 5;
  if (steps.length > cap) steps = steps.slice(0, cap);

  return spaceSteps(steps, dueDate);
}

// ── Canvas API ─────────────────────────────────────────────────────────────────
const CORS_PROXY = 'https://corsproxy.io/?';

async function canvasFetch(domain: string, token: string, path: string): Promise<any> {
  const url = `${CORS_PROXY}https://${domain}/api/v1/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Canvas returned ${res.status}. Check your URL and token.`);
  return res.json();
}

export interface CanvasImportResult {
  courses: Course[];
  assignments: Assignment[];
}

export async function importFromCanvas(
  domain: string,
  token: string,
  existingColors: string[],
  colorPalette: readonly string[],
  gradeLevel = '',
): Promise<CanvasImportResult> {
  const clean = domain.replace(/https?:\/\//, '').replace(/\/$/, '');
  const canvasCourses = await canvasFetch(clean, token, 'courses?enrollment_state=active&per_page=20') as Array<{ id: number; name?: string; course_code?: string }>;
  if (!Array.isArray(canvasCourses)) throw new Error('Unexpected response. Check your Canvas URL and token.');

  const newCourses: Course[]         = [];
  const newAssignments: Assignment[] = [];
  const usedColors = new Set(existingColors);

  for (let i = 0; i < Math.min(canvasCourses.length, 8); i++) {
    const cc    = canvasCourses[i];
    const color = colorPalette.find(c => !usedColors.has(c)) ?? colorPalette[i % colorPalette.length];
    usedColors.add(color);
    const course: Course = { id: uid(), name: cc.name || cc.course_code || `Course ${i + 1}`, color };
    newCourses.push(course);
    try {
      const asgns = await canvasFetch(clean, token, `courses/${cc.id}/assignments?bucket=upcoming&per_page=15`) as Array<{ name: string; due_at?: string; description?: string }>;
      if (!Array.isArray(asgns)) continue;
      for (const a of asgns) {
        if (!a.due_at) continue;
        const dueDate = a.due_at.split('T')[0];
        newAssignments.push({
          id: uid(), name: a.name,
          classId: course.id, className: course.name, classColor: course.color,
          dueDate, done: false,
          notes: (a.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
          type: inferType(a.name),
          effort: null,
          subtasks: await generateSubtasks(a.name, dueDate, gradeLevel),
        });
      }
    } catch { /* skip course */ }
  }
  return { courses: newCourses, assignments: newAssignments };
}
