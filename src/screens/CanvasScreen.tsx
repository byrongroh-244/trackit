import { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { fetchCanvasCourses, uid, type CanvasCourse } from '../data/store';
import { Colors, CLASS_COLORS } from '../theme';
import { Screen, ScrollBody, useToast } from '../components/UI';
import { IconCircleCheck, IconArrowLeft } from '../components/Icons';
import type { Course, Assignment } from '../types';
import { supabase, CANVAS_PROXY_URL } from '../lib/supabase';
import { getCanvasDomain, setCanvasDomain, getCanvasToken, setCanvasToken, getCanvasSelectedIds, setCanvasSelectedIds } from '../data/scheduleStorage';

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : '';
}





// ── Stages ──────────────────────────────────────────────────────────────────
// form → connect credentials
// select → pick which Canvas courses to import
// setup → nickname + teacher for each NEW course
// syncing → fetching assignments
// done → summary
type Stage = 'form' | 'select' | 'setup' | 'syncing' | 'done' | 'error';

interface ClassSetup {
  canvasCourse: CanvasCourse;
  nickname: string;
  teacher:  string;
  color:    string;
}

async function canvasFetch(domain: string, token: string, path: string) {
  const clean = domain.replace(/https?:\/\//, '').replace(/\/$/, '');
  const authHeader = await getAuthHeader();
  const res = await fetch(CANVAS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader, 'apikey': authHeader.replace('Bearer ', '') },
    body: JSON.stringify({ domain: clean, token, path }),
  });
  if (!res.ok) throw new Error(`Canvas error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export default function CanvasScreen() {
  const { courses, assignments, navigate, updateCourses, upsertAssignments, settings } = useApp();
  const { showToast } = useToast();

  const [domain,       setDomain]       = useState(getCanvasDomain);
  const [token,        setToken]        = useState(getCanvasToken);
  const [stage,        setStage]        = useState<Stage>(getCanvasDomain() && getCanvasToken() ? 'select' : 'form');
  const [error,        setError]        = useState('');
  const [allCourses,   setAllCourses]   = useState<CanvasCourse[]>([]);
  const [selected,     setSelected]     = useState<Set<number>>(new Set());
  const [setups,       setSetups]       = useState<ClassSetup[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [summary,      setSummary]      = useState({ classes: 0, assignments: 0 });
  const gradeLevel = settings.gradeLevel ?? '';

  // If already connected, jump to select
  useEffect(() => {
    const d = getCanvasDomain();
    const t = getCanvasToken();
    if (d && t) connect(d, t);
    // eslint-disable-next-line
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────
  async function connect(d = domain, t = token) {
    if (!d.trim() || !t.trim()) { setError('Enter your Canvas URL and token.'); return; }
    setLoading(true); setError('');
    try {
      const list = await fetchCanvasCourses(d.trim(), t.trim());
      setCanvasDomain(d.trim()); setCanvasToken(t.trim());
      setAllCourses(list);
      // Pre-check courses already imported (matched by canvasId)
      const alreadySynced = new Set(
        list
          .filter(cc => courses.some(c => c.canvasId === cc.id))
          .map(cc => cc.id)
      );
      setSelected(alreadySynced);
      setStage('select');
    } catch (e: any) {
      setError(e.message ?? 'Could not connect.');
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Proceed from selection ────────────────────────────────────────────────
  function proceed() {
    if (selected.size === 0) { showToast('Select at least one course.', 'error'); return; }

    const selectedCourses = allCourses.filter(cc => selected.has(cc.id));

    // A course is "already in app" ONLY if it has a matching canvasId stored in DB
    // We do NOT fall back to name matching — that caused false positives
    const newCourses = selectedCourses.filter(cc =>
      !courses.some(c => c.canvasId === cc.id)
    );

    if (newCourses.length === 0) {
      // All selected already have canvasId match — re-sync assignments only
      doSync([], selectedCourses);
      return;
    }

    // Build setup list for new courses
    const usedColors = new Set(courses.map(c => c.color));
    const newSetups: ClassSetup[] = newCourses.map((cc, i) => ({
      canvasCourse: cc,
      nickname: '',
      teacher:  '',
      color: CLASS_COLORS.find(c => !usedColors.has(c)) ?? CLASS_COLORS[i % CLASS_COLORS.length],
    }));
    setSetups(newSetups);
    setStage('setup');
  }

  function updateSetup(idx: number, field: keyof Omit<ClassSetup, 'canvasCourse'>, val: string) {
    setSetups(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  }

  // ── Sync ─────────────────────────────────────────────────────────────────
  async function doSync(newSetups: ClassSetup[], selectedCourses: CanvasCourse[]) {
    setStage('syncing');
    setError('');
    try {
      // 1. Create Course records for brand-new classes
      const newAppCourses: Course[] = newSetups.map(s => ({
        id:          uid(),
        name:        s.nickname.trim() || s.canvasCourse.name,
        color:       s.color,
        teacherName: s.teacher.trim(),
        canvasName:  s.canvasCourse.name,  // original, never shown to user
        canvasId:    s.canvasCourse.id,    // numeric Canvas ID, permanent link
      }));

      const merged = [...courses, ...newAppCourses];
      if (newAppCourses.length > 0) await updateCourses(merged);

      // 2. Fetch assignments for selected courses using correct display names
      const newAssignments: Assignment[] = [];
      for (const cc of selectedCourses) {
        // Find the app course — prefer canvasId match, then it must be a new one we just created
        const appCourse =
          merged.find(c => c.canvasId === cc.id) ??
          newAppCourses.find(c => c.canvasName === cc.name);

        if (!appCourse) continue;

        try {
          const asgns = await canvasFetch(domain.trim(), token.trim(),
            `courses/${cc.id}/assignments?per_page=50&order_by=due_at`
          ) as Array<{ name: string; due_at?: string; description?: string; submission_types?: string[] }>;

          if (!Array.isArray(asgns)) continue;

          for (const a of asgns) {
            if (!a.due_at) continue;
            if (a.submission_types?.includes('not_graded') && a.submission_types.length === 1) continue;
            const dueDate = a.due_at.split('T')[0];
            newAssignments.push({
              id: uid(), name: a.name,
              classId: null as any, className: appCourse.name, classColor: appCourse.color,
              dueDate, done: false,
              notes: (a.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
              type: 'homework' as any,
              effort: null,
              subtasks: [],
            });
          }
        } catch { /* skip course */ }
      }

      await upsertAssignments(newAssignments);
      setSummary({ classes: newAppCourses.length, assignments: newAssignments.length });
      setStage('done');
    } catch (e: any) {
      setError(e.message ?? 'Sync failed.');
      setStage('error');
    }
  }

  function disconnect() {
    setCanvasDomain(''); setCanvasToken('');
    setDomain(''); setToken(''); setAllCourses([]); setSelected(new Set());
    setStage('form');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 14, padding: '11px 13px',
    borderRadius: 10, border: '1.5px solid #E3EBEA', outline: 'none',
    fontFamily: 'inherit', color: Colors.textPrimary, background: Colors.background,
    boxSizing: 'border-box',
  };

  function Header({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) {
    return (
      <div style={{ background: Colors.forest, padding: '18px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: sub ? 8 : 0 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
            </button>
          )}
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{title}</div>
        </div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', paddingLeft: onBack ? 44 : 0 }}>{sub}</div>}
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (stage === 'done') return (
    <Screen>
      <Header title="Synced!" onBack={() => navigate('classes')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D9F5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCircleCheck size={36} color="#1E8A55" />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, letterSpacing: '-0.03em' }}>All done</div>
        <div style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 1.6 }}>
          {summary.classes > 0 && `${summary.classes} new class${summary.classes !== 1 ? 'es' : ''} added. `}
          {summary.assignments} assignment{summary.assignments !== 1 ? 's' : ''} imported.
        </div>
        <button onClick={() => navigate('classes')} style={{ width: '100%', maxWidth: 300, padding: 15, borderRadius: 14, border: 'none', background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          View classes
        </button>
        <button onClick={() => setStage('select')} style={{ background: 'none', border: 'none', color: Colors.textHint, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sync again
        </button>
      </div>
    </Screen>
  );

  // ── Syncing ─────────────────────────────────────────────────────────────────
  if (stage === 'syncing') return (
    <Screen>
      <Header title="Syncing Canvas…" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${Colors.forest}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 14, color: Colors.textSecondary }}>Fetching assignments…</div>
      </div>
    </Screen>
  );

  // ── Setup — nickname + teacher ──────────────────────────────────────────────
  if (stage === 'setup') return (
    <Screen>
      <Header
        title="Name your classes"
        sub="Give each a nickname — Canvas names stay in the background"
        onBack={() => setStage('select')}
      />
      <ScrollBody>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {setups.map((s, i) => (
            <div key={s.canvasCourse.id} style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #E3EBEA', padding: '16px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Canvas: <span style={{ fontWeight: 500 }}>{s.canvasCourse.name}</span>
              </div>

              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Nickname <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11, opacity: 0.7 }}>(leave blank to keep Canvas name)</span>
              </label>
              <input
                autoFocus={i === 0}
                value={s.nickname}
                onChange={e => updateSetup(i, 'nickname', e.target.value)}
                placeholder={s.canvasCourse.name}
                style={{ ...inputStyle, marginBottom: 12 }}
              />

              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Teacher <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11, opacity: 0.7 }}>(optional)</span>
              </label>
              <input
                value={s.teacher}
                onChange={e => updateSetup(i, 'teacher', e.target.value)}
                placeholder="e.g. Ms. Johnson"
                style={{ ...inputStyle, marginBottom: 14 }}
              />

              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
                Color
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {CLASS_COLORS.map(col => (
                  <button key={col} onClick={() => updateSetup(i, 'color', col)}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: col, cursor: 'pointer', border: `2px solid ${s.color === col ? '#fff' : 'transparent'}`, boxShadow: s.color === col ? `0 0 0 2.5px ${Colors.forest}` : 'none', transition: 'box-shadow 0.15s' }}
                  />
                ))}
              </div>
            </div>
          ))}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: Colors.redLight, color: Colors.red, fontSize: 13 }}>{error}</div>
          )}

          <button
            onClick={() => doSync(setups, allCourses.filter(cc => selected.has(cc.id)))}
            style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8E04A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Sync {selected.size} class{selected.size !== 1 ? 'es' : ''}
          </button>
        </div>
      </ScrollBody>
    </Screen>
  );

  // ── Select ──────────────────────────────────────────────────────────────────
  if (stage === 'select') return (
    <Screen>
      <Header
        title="Select courses"
        sub={allCourses.length > 0 ? `${domain} · ${allCourses.length} course${allCourses.length !== 1 ? 's' : ''}` : 'Loading…'}
        onBack={() => navigate('classes')}
      />
      {allCourses.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${Colors.forest}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 14, color: Colors.textSecondary }}>Loading your courses…</div>
        </div>
      ) : (
      <ScrollBody>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => setSelected(new Set(allCourses.map(c => c.id)))}
              style={{ background: 'none', border: 'none', color: Colors.forest, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Select all
            </button>
            <span style={{ color: Colors.textHint }}>·</span>
            <button onClick={() => setSelected(new Set())}
              style={{ background: 'none', border: 'none', color: Colors.textHint, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Clear
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: Colors.textSecondary }}>
              {selected.size} selected
            </span>
          </div>

          <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #E3EBEA', overflow: 'hidden', marginBottom: 16 }}>
            {allCourses.map((cc, i) => {
              const checked    = selected.has(cc.id);
              // Only show "already imported" if canvasId actually matches — no fallbacks
              const appCourse  = courses.find(c => c.canvasId === cc.id);
              const imported   = !!appCourse;
              const displayName = appCourse?.name ?? cc.name;

              return (
                <div key={cc.id} onClick={() => toggle(cc.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: i < allCourses.length - 1 ? '0.5px solid #E3EBEA' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = Colors.background)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? Colors.forest : 'rgba(0,0,0,0.2)'}`, background: checked ? Colors.forest : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B8E04A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </div>
                    {imported ? (
                      <div style={{ fontSize: 11, color: '#1E8A55', fontWeight: 600, marginTop: 1 }}>
                        ✓ Imported{displayName !== cc.name ? ` · Canvas: ${cc.name}` : ''}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: Colors.textHint, marginTop: 1 }}>
                        New — will prompt for nickname
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connected account */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary }}>{domain}</div>
              <div style={{ fontSize: 12, color: Colors.textHint }}>Token saved</div>
            </div>
            <button onClick={disconnect} style={{ background: 'none', border: 'none', fontSize: 12, color: Colors.red, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              Disconnect
            </button>
          </div>

          <button onClick={proceed} disabled={selected.size === 0}
            style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: selected.size > 0 ? Colors.forest : Colors.grayLight, color: selected.size > 0 ? '#fff' : Colors.textHint, fontSize: 15, fontWeight: 800, cursor: selected.size > 0 ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selected.size > 0 ? '#B8E04A' : Colors.textHint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {selected.size > 0 ? `Continue with ${selected.size} course${selected.size !== 1 ? 's' : ''}` : 'Select courses above'}
          </button>
        </div>
      </ScrollBody>
      )}
    </Screen>
  );

  // ── Form — enter credentials ────────────────────────────────────────────────
  return (
    <Screen>
      <Header title="Connect Canvas" onBack={() => navigate('classes')} />
      <ScrollBody>
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ background: '#fff', border: '1.5px solid #E3EBEA', borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: Colors.textPrimary, marginBottom: 14 }}>
              How to get your Canvas token
            </div>
            {[
              'Open Canvas → Account → Settings',
              'Scroll to "Approved Integrations" → New Access Token',
              'Name it "TrackIt" and copy the token',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 10 : 0, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: Colors.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.5, flex: 1, paddingTop: 2 }}>{step}</div>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Canvas URL</label>
            <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="university.instructure.com"
              style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Access token</label>
            <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your token here"
              style={inputStyle} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: Colors.redLight, color: Colors.red, fontSize: 13, lineHeight: 1.5 }}>{error}</div>
          )}

          <button onClick={() => connect()} disabled={loading || !domain.trim() || !token.trim()}
            style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: domain.trim() && token.trim() ? Colors.forest : Colors.grayLight, color: domain.trim() && token.trim() ? '#fff' : Colors.textHint, fontSize: 15, fontWeight: 700, cursor: domain.trim() && token.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            {loading ? 'Connecting…' : 'Connect & choose courses'}
          </button>

          <p style={{ fontSize: 12, color: Colors.textHint, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            Your token is saved locally and never shared.
          </p>
        </div>
      </ScrollBody>
    </Screen>
  );
}
