import { useState, useRef } from 'react';
import { useApp } from '../hooks/useApp';
import { uid } from '../data/store';
import { Colors, CLASS_COLORS } from '../theme';
import type { Course } from '../types';
import { IconChevronRight, IconCheck, IconX } from '../components/Icons';
import { setScheduleType, setBlockAnchor, getBlockAnchor, setSchedule, setAdjustedDays } from '../data/scheduleStorage';

type Step =
  | 'features'
  | 'school_hours'
  | 'schedule_type'
  | 'adjusted_days'
  | 'grade'
  | 'classes'
  | 'class_times'
  | 'first_assignment';

// ── Feature cards ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    bg: '#EAE5FB', accent: '#7B6DD0',
    title: 'Big assignments, broken down',
    body: 'AI splits any homework, test, or project into small specific steps — so you always know exactly what to do next.',
    preview: (
      <div style={{ background: '#F5F7F6', borderRadius: 14, padding: '14px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#4A3FA0', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AP Bio Essay · 3 days</div>
        {[['Re-read chapter 7 notes', true], ['Write thesis statement', false], ['Draft body paragraphs', false], ['Edit and proofread', false]].map(([s, done], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${done ? '#B8E04A' : '#D0D8D7'}`, background: done ? '#B8E04A' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1c4a4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: done ? '#9CA8A7' : Colors.textPrimary, textDecoration: done ? 'line-through' : 'none' }}>{s as string}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    bg: '#E0EEFB', accent: '#2764A8',
    title: 'Syncs directly with Canvas',
    body: 'Connect once and your classes and assignments import automatically. No re-entering due dates from the portal.',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[['AP Biology', '#1E8A55'], ['US History', '#CC3F3A'], ['Geometry', '#7B6DD0'], ['English Lit', '#B86B12']].map(([name, color], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 12, padding: '10px 14px', border: '1.5px solid #E3EBEA' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color as string, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, flex: 1 }}>{name as string}</span>
            <span style={{ fontSize: 11, color: '#1E8A55', fontWeight: 700 }}>synced</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    bg: '#D9F5E5', accent: '#1E8A55',
    title: 'Built for how your brain works',
    body: 'Designed for students with ADHD, dyslexia, and other learning differences — not retrofitted. Every feature is built around time blindness, task initiation, and overwhelm.',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['Time blindness — see exactly how long tasks take', 'Task initiation — always know the single next step', 'Overwhelm — only see what matters right now'].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', borderRadius: 12, padding: '11px 14px', border: '1.5px solid #E3EBEA' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#D9F5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1E8A55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.5 }}>{t}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    bg: '#E8F4F5', accent: '#1c4a4f',
    title: 'See your real day',
    body: 'A time-axis view shows class blocks, free windows, and where assignments fit — so you can see exactly when to work on what.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '12px 14px' }}>
        {[{ t: '9:00', label: 'Geometry', color: '#7B6DD0', free: false }, { t: '9:55', label: '65 min free', color: '#1c4a4f', free: true }, { t: '11:00', label: 'AP History', color: '#CC3F3A', free: false }, { t: '12:00', label: 'Lunch', color: '#B86B12', free: true }].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
            <span style={{ fontSize: 10, color: Colors.textHint, width: 36, flexShrink: 0 }}>{r.t}</span>
            <div style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: r.free ? '#E8F4F5' : `${r.color}18`, border: r.free ? '1px dashed #1c4a4f' : 'none', borderLeft: r.free ? undefined : `3px solid ${r.color}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: r.color }}>{r.label}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    bg: '#FEE8E7', accent: '#CC3F3A',
    title: 'Scripts to talk to your teacher',
    body: 'Missed a deadline? Need an extension? TrackIt writes a ready-to-send email for you — no figuring out the words yourself.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Subject</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary, marginBottom: 10 }}>Missing Assignment — AP Bio Essay</div>
        <div style={{ fontSize: 12, color: Colors.textSecondary, lineHeight: 1.7, borderTop: '0.5px solid #E3EBEA', paddingTop: 10 }}>
          Hi [Teacher Name],<br/>I'm reaching out because I missed the deadline for my AP Bio Essay. I want to complete this — is there any way I can still submit it?<br/><span style={{ color: Colors.forest, fontWeight: 600 }}>Thank you, [Your name]</span>
        </div>
      </div>
    ),
  },
  {
    bg: '#FEF0DC', accent: '#B86B12',
    title: 'Focus timer built in',
    body: 'Start a focus session on any assignment. The timer keeps you in the zone — no app switching needed.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '20px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, fontWeight: 800, color: Colors.forest, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' as any }}>24:07</div>
        <div style={{ fontSize: 13, color: Colors.textHint, marginTop: 4, marginBottom: 18 }}>Working on: AP Bio Essay</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#F5F7F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={Colors.textHint} strokeWidth="2.5" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#B8E04A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
      </div>
    ),
  },
];

const ICON_PATHS = [
  <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
];

const GRADE_OPTIONS = [
  { value: 'hs_9',  label: '9th Grade',       sub: 'High School Freshman'  },
  { value: 'hs_10', label: '10th Grade',       sub: 'High School Sophomore' },
  { value: 'hs_11', label: '11th Grade',       sub: 'High School Junior'    },
  { value: 'hs_12', label: '12th Grade',       sub: 'High School Senior'    },
  { value: 'col_1', label: 'College Year 1',   sub: 'Freshman'              },
  { value: 'col_2', label: 'College Year 2',   sub: 'Sophomore'             },
  { value: 'col_3', label: 'College Year 3',   sub: 'Junior'                },
  { value: 'col_4', label: 'College Year 4',   sub: 'Senior'                },
  { value: 'grad',  label: 'Graduate Student', sub: 'Masters or PhD'        },
  { value: 'other', label: 'Other',            sub: 'Something else'        },
];

const HOURS_LIST = Array.from({ length: 16 }, (_, i) => i + 6);
const MINS_LIST  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const selStyle: React.CSSProperties = {
  fontSize: 26, fontWeight: 800, color: Colors.forest, background: 'transparent',
  border: 'none', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
  padding: '4px 2px', WebkitAppearance: 'none', appearance: 'none', textAlign: 'center',
};
function fmtTime(h: number, m: number) {
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(m).padStart(2,'0')} ${ap}`;
}
function TimeWheel({ h, m, onChange }: { h: number; m: number; onChange: (h: number, m: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F5F7F6', borderRadius: 14, padding: '10px 16px', width: 'fit-content' }}>
      <select value={h} onChange={e => onChange(Number(e.target.value), m)} style={selStyle}>
        {HOURS_LIST.map(v => <option key={v} value={v}>{v > 12 ? v - 12 : v === 0 ? 12 : v}</option>)}
      </select>
      <span style={{ fontSize: 26, fontWeight: 800, color: Colors.forest }}>:</span>
      <select value={m} onChange={e => onChange(h, Number(e.target.value))} style={selStyle}>
        {MINS_LIST.map(v => <option key={v} value={v}>{String(v).padStart(2,'0')}</option>)}
      </select>
      <select value={h >= 12 ? 'pm' : 'am'} onChange={e => { const pm = e.target.value === 'pm'; onChange(pm && h < 12 ? h + 12 : !pm && h >= 12 ? h - 12 : h, m); }} style={{ ...selStyle, fontSize: 16, color: Colors.textSecondary }}>
        <option value="am">am</option><option value="pm">pm</option>
      </select>
    </div>
  );
}

interface AdjustedDay { label: string; startH: number; startM: number; endH: number; endM: number; }

interface Props {
  isNewSemester?: boolean;
  onComplete: () => void;
}

export default function OnboardingScreen({ isNewSemester = false, onComplete }: Props) {
  const { updateSettings, settings, updateCourses, courses: existingCourses, navigate } = useApp();

  const [step,          setStep]          = useState<Step>(isNewSemester ? 'grade' : 'features');
  const [featureIdx,    setFeatureIdx]    = useState(0);

  // School hours
  const [schoolStartH,  setSchoolStartH]  = useState(7);
  const [schoolStartM,  setSchoolStartM]  = useState(45);
  const [schoolEndH,    setSchoolEndH]    = useState(14);
  const [schoolEndM,    setSchoolEndM]    = useState(30);

  // Schedule type
  const [schedType,     setSchedType]     = useState<'standard' | 'block' | ''>('');

  // Adjusted days (late start / early release / PLC)
  const [hasAdjusted,   setHasAdjusted]   = useState<boolean | null>(null);
  const [adjDays,       setAdjDays]       = useState<AdjustedDay[]>([]);
  const [addingAdj,     setAddingAdj]     = useState(false);
  const [adjLabel,      setAdjLabel]      = useState('');
  const [adjStartH,     setAdjStartH]     = useState(8);
  const [adjStartM,     setAdjStartM]     = useState(30);
  const [adjEndH,       setAdjEndH]       = useState(14);
  const [adjEndM,       setAdjEndM]       = useState(0);

  // Grade / semester
  const [gradeLevel,    setGradeLevel]    = useState(settings.gradeLevel ?? '');
  const [semester,      setSemester]      = useState(settings.currentSemester ?? 'fall');

  // Classes
  const [newCourses,    setNewCourses]    = useState<Course[]>([]);
  const [addingClass,   setAddingClass]   = useState(false);
  const [className,     setClassName]     = useState('');
  const [teacherName,   setTeacherName]   = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(CLASS_COLORS[0]);

  // Class times
  const [classTimes,    setClassTimes]    = useState<Record<string, { startH: number; startM: number; endH: number; endM: number }>>({});

  // Swipe for features
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -40 && featureIdx < FEATURES.length - 1) setFeatureIdx(i => i + 1);
    if (dx > 40 && featureIdx > 0) setFeatureIdx(i => i - 1);
    touchX.current = null;
  }

  function addAdjDay() {
    if (!adjLabel.trim()) return;
    setAdjDays(p => [...p, { label: adjLabel.trim(), startH: adjStartH, startM: adjStartM, endH: adjEndH, endM: adjEndM }]);
    setAdjLabel(''); setAddingAdj(false);
  }

  function addCourse() {
    if (!className.trim()) return;
    const c: Course = { id: uid(), name: className.trim(), color: selectedColor, teacherName: teacherName.trim() };
    setNewCourses(p => [...p, c]);
    setClassName(''); setTeacherName('');
    setSelectedColor(CLASS_COLORS[newCourses.length % CLASS_COLORS.length]);
    setAddingClass(false);
  }

  function saveScheduleToStorage() {
    setScheduleType(schedType || 'standard');
    if (schedType === 'block' && !getBlockAnchor()) {
      const now = new Date();
      const dow = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      const key = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
      setBlockAnchor(key);
    }
    const periods = newCourses
      .filter(c => classTimes[c.id])
      .map(c => {
        const t = classTimes[c.id];
        return { name: c.name, color: c.color, days: [1,2,3,4,5], startHour: t.startH, startMin: t.startM, endHour: t.endH, endMin: t.endM, blockDay: null };
      });
    if (periods.length > 0) setSchedule(periods as any);
    if (adjDays.length > 0) setAdjustedDays(adjDays);
  }

  async function finish(goTo?: 'add' | 'canvas') {
    saveScheduleToStorage();
    await updateSettings({ ...settings, gradeLevel, currentSemester: semester, onboardingComplete: true });
    if (isNewSemester) await updateCourses([...existingCourses, ...newCourses]);
    else await updateCourses(newCourses);
    if (goTo === 'canvas') navigate('canvas');
    else if (goTo === 'add') navigate('add');
    else onComplete();
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const btnPrimary: React.CSSProperties = { width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const btnGhost:   React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 14, border: '1.5px solid #E3EBEA', background: '#fff', color: Colors.textSecondary, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' };
  const inputStyle: React.CSSProperties = { width: '100%', fontSize: 15, padding: '13px 14px', borderRadius: 12, border: '1.5px solid #E3EBEA', outline: 'none', fontFamily: 'inherit', color: Colors.textPrimary, background: '#fff', boxSizing: 'border-box' };
  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 };

  function Shell({ stepLabel, children }: { stepLabel: string; children: React.ReactNode }) {
    return (
      <div style={{ minHeight: '100vh', background: Colors.background, display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
        <div style={{ background: Colors.forest, padding: '52px 24px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{stepLabel}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 48px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {children}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: Features
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'features') {
    const f = FEATURES[featureIdx];
    const isLast = featureIdx === FEATURES.length - 1;
    return (
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: Colors.forest, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', overflow: 'hidden' }}>
        <style>{`@keyframes card-in { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, padding: '56px 24px 0' }}>
          {FEATURES.map((_, i) => (
            <div key={i} onClick={() => setFeatureIdx(i)} style={{ width: i === featureIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === featureIdx ? '#B8E04A' : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.25s' }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: '20px 18px 0', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div key={featureIdx} style={{ flex: 1, background: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'card-in 0.3s cubic-bezier(0.22,1,0.36,1) both' }}>
            <div style={{ background: f.bg, padding: '28px 24px 22px', flexShrink: 0 }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, background: `${f.accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={f.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_PATHS[featureIdx]}</svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 10px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>{f.title}</h1>
              <p style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 1.65, margin: 0 }}>{f.body}</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>{f.preview}</div>
          </div>
        </div>
        <div style={{ padding: '16px 18px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          {isLast ? (
            <button onClick={() => setStep('school_hours')} style={{ ...btnPrimary, background: '#B8E04A', color: Colors.forest, fontSize: 16, fontWeight: 800 }}>
              Get started <IconChevronRight size={18} color={Colors.forest} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('school_hours')} style={{ flex: 1, padding: '15px', borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
              <button onClick={() => setFeatureIdx(i => i + 1)} style={{ flex: 2, ...btnPrimary, background: '#B8E04A', color: Colors.forest }}>
                Next <IconChevronRight size={16} color={Colors.forest} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: School hours
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'school_hours') return (
    <Shell stepLabel="School setup  1 of 3">
      <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>When does your school day run?</h2>
      <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 28px', lineHeight: 1.5 }}>This helps build your visual schedule and find free study windows.</p>

      <label style={sectionLabel}>School day starts</label>
      <div style={{ marginBottom: 24 }}>
        <TimeWheel h={schoolStartH} m={schoolStartM} onChange={(h,m) => { setSchoolStartH(h); setSchoolStartM(m); }} />
      </div>

      <label style={sectionLabel}>School day ends</label>
      <div style={{ marginBottom: 32 }}>
        <TimeWheel h={schoolEndH} m={schoolEndM} onChange={(h,m) => { setSchoolEndH(h); setSchoolEndM(m); }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => setStep('schedule_type')} style={btnPrimary}>Continue <IconChevronRight size={16} color="#fff" /></button>
        <button onClick={() => setStep('schedule_type')} style={btnGhost}>Skip for now</button>
      </div>
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: Schedule type
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'schedule_type') return (
    <Shell stepLabel="School setup  2 of 3">
      <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>What kind of schedule does your school use?</h2>
      <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 24px', lineHeight: 1.5 }}>This affects how your calendar shows class times.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {[
          { val: 'standard', label: 'Standard schedule', sub: 'Same classes every day (Mon–Fri)' },
          { val: 'block',    label: 'Block schedule',    sub: 'Classes alternate on A and B days' },
        ].map(opt => (
          <button key={opt.val} onClick={() => setSchedType(opt.val as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 16, cursor: 'pointer', border: `1.5px solid ${schedType === opt.val ? Colors.forest : '#E3EBEA'}`, background: schedType === opt.val ? '#E8F4F5' : '#fff', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${schedType === opt.val ? Colors.forest : '#D0D8D7'}`, background: schedType === opt.val ? Colors.forest : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {schedType === opt.val && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: schedType === opt.val ? Colors.forest : Colors.textPrimary }}>{opt.label}</div>
              <div style={{ fontSize: 13, color: Colors.textHint, marginTop: 2 }}>{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => schedType && setStep('adjusted_days')} disabled={!schedType}
          style={{ ...btnPrimary, background: schedType ? Colors.forest : '#E3EBEA', color: schedType ? '#fff' : Colors.textHint, cursor: schedType ? 'pointer' : 'default' }}>
          Continue <IconChevronRight size={16} color={schedType ? '#fff' : Colors.textHint} />
        </button>
        <button onClick={() => setStep('adjusted_days')} style={btnGhost}>Skip for now</button>
      </div>
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: Adjusted days (late start / early release / PLC)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'adjusted_days') return (
    <Shell stepLabel="School setup  3 of 3">
      <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Any adjusted schedule days?</h2>
      <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 24px', lineHeight: 1.5 }}>
        Late starts, early releases, PLC days, or any day with a different schedule than normal.
      </p>

      {hasAdjusted === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {[{ v: true, label: 'Yes, we have adjusted days' }, { v: false, label: 'No, every day is the same' }].map(opt => (
            <button key={String(opt.v)} onClick={() => setHasAdjusted(opt.v)}
              style={{ padding: '16px 18px', borderRadius: 16, cursor: 'pointer', border: `1.5px solid ${hasAdjusted === opt.v ? Colors.forest : '#E3EBEA'}`, background: hasAdjusted === opt.v ? '#E8F4F5' : '#fff', fontFamily: 'inherit', textAlign: 'left', fontSize: 15, fontWeight: 600, color: Colors.textPrimary, transition: 'all 0.15s' }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {hasAdjusted === false && (
        <div style={{ background: '#D9F5E5', borderRadius: 14, padding: '14px 16px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E8A55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#145C38' }}>Got it — standard schedule all week</span>
        </div>
      )}

      {hasAdjusted === true && (
        <div style={{ marginBottom: 24 }}>
          {adjDays.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>{d.label}</div>
                <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 2 }}>{fmtTime(d.startH, d.startM)} – {fmtTime(d.endH, d.endM)}</div>
              </div>
              <button onClick={() => setAdjDays(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <IconX size={16} color={Colors.textHint} />
              </button>
            </div>
          ))}

          {addingAdj ? (
            <div style={{ background: '#fff', borderRadius: 18, border: `1.5px solid ${Colors.forest}`, padding: 18, marginBottom: 14 }}>
              <label style={sectionLabel}>Day name</label>
              <input autoFocus value={adjLabel} onChange={e => setAdjLabel(e.target.value)} placeholder="e.g. Late Start Wednesday, PLC Friday"
                style={{ ...inputStyle, marginBottom: 16 }} />
              <label style={sectionLabel}>Start time</label>
              <div style={{ marginBottom: 16 }}><TimeWheel h={adjStartH} m={adjStartM} onChange={(h,m) => { setAdjStartH(h); setAdjStartM(m); }} /></div>
              <label style={sectionLabel}>End time</label>
              <div style={{ marginBottom: 18 }}><TimeWheel h={adjEndH} m={adjEndM} onChange={(h,m) => { setAdjEndH(h); setAdjEndM(m); }} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAddingAdj(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #E3EBEA', background: '#fff', fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={addAdjDay} disabled={!adjLabel.trim()} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: adjLabel.trim() ? Colors.forest : '#E3EBEA', color: adjLabel.trim() ? '#fff' : Colors.textHint, fontSize: 14, fontWeight: 700, cursor: adjLabel.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>Add</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingAdj(true)} style={{ width: '100%', padding: 14, borderRadius: 14, border: `1.5px dashed ${Colors.forest}`, background: 'transparent', color: Colors.forest, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
              + Add adjusted day
            </button>
          )}
        </div>
      )}

      {hasAdjusted !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setStep('grade')} style={btnPrimary}>Continue <IconChevronRight size={16} color="#fff" /></button>
        </div>
      )}

      {hasAdjusted === null && (
        <button onClick={() => setStep('grade')} style={btnGhost}>Skip for now</button>
      )}
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: Grade level
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'grade') return (
    <Shell stepLabel={isNewSemester ? 'New semester' : 'Step 1 of 3'}>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>What grade are you in?</h2>
      <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 22px', lineHeight: 1.5 }}>Helps tailor your assignment steps to the right level.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {GRADE_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setGradeLevel(opt.value)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 14, cursor: 'pointer', border: `1.5px solid ${gradeLevel === opt.value ? Colors.forest : '#E3EBEA'}`, background: gradeLevel === opt.value ? '#E8F4F5' : '#fff', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: gradeLevel === opt.value ? Colors.forest : Colors.textPrimary }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: gradeLevel === opt.value ? Colors.forest : Colors.textHint, marginTop: 1, opacity: 0.8 }}>{opt.sub}</div>
            </div>
            {gradeLevel === opt.value && <div style={{ width: 22, height: 22, borderRadius: '50%', background: Colors.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconCheck size={12} color="#fff" /></div>}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={sectionLabel}>Which semester?</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{v:'fall',l:'Fall'},{v:'spring',l:'Spring'},{v:'summer',l:'Summer'}].map(opt => (
            <button key={opt.v} onClick={() => setSemester(opt.v)}
              style={{ flex: 1, padding: '11px 8px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${semester === opt.v ? Colors.forest : '#E3EBEA'}`, background: semester === opt.v ? '#E8F4F5' : '#fff', color: semester === opt.v ? Colors.forest : Colors.textSecondary, fontSize: 13, fontWeight: semester === opt.v ? 700 : 400, fontFamily: 'inherit' }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => gradeLevel && setStep('classes')} disabled={!gradeLevel}
        style={{ ...btnPrimary, background: gradeLevel ? Colors.forest : '#E3EBEA', color: gradeLevel ? '#fff' : Colors.textHint, cursor: gradeLevel ? 'pointer' : 'default' }}>
        Continue <IconChevronRight size={16} color={gradeLevel ? '#fff' : Colors.textHint} />
      </button>
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: Classes
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'classes') return (
    <Shell stepLabel={isNewSemester ? 'New semester' : 'Step 2 of 3'}>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Add your classes</h2>
      <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 20px', lineHeight: 1.5 }}>Add manually or connect Canvas to import everything at once.</p>

      {/* Canvas option */}
      <div onClick={() => { updateSettings({ ...settings, onboardingComplete: true }); navigate('canvas'); }}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: '#E0EEFB', border: '1.5px solid #2764A818', cursor: 'pointer', marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#2764A8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A4880' }}>Sync with Canvas</div>
          <div style={{ fontSize: 12, color: '#2764A8', marginTop: 1 }}>Import all courses and assignments automatically</div>
        </div>
        <IconChevronRight size={16} color="#2764A8" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: '0.5px', background: '#E3EBEA' }} />
        <span style={{ fontSize: 12, color: Colors.textHint, fontWeight: 600 }}>or add manually</span>
        <div style={{ flex: 1, height: '0.5px', background: '#E3EBEA' }} />
      </div>

      {newCourses.map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', marginBottom: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>{c.name}</div>
            {c.teacherName && <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1 }}>{c.teacherName}</div>}
          </div>
          <button onClick={() => setNewCourses(p => p.filter(x => x.id !== c.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <IconX size={16} color={Colors.textHint} />
          </button>
        </div>
      ))}

      {addingClass ? (
        <div style={{ background: '#fff', borderRadius: 18, border: `1.5px solid ${Colors.forest}`, padding: 18, marginBottom: 14 }}>
          <label style={sectionLabel}>Class name *</label>
          <input autoFocus value={className} onChange={e => setClassName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && className.trim()) addCourse(); if (e.key === 'Escape') setAddingClass(false); }}
            placeholder="e.g. AP Biology, English 101" style={{ ...inputStyle, marginBottom: 12 }} />
          <label style={sectionLabel}>Teacher name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, opacity: 0.7 }}>(optional)</span></label>
          <input value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="e.g. Ms. Johnson"
            style={{ ...inputStyle, marginBottom: 14 }} />
          <label style={sectionLabel}>Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {CLASS_COLORS.map(c => (
              <button key={c} onClick={() => setSelectedColor(c)} style={{ width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${selectedColor === c ? '#fff' : 'transparent'}`, boxShadow: selectedColor === c ? `0 0 0 2px ${Colors.forest}` : 'none', transition: 'box-shadow 0.15s' }}>
                {selectedColor === c && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAddingClass(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #E3EBEA', background: '#fff', fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={addCourse} disabled={!className.trim()} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: className.trim() ? Colors.forest : '#E3EBEA', color: className.trim() ? '#fff' : Colors.textHint, fontSize: 14, fontWeight: 700, cursor: className.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>Add class</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingClass(true)} style={{ width: '100%', padding: 14, borderRadius: 14, border: `1.5px dashed ${Colors.forest}`, background: 'transparent', color: Colors.forest, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
          + Add a class
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <button onClick={() => newCourses.length > 0 ? setStep('class_times') : undefined} disabled={newCourses.length === 0}
          style={{ ...btnPrimary, background: newCourses.length > 0 ? Colors.forest : '#E3EBEA', color: newCourses.length > 0 ? '#fff' : Colors.textHint, cursor: newCourses.length > 0 ? 'pointer' : 'default' }}>
          Continue <IconChevronRight size={16} color={newCourses.length > 0 ? '#fff' : Colors.textHint} />
        </button>
        <button onClick={() => setStep('first_assignment')} style={btnGhost}>Skip for now</button>
      </div>
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: Class times
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'class_times') return (
    <Shell stepLabel={isNewSemester ? 'New semester' : 'Step 3 of 3'}>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>When do your classes meet?</h2>
      <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 24px', lineHeight: 1.5 }}>Sets up your visual day schedule. You can always adjust in Settings later.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {newCourses.map(c => {
          const t = classTimes[c.id] ?? { startH: 8, startM: 0, endH: 8, endM: 50 };
          const isSet = !!classTimes[c.id];
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 18, border: `1.5px solid ${isSet ? Colors.forest + '55' : '#E3EBEA'}`, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary }}>{c.name}</span>
                {isSet && <span style={{ marginLeft: 'auto', fontSize: 12, color: Colors.forest, fontWeight: 600 }}>{fmtTime(t.startH, t.startM)} – {fmtTime(t.endH, t.endM)}</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ ...sectionLabel, marginBottom: 6 }}>Start</label>
                  <TimeWheel h={t.startH} m={t.startM} onChange={(h,m) => {
                    const end = h * 60 + m + 50;
                    setClassTimes(p => ({ ...p, [c.id]: { startH: h, startM: m, endH: Math.min(21, Math.floor(end/60)), endM: end%60 > 55 ? 55 : Math.round(end%60/5)*5 } }));
                  }} />
                </div>
                <div>
                  <label style={{ ...sectionLabel, marginBottom: 6 }}>End</label>
                  <TimeWheel h={t.endH} m={t.endM} onChange={(h,m) => setClassTimes(p => ({ ...p, [c.id]: { ...t, endH: h, endM: m } }))} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => setStep('first_assignment')} style={btnPrimary}>Continue <IconChevronRight size={16} color="#fff" /></button>
        <button onClick={() => setStep('first_assignment')} style={btnGhost}>Skip for now</button>
      </div>
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: First assignment
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'first_assignment') return (
    <Shell stepLabel="Almost done">
      <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Add your first assignments</h2>
      <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 24px', lineHeight: 1.5 }}>Upload a syllabus or connect Canvas to import everything at once.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Upload a syllabus', sub: 'AI reads your PDF and extracts all assignments', bg: '#D9F5E5', color: '#1E8A55', dark: '#145C38', goTo: 'add' as const },
          { label: 'Connect Canvas',    sub: 'Auto-import all courses and upcoming assignments', bg: '#E0EEFB', color: '#2764A8', dark: '#1A4880', goTo: 'canvas' as const },
        ].map(opt => (
          <div key={opt.label} onClick={() => finish(opt.goTo)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: opt.bg, border: `1.5px solid ${opt.color}18`, cursor: 'pointer' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: opt.dark }}>{opt.label}</div>
              <div style={{ fontSize: 13, color: opt.color, marginTop: 2 }}>{opt.sub}</div>
            </div>
            <IconChevronRight size={18} color={opt.color} />
          </div>
        ))}
        <div onClick={() => finish('add')}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1.5px solid #E3EBEA', cursor: 'pointer' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary }}>Add manually</div>
            <div style={{ fontSize: 13, color: Colors.textHint, marginTop: 2 }}>Type in assignment name, class, and due date</div>
          </div>
          <IconChevronRight size={18} color={Colors.textHint} />
        </div>
      </div>
      <button onClick={() => finish()} style={btnGhost}>I'll add assignments later</button>
    </Shell>
  );

  return null;
}
