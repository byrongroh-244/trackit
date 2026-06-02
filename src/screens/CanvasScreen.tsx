import { useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { fetchCanvasCourses, importFromCanvas, type CanvasCourse } from '../data/store';
import { Colors, CLASS_COLORS } from '../theme';
import { Screen, ScrollBody, useToast } from '../components/UI';
import { IconCircleCheck, IconArrowLeft, IconLoader } from '../components/Icons';

const DOMAIN_KEY = 'trackit_canvas_domain';
const TOKEN_KEY  = 'trackit_canvas_token';
const SELECTED_KEY = 'trackit_canvas_selected_ids';

function load(key: string) { try { return localStorage.getItem(key) ?? ''; } catch { return ''; } }
function save(key: string, val: string) { try { localStorage.setItem(key, val); } catch {} }

type Stage = 'form' | 'selecting' | 'syncing' | 'success' | 'error';

export default function CanvasScreen() {
  const { courses, navigate, updateCourses, upsertAssignments, settings } = useApp();
  const { showToast } = useToast();

  const savedDomain = load(DOMAIN_KEY);
  const savedToken  = load(TOKEN_KEY);
  const savedIds    = (() => { try { return JSON.parse(load(SELECTED_KEY)) as number[]; } catch { return [] as number[]; } })();

  const [domain,      setDomain]      = useState(savedDomain);
  const [token,       setToken]       = useState(savedToken);
  const [stage,       setStage]       = useState<Stage>(savedDomain && savedToken ? 'selecting' : 'form');
  const [message,     setMessage]     = useState('');
  const [canvasCourses, setCanvasCourses] = useState<CanvasCourse[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(savedIds);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [imported,    setImported]    = useState({ courses: 0, assignments: 0 });
  const gradeLevel = settings.gradeLevel ?? '';

  // Auto-load courses if we have saved credentials
  useEffect(() => {
    if (savedDomain && savedToken) {
      loadCourses(savedDomain, savedToken);
    }
  }, []); // eslint-disable-line

  async function loadCourses(d = domain, t = token) {
    if (!d.trim() || !t.trim()) { setMessage('Please enter your Canvas URL and token.'); setStage('error'); return; }
    setLoadingCourses(true); setMessage('');
    try {
      const list = await fetchCanvasCourses(d.trim(), t.trim());
      save(DOMAIN_KEY, d.trim()); save(TOKEN_KEY, t.trim());
      setCanvasCourses(list);
      // Pre-select all if nothing saved yet
      if (savedIds.length === 0) setSelectedIds(list.map(c => c.id));
      setStage('selecting');
    } catch (err: any) {
      setMessage(err.message ?? 'Could not connect. Check your URL and token.');
      setStage('error');
    } finally {
      setLoadingCourses(false);
    }
  }

  async function sync() {
    if (selectedIds.length === 0) { showToast('Select at least one course.', 'error'); return; }
    setStage('syncing');
    try {
      save(SELECTED_KEY, JSON.stringify(selectedIds));
      const result = await importFromCanvas(
        domain.trim(), token.trim(),
        courses.map(c => c.color), CLASS_COLORS,
        gradeLevel,
        selectedIds,
      );
      // Names of all Canvas courses (all of them, not just selected)
      const allCanvasNames = new Set(canvasCourses.map(c => c.name.toLowerCase().trim()));
      // Names of selected courses only
      const selectedNames  = new Set(
        canvasCourses.filter(c => selectedIds.includes(c.id)).map(c => c.name.toLowerCase().trim())
      );
      // Remove courses that came from Canvas but are not in the current selection
      const prunedCourses = courses.filter(c => {
        const nameLower = c.name.toLowerCase().trim();
        // Keep if it was never a Canvas course, or if it is in the selected set
        return !allCanvasNames.has(nameLower) || selectedNames.has(nameLower);
      });
      // Add any newly selected courses not already in the list
      const existingNames = new Set(prunedCourses.map(c => c.name.toLowerCase().trim()));
      const freshCourses  = result.courses.filter(c => !existingNames.has(c.name.toLowerCase().trim()));
      // Await courses first — assignments have a FK constraint on class_id
      await updateCourses([...prunedCourses, ...freshCourses]);
      await upsertAssignments(result.assignments);
      setImported({ courses: freshCourses.length, assignments: result.assignments.length });
      setStage('success');
    } catch (err: any) {
      setMessage(err.message ?? 'Sync failed.');
      setStage('error');
    }
  }

  function toggleCourse(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function selectAll() { setSelectedIds(canvasCourses.map(c => c.id)); }
  function selectNone() { setSelectedIds([]); }

  const isReconnecting = !!savedDomain && !!savedToken;

  // ── Success ──────────────────────────────────────────────────────────────────
  if (stage === 'success') return (
    <Screen>
      <div style={{ background: Colors.forest, padding: '18px 20px 18px', flexShrink: 0 }}>
        <button onClick={() => navigate('today')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D9F5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCircleCheck size={36} color="#1E8A55" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: Colors.textPrimary, margin: 0, letterSpacing: '-0.03em' }}>Synced!</h2>
        <p style={{ color: Colors.textSecondary, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          {imported.courses > 0 && `Added ${imported.courses} new course${imported.courses !== 1 ? 's' : ''}. `}
          Imported {imported.assignments} assignment{imported.assignments !== 1 ? 's' : ''} from {selectedIds.length} course{selectedIds.length !== 1 ? 's' : ''}.
        </p>
        <button onClick={() => navigate('today')} style={{ width: '100%', maxWidth: 300, padding: '15px', borderRadius: 14, border: 'none', background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          View agenda
        </button>
        <button onClick={() => setStage('selecting')} style={{ background: 'none', border: 'none', color: Colors.textHint, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sync again
        </button>
      </div>
    </Screen>
  );

  // ── Syncing spinner ───────────────────────────────────────────────────────────
  if (stage === 'syncing') return (
    <Screen>
      <div style={{ background: Colors.forest, padding: '18px 20px 18px', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', paddingTop: 6 }}>Syncing Canvas…</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div style={{ color: Colors.forest }}><IconLoader size={44} /></div>
        <p style={{ fontSize: 14, color: Colors.textSecondary, margin: 0 }}>Fetching assignments from {selectedIds.length} course{selectedIds.length !== 1 ? 's' : ''}…</p>
      </div>
    </Screen>
  );

  // ── Course selection ──────────────────────────────────────────────────────────
  if (stage === 'selecting') return (
    <Screen>
      <div style={{ background: Colors.forest, padding: '18px 20px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button onClick={() => navigate('classes')} aria-label="Go back" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Select courses</div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', paddingLeft: 44 }}>
          {domain} · {canvasCourses.length} active course{canvasCourses.length !== 1 ? 's' : ''}
        </div>
      </div>

      <ScrollBody>
        <div style={{ padding: '14px 16px' }}>
          {/* Select all / none */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <button onClick={selectAll} style={{ background: 'none', border: 'none', color: Colors.forest, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Select all
            </button>
            <span style={{ color: Colors.textHint, fontSize: 13 }}>·</span>
            <button onClick={selectNone} style={{ background: 'none', border: 'none', color: Colors.textHint, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Deselect all
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: Colors.textSecondary }}>
              {selectedIds.length} selected
            </span>
          </div>

          {/* Course list */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #E3EBEA', overflow: 'hidden' }}>
            {canvasCourses.map((c, i) => {
              const checked = selectedIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleCourse(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '13px 16px',
                    borderBottom: i < canvasCourses.length - 1 ? '0.5px solid #E3EBEA' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = Colors.background)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${checked ? Colors.forest : 'rgba(0,0,0,0.2)'}`,
                    background: checked ? Colors.forest : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B8E04A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    {c.course_code && c.course_code !== c.name && (
                      <div style={{ fontSize: 11, color: Colors.textHint, marginTop: 1 }}>{c.course_code}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Credentials section */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Connected to
            </div>
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary }}>{domain}</div>
                <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1 }}>Token saved</div>
              </div>
              <button
                onClick={() => { save(DOMAIN_KEY, ''); save(TOKEN_KEY, ''); setDomain(''); setToken(''); setCanvasCourses([]); setStage('form'); }}
                style={{ background: 'none', border: 'none', fontSize: 12, color: Colors.red, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Sync button */}
          <button
            onClick={sync}
            disabled={selectedIds.length === 0}
            style={{
              width: '100%', marginTop: 20, padding: '15px', borderRadius: 14, border: 'none',
              background: selectedIds.length > 0 ? Colors.forest : Colors.grayLight,
              color: selectedIds.length > 0 ? '#fff' : Colors.textHint,
              fontSize: 15, fontWeight: 800, cursor: selectedIds.length > 0 ? 'pointer' : 'default',
              fontFamily: 'inherit', letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selectedIds.length > 0 ? '#B8E04A' : Colors.textHint} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Sync {selectedIds.length > 0 ? `${selectedIds.length} course${selectedIds.length !== 1 ? 's' : ''}` : ''}
          </button>
        </div>
      </ScrollBody>
    </Screen>
  );

  // ── Form (enter credentials) ──────────────────────────────────────────────────
  return (
    <Screen>
      <div style={{ background: Colors.forest, padding: '18px 20px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('classes')} aria-label="Go back" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Connect Canvas</div>
        </div>
      </div>

      <ScrollBody>
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* How-to */}
          <div style={{ background: '#fff', border: '1.5px solid #E3EBEA', borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: Colors.textPrimary, marginBottom: 14, letterSpacing: '-0.01em' }}>
              How to get your Canvas token
            </div>
            {['Open Canvas → Account → Settings', 'Scroll to "Approved Integrations" → "+ New Access Token"', 'Name it "TrackIt" and copy the token'].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 12 : 0, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: Colors.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.5, flex: 1, paddingTop: 2 }}>{step}</div>
              </div>
            ))}
          </div>

          {/* Inputs */}
          {[
            { label: 'Canvas URL', value: domain, set: setDomain, placeholder: 'university.instructure.com', type: 'text' },
            { label: 'Access token', value: token, set: setToken, placeholder: 'Paste your token here', type: 'password' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>{f.label}</label>
              <input
                type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', fontSize: 15, padding: '13px 14px', borderRadius: 12, border: '1.5px solid #E3EBEA', outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          {(stage === 'error') && message && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: Colors.redLight, border: `1px solid ${Colors.red}30`, fontSize: 13, color: Colors.red, lineHeight: 1.5 }}>
              {message}
            </div>
          )}

          <button
            onClick={() => loadCourses()}
            disabled={loadingCourses || !domain.trim() || !token.trim()}
            style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: domain.trim() && token.trim() ? Colors.forest : Colors.grayLight, color: domain.trim() && token.trim() ? '#fff' : Colors.textHint, fontSize: 15, fontWeight: 700, cursor: domain.trim() && token.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}
          >
            {loadingCourses ? 'Connecting…' : 'Connect & choose courses'}
          </button>

          <p style={{ fontSize: 12, color: Colors.textHint, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            Your token is saved locally and never sent to our servers.
          </p>
        </div>
      </ScrollBody>
    </Screen>
  );
}
