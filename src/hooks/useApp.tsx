import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Assignment, Course, Screen } from '../types';
import { supabase } from '../lib/supabase';
import { loadSettings, saveSettings, type AppSettings } from '../data/store';

interface AppState {
  assignments: Assignment[];
  courses: Course[];
  screen: Screen;
  detailId: string | null;
  settings: AppSettings;
  loading: boolean;
  userId: string | null;
}

interface AppCtx extends AppState {
  navigate: (screen: Screen, detailId?: string) => void;
  updateAssignments: (a: Assignment[], changed?: Assignment[]) => Promise<void>;
  upsertAssignments: (added: Assignment[]) => Promise<void>;
  updateCourses:     (c: Course[]) => Promise<void>;
  patchAssignment:   (updated: Assignment) => Promise<void>;
  deleteAssignment:  (id: string) => Promise<void>;
  updateSettings:    (s: AppSettings) => Promise<void>;
  reset:             () => Promise<void>;
  signOut:           () => Promise<void>;
}

const Ctx = createContext<AppCtx | null>(null);

// ── Row converters ────────────────────────────────────────────────────────────
function toDbAssignment(a: Assignment, uid: string) {
  // Only includes columns that exist in the original Supabase schema.
  // New columns (effort, weight, communications) require ALTER TABLE migrations
  // before they can be included here. Add them back once migrations are confirmed:
  //
  //   ALTER TABLE assignments
  //     ADD COLUMN IF NOT EXISTS effort         text    DEFAULT null,
  //     ADD COLUMN IF NOT EXISTS weight         float   DEFAULT null,
  //     ADD COLUMN IF NOT EXISTS communications jsonb   DEFAULT '[]';
  return {
    id: a.id, user_id: uid, name: a.name,
    class_id: a.classId || null, class_name: a.className, class_color: a.classColor,
    due_date: a.dueDate, done: a.done, notes: a.notes ?? '',
    type: a.type ?? 'homework', subtasks: a.subtasks ?? [],
  };
}

function fromDbAssignment(row: any): Assignment {
  return {
    id: row.id, name: row.name,
    classId: row.class_id ?? '', className: row.class_name ?? '', classColor: row.class_color ?? '',
    dueDate: row.due_date, done: row.done ?? false, notes: row.notes ?? '',
    type: row.type ?? 'homework', subtasks: row.subtasks ?? [],
    effort: row.effort ?? null,
    weight: row.weight ?? undefined,
    communications: row.communications ?? [],
  };
}

function toDbCourse(c: Course, uid: string) {
  return { id: c.id, user_id: uid, name: c.name, color: c.color, description: c.description ?? '' };
}

function fromDbCourse(row: any): Course {
  return { id: row.id, name: row.name, color: row.color, description: row.description ?? '' };
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [settings,    setSettings]    = useState<AppSettings>(() => loadSettings());
  const [screen,      setScreen]      = useState<Screen>('today');
  const [detailId,    setDetailId]    = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [userId,      setUserId]      = useState<string | null>(null);

  // useRef so callbacks always read the latest userId without needing it
  // in their dependency arrays. A plain object literal re-created each render
  // breaks this — useCallback with [] deps would capture the first render's
  // object whose .current is permanently null.
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;

  async function loadData(uid: string) {
    const [{ data: cData }, { data: aData }, { data: sData }] = await Promise.all([
      supabase.from('courses').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('assignments').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('settings').select('*').eq('user_id', uid).maybeSingle(),
    ]);
    if (cData) setCourses(cData.map(fromDbCourse));
    if (aData) setAssignments(aData.map(fromDbAssignment));
    if (sData) {
      const s: AppSettings = {
        agendaLookaheadDays:  sData.agenda_lookahead_days  ?? 0,
        focusWorkMinutes:     sData.focus_work_minutes      ?? 10,
        focusBreakMinutes:    sData.focus_break_minutes     ?? 3,
        gradeLevel:           sData.grade_level             ?? '',
        currentSemester:      sData.current_semester        ?? 'fall',
        onboardingComplete:   sData.onboarding_complete     ?? false,
      };
      setSettings(s);
      saveSettings(s);
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUserId(session.user.id); loadData(session.user.id); }
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) { setUserId(session.user.id); loadData(session.user.id); }
      else { setUserId(null); setAssignments([]); setCourses([]); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const navigate = useCallback((s: Screen, id?: string) => {
    setScreen(s); setDetailId(id ?? null);
  }, []);

  // ── updateAssignments ──────────────────────────────────────────────────────
  // Accepts an optional `changed` array. When provided, only those records are
  // upserted — the rest already exist in Supabase and don't need touching.
  // When omitted, the full array is upserted (legacy behaviour) with a warning
  // so callers can be found and migrated to pass `changed`.
  const updateAssignments = useCallback(async (updated: Assignment[], changed?: Assignment[]) => {
    setAssignments(updated);

    const uid = userIdRef.current;
    if (!uid) { console.error('updateAssignments: no userId'); return; }

    const toWrite = changed ?? updated;

    if (!changed) {
      console.warn(
        'updateAssignments called without `changed` — upserting full array (%d records).',
        updated.length,
      );
    }

    const { error } = await supabase
      .from('assignments')
      .upsert(toWrite.map(a => toDbAssignment(a, uid)));

    if (error) {
      console.error('updateAssignments Supabase error:', JSON.stringify(error));
    }
  }, []);

  // ── upsertAssignments ──────────────────────────────────────────────────────
  // For inserting brand-new records only (syllabus import, voice import, etc.).
  // Optimistically appends to local state, then inserts only the new rows.
  // Uses `ignoreDuplicates: true` so a double-submit never throws.
  const upsertAssignments = useCallback(async (added: Assignment[]) => {
    if (added.length === 0) return;

    setAssignments(prev => [...prev, ...added]);

    const uid = userIdRef.current;
    if (!uid) { console.error('upsertAssignments: no userId'); return; }

    const { error } = await supabase
      .from('assignments')
      .insert(added.map(a => toDbAssignment(a, uid)));

    if (error) {
      console.error('upsertAssignments Supabase error:', JSON.stringify(error));
    }
  }, []);

  // ── updateCourses ──────────────────────────────────────────────────────────
  const updateCourses = useCallback(async (updated: Course[]) => {
    setCourses(updated);

    const uid = userIdRef.current;
    if (!uid) return;

    const { error } = await supabase
      .from('courses')
      .upsert(updated.map(c => toDbCourse(c, uid)));

    if (error) console.error('updateCourses:', error);
  }, []);

  // ── patchAssignment ────────────────────────────────────────────────────────
  // Single-record update — always targeted, never writes the full array.
  const patchAssignment = useCallback(async (updated: Assignment) => {
    setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));

    const uid = userIdRef.current;
    if (!uid) return;

    const { error } = await supabase
      .from('assignments')
      .upsert(toDbAssignment(updated, uid));

    if (error) console.error('patchAssignment:', error);
  }, []);

  // ── deleteAssignment ───────────────────────────────────────────────────────
  const deleteAssignment = useCallback(async (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));

    const uid = userIdRef.current;
    if (!uid) { console.error('deleteAssignment: no userId'); return; }

    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) console.error('deleteAssignment failed:', error);
  }, []);

  // ── updateSettings ─────────────────────────────────────────────────────────
  const updateSettings = useCallback(async (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);

    const uid = userIdRef.current;
    if (!uid) return;

    const { error } = await supabase.from('settings').upsert({
      user_id:               uid,
      agenda_lookahead_days: s.agendaLookaheadDays,
      focus_work_minutes:    s.focusWorkMinutes,
      focus_break_minutes:   s.focusBreakMinutes,
      grade_level:           s.gradeLevel,
      current_semester:      s.currentSemester,
      onboarding_complete:   s.onboardingComplete,
    }, { onConflict: 'user_id' });

    if (error) console.error('updateSettings error:', error);
    else console.log('Settings saved:', s.onboardingComplete);
  }, []);

  // ── reset ──────────────────────────────────────────────────────────────────
  // Confirmation is handled by the calling screen via ConfirmSheet.
  // This function unconditionally deletes all user data.
  const reset = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) { console.error('reset: no userId'); return; }

    const [aResult, cResult] = await Promise.all([
      supabase.from('assignments').delete().eq('user_id', uid),
      supabase.from('courses').delete().eq('user_id', uid),
    ]);
    if (aResult.error) console.error('reset assignments failed:', aResult.error);
    if (cResult.error) console.error('reset courses failed:', cResult.error);

    // Clear local state regardless — even if the DB call failed, local UI resets
    setAssignments([]); setCourses([]); setScreen('today'); setDetailId(null);
  }, []);

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAssignments([]); setCourses([]); setScreen('today'); setDetailId(null); setUserId(null);
  }, []);

  return (
    <Ctx.Provider value={{
      assignments, courses, screen, detailId, settings, loading, userId,
      navigate, updateAssignments, upsertAssignments, updateCourses,
      patchAssignment, deleteAssignment, updateSettings, reset, signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
