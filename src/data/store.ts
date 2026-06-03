import type { Assignment, AssignmentType, Course, Subtask } from '../types';
import stepLibrary from './stepLibrary.json';
import { SUPABASE_ANON_KEY, AI_FUNCTION_URL, CANVAS_PROXY_URL, supabase as supabaseClient } from '../lib/supabase';

async function getSessionToken(): Promise<string> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token ?? SUPABASE_ANON_KEY;
}

const SETTINGS_KEY = 'trackit_settings';

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
  microstepsEnabled: boolean;
  termsAccepted: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  agendaLookaheadDays: 0,
  focusWorkMinutes: 10,
  focusBreakMinutes: 3,
  gradeLevel: '',
  currentSemester: 'fall',
  onboardingComplete: false,
  microstepsEnabled: true,
  termsAccepted: false,
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
      const token = await getSessionToken();
      const res = await fetch(AI_FUNCTION_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

async function canvasFetch(domain: string, token: string, path: string): Promise<any> {
  const clean = domain.replace(/https?:\/\//, '').replace(/\/$/, '');
  const sessionToken = await getSessionToken();
  const res = await fetch(CANVAS_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ domain: clean, token, path }),
  });
  if (!res.ok) throw new Error(`Canvas returned ${res.status}. Check your URL and token.`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string;
}

export interface CanvasImportResult {
  courses: Course[];
  assignments: Assignment[];
}

/** Fetch all active Canvas courses — no arbitrary limit */
export async function fetchCanvasCourses(domain: string, token: string): Promise<CanvasCourse[]> {
  const clean = domain.replace(/https?:\/\//, '').replace(/\/$/, '');
  const data = await canvasFetch(clean, token, 'courses?enrollment_state=active&per_page=50');
  if (!Array.isArray(data)) throw new Error('Unexpected response. Check your Canvas URL and token.');
  return (data as any[]).map(c => ({
    id:          c.id,
    name:        c.name || c.course_code || `Course ${c.id}`,
    course_code: c.course_code,
  }));
}

/** Import assignments for selected courses only.
 *  Uses no bucket filter and higher per_page so nothing is missed. */
export async function importFromCanvas(
  domain: string,
  token: string,
  existingColors: string[],
  colorPalette: readonly string[],
  gradeLevel = '',
  selectedCourseIds?: number[],   // if provided, only import these courses
  existingCourses: Course[] = [], // pass app courses so we can use renamed display names
): Promise<CanvasImportResult> {
  const clean = domain.replace(/https?:\/\//, '').replace(/\/$/, '');

  // Fetch courses
  const allCourses = await fetchCanvasCourses(domain, token);
  const toImport   = selectedCourseIds
    ? allCourses.filter(c => selectedCourseIds.includes(c.id))
    : allCourses;

  const usedColors = new Set(existingColors);

  // Build course metadata first (synchronous — no network needed)
  const courseList = toImport.map((cc, i) => {
    const color = colorPalette.find(c => !usedColors.has(c)) ?? colorPalette[i % colorPalette.length];
    usedColors.add(color);
    const existingCourse = existingCourses.find(c => c.canvasId === cc.id);
    const displayName    = existingCourse?.name  ?? cc.name;
    const courseColor    = existingCourse?.color ?? color;
    const courseId       = existingCourse?.id    ?? uid();
    return {
      course: { id: courseId, name: displayName, color: courseColor, canvasName: cc.name, canvasId: cc.id } as Course,
      isNew: !existingCourse,
      cc,
    };
  });

  const newCourses: Course[] = courseList.filter(c => c.isNew).map(c => c.course);

  // Fetch all courses' assignments in parallel, capped at 5 concurrent requests
  const CONCURRENCY = 5;
  const allAssignments: Assignment[][] = [];

  for (let i = 0; i < courseList.length; i += CONCURRENCY) {
    const batch = courseList.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ({ course, cc }) => {
        try {
          const asgns = await canvasFetch(clean, token,
            `courses/${cc.id}/assignments?per_page=50&order_by=due_at`
          ) as Array<{ name: string; due_at?: string; description?: string; submission_types?: string[] }>;
          if (!Array.isArray(asgns)) return [];
          return asgns
            .filter(a => a.due_at && !(a.submission_types?.includes('not_graded') && a.submission_types.length === 1))
            .map(a => ({
              id: uid(), name: a.name,
              classId: course.id, className: course.name, classColor: course.color,
              dueDate: a.due_at!.split('T')[0], done: false,
              notes: (a.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
              type: inferType(a.name),
              effort: null,
              subtasks: [],
            } as Assignment));
        } catch { return []; }
      })
    );
    allAssignments.push(...results);
  }

  const newAssignments = allAssignments.flat();
  return { courses: newCourses, assignments: newAssignments };
}
