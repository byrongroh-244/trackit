import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Assignment, Course, Screen } from '../types';
import { supabase } from '../lib/supabase';
import { resetAllStorage } from '../data/scheduleStorage';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type AppSettings } from '../data/store';

interface AppState {
  assignments: Assignment[];
  courses: Course[];
  screen: Screen;
  detailId: string | null;
  settings: AppSettings;
  loading: boolean;
  userId: string | null;
  userEmail: string | null;
}

interface AppCtx extends AppState {
  authed: boolean | null;
  writeError: string | null;
  clearWriteError: () => void;
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
    class_id: null, class_name: a.className, class_color: a.classColor,
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
  return { id: c.id, user_id: uid, name: c.name, color: c.color, description: c.description ?? '', teacher_name: c.teacherName ?? '', room: c.room ?? '', canvas_name: c.canvasName ?? '', canvas_id: c.canvasId ?? null };
}

function fromDbCourse(row: any): Course {
  return { id: row.id, name: row.name, color: row.color, description: row.description ?? '', teacherName: row.teacher_name ?? '', room: row.room ?? '', canvasName: row.canvas_name ?? '', canvasId: row.canvas_id ?? undefined };
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
  const [userEmail,   setUserEmail]   = useState<string | null>(null);
  const [authed,      setAuthed]      = useState<boolean | null>(null);
  const [writeError,  setWriteError]  = useState<string | null>(null);
  const clearWriteError = useCallback(() => setWriteError(null), []);

  // useRef so callbacks always read the latest userId without needing it
  // in their dependency arrays. A plain object literal re-created each render
  // breaks this — useCallback with [] deps would capture the first render's
  // object whose .current is permanently null.
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;

  async function loadData(uid: string) {
    const [{ data: cData }, { data: aData }, { data: sData }] = await Promise.all([
      supabase.from('courses').select('id, name, color, description, teacher_name, room, canvas_name, canvas_id, created_at').eq('user_id', uid).order('created_at'),
      supabase.from('assignments').select('id, name, class_id, class_name, class_color, due_date, done, notes, type, subtasks, effort, weight, communications, created_at').eq('user_id', uid).order('created_at'),
      supabase.from('settings').select('user_id, agenda_lookahead_days, focus_work_minutes, focus_break_minutes, grade_level, current_semester, onboarding_complete, microsteps_enabled, terms_accepted').eq('user_id', uid).maybeSingle(),
    ]);
    if (cData) setCourses(cData.map(fromDbCourse));
    if (aData) {
      // Deduplicate on load — remove any duplicates by name+dueDate+className keeping latest
      const seen = new Map<string, any>();
      for (const row of aData) {
        const key = `${row.name}||${row.due_date}||${row.class_name}`;
        if (!seen.has(key)) seen.set(key, row);
      }
      setAssignments(Array.from(seen.values()).map(fromDbAssignment));
    }
    if (sData) {
      const s: AppSettings = {
        agendaLookaheadDays:  sData.agenda_lookahead_days  ?? 0,
        focusWorkMinutes:     sData.focus_work_minutes      ?? 10,
        focusBreakMinutes:    sData.focus_break_minutes     ?? 3,
        gradeLevel:           sData.grade_level             ?? '',
        currentSemester:      sData.current_semester        ?? 'fall',
        onboardingComplete:   sData.onboarding_complete     ?? false,
        microstepsEnabled:    sData.microsteps_enabled       ?? true,
        termsAccepted:        sData.terms_accepted           ?? false,
      };
      setSettings(s);
      saveSettings(s);
    } else {
      // New user — no settings row yet. Clear any stale localStorage from
      // a previous user on this device so onboardingComplete starts false.
      try { localStorage.removeItem('trackit_settings'); } catch {}
      setSettings({ ...DEFAULT_SETTINGS });
    }
    setLoading(false);
  }

  useEffect(() => {
    // 4-second fallback so the splash doesn't hang if Supabase is slow
    const timeout = setTimeout(() => { setAuthed(false); setLoading(false); }, 4000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        setAuthed(true);
        loadData(session.user.id);
      } else {
        setAuthed(false);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        setAuthed(true);
        loadData(session.user.id);
      } else {
        setUserId(null);
        setUserEmail(null);
        setAuthed(false);
        setAssignments([]);
        setCourses([]);
        setLoading(false);
      }
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
      setWriteError('Failed to save assignments. Check your connection and try again.');
    }
  }, []);

  // ── upsertAssignments ──────────────────────────────────────────────────────
  // For inserting brand-new records only (syllabus import, voice import, etc.).
  // Derives existing ID map from in-memory state — no extra Supabase round-trip.
  // Re-syncing Canvas: IDs are reused for matching name+dueDate+className combos
  // so repeated imports update in-place rather than create duplicates.
  const upsertAssignments = useCallback(async (added: Assignment[]) => {
    if (added.length === 0) return;

    // Wait up to 3s for userId if it hasn't resolved yet (e.g. right after Canvas sync)
    let uid = userIdRef.current;
    if (!uid) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        uid = userIdRef.current;
        if (uid) break;
      }
    }
    if (!uid) { console.error('upsertAssignments: no userId after wait'); return; }

    // Build ID map from current in-memory assignments — no DB round-trip needed.
    // setAssignments is called with a function so we can read the latest snapshot.
    let existingIdMap: Map<string, string> = new Map();
    setAssignments(prev => {
      existingIdMap = new Map(prev.map(a => [`${a.name}||${a.dueDate}||${a.className}`, a.id]));

      const merged = added.map(a => {
        const key = `${a.name}||${a.dueDate}||${a.className}`;
        return existingIdMap.has(key) ? { ...a, id: existingIdMap.get(key)! } : a;
      });
      // Replace existing records with updated ones, add new ones
      return [...prev.filter(a => !merged.find(m => m.id === a.id)), ...merged];
    });

    // Reuse existing IDs for matching records so upsert works correctly
    const toWrite = added.map(a => {
      const key = `${a.name}||${a.dueDate}||${a.className}`;
      return { ...a, id: existingIdMap.get(key) ?? a.id };
    });

    // Upsert in batches of 20
    for (let i = 0; i < toWrite.length; i += 20) {
      const batch = toWrite.slice(i, i + 20);
      const rows  = batch.map(a => toDbAssignment(a, uid!));
      const { error } = await supabase
        .from('assignments')
        .upsert(rows, { onConflict: 'id' });
      if (error) { console.error("upsertAssignments error:", error.code, error.message); setWriteError("Failed to save assignments. Check your connection and try again."); }
    }
  }, []);

  // ── updateCourses ──────────────────────────────────────────────────────────
  const updateCourses = useCallback(async (updated: Course[]) => {
    setCourses(updated);

    let uid = userIdRef.current;
    if (!uid) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        uid = userIdRef.current;
        if (uid) break;
      }
    }
    if (!uid) { console.error('updateCourses: no userId'); return; }

    // Delete removed courses, upsert remaining
    const { error: delErr } = await supabase
      .from('courses')
      .delete()
      .eq('user_id', uid)
      .not('id', 'in', `(${updated.map(c => `"${c.id}"`).join(',')})`);
    if (delErr) { console.error("updateCourses delete:", delErr); setWriteError("Failed to save classes. Check your connection and try again."); }

    if (updated.length > 0) {
      const rows = updated.map(c => toDbCourse(c, uid!));
      const { error } = await supabase
        .from('courses')
        .upsert(rows);
      if (error) { console.error("updateCourses error:", error.code, error.message); setWriteError("Failed to save classes. Check your connection and try again."); }
    }
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

    if (error) { console.error("patchAssignment:", error); setWriteError("Failed to update assignment. Check your connection and try again."); }
  }, []);

  // ── deleteAssignment ───────────────────────────────────────────────────────
  const deleteAssignment = useCallback(async (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));

    const uid = userIdRef.current;
    if (!uid) { console.error('deleteAssignment: no userId'); return; }

    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) { console.error("deleteAssignment failed:", error); setWriteError("Failed to delete assignment. Check your connection and try again."); }
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
      microsteps_enabled:    s.microstepsEnabled ?? true,
      terms_accepted:        s.termsAccepted     ?? false,
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
    // Clear all localStorage keys so next session starts completely fresh
    resetAllStorage();
  }, []);

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAssignments([]); setCourses([]); setScreen('today'); setDetailId(null); setUserId(null);
  }, []);

  return (
    <Ctx.Provider value={{
      assignments, courses, screen, detailId, settings, loading, userId, userEmail, authed,
      writeError, clearWriteError,
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
