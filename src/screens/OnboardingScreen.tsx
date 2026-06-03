import { useState, useRef } from 'react';
import { useApp } from '../hooks/useApp';
import { uid } from '../data/store';
import { Colors, CLASS_COLORS } from '../theme';
import type { Course } from '../types';
import { IconChevronRight, IconCheck, IconX } from '../components/Icons';

type Step = 'features' | 'grade' | 'classes' | 'first_assignment';

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

const SEMESTER_OPTIONS = [
  { value: 'fall',   label: 'Fall'   },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
];

const FEATURES = [
  {
    bg: '#EAE5FB',
    accent: '#7B6DD0',
    title: 'Big assignments, broken down',
    body: 'TrackIt uses AI to split any homework, test, or project into small, specific steps — so you always know exactly what to do next, not just "study for bio test."',
    preview: (
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '12px 14px', marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4A3FA0', marginBottom: 10 }}>AP Bio Essay · due in 3 days</div>
        {['Re-read chapter 7 notes', 'Write thesis statement', 'Draft body paragraphs', 'Edit and proofread'].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${i === 0 ? '#B8E04A' : '#E3EBEA'}`, background: i === 0 ? '#B8E04A' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i === 0 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1c4a4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: i === 0 ? '#9CA8A7' : '#2D3F3E', textDecoration: i === 0 ? 'line-through' : 'none' }}>{s}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    bg: '#E0EEFB',
    accent: '#2764A8',
    title: 'Syncs with Canvas',
    body: 'Connect once with your Canvas token and your classes and assignments import automatically. No re-entering due dates from the portal.',
    preview: (
      <div style={{ marginTop: 14 }}>
        {['AP Biology', 'US History', 'Geometry', 'English Lit'].map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 12, border: '1.5px solid #E3EBEA', padding: '10px 14px', marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: ['#7B6DD0','#CC3F3A','#B86B12','#1E8A55'][i], flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, flex: 1 }}>{c}</span>
            <span style={{ fontSize: 11, color: '#1E8A55', fontWeight: 700 }}>✓ synced</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    bg: '#D9F5E5',
    accent: '#1E8A55',
    title: 'Built for how your brain works',
    body: 'TrackIt is designed specifically for students with ADHD, dyslexia, and other learning differences — not retrofitted for them. Time blindness, task initiation, overwhelm — we built around these, not despite them.',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {['Time blindness → see exactly how long tasks take', 'Task initiation → always know the single next step', 'Overwhelm → only see what matters right now'].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff', borderRadius: 12, padding: '10px 14px', border: '1.5px solid #E3EBEA' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{'✓'}</span>
            <span style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.5 }}>{t}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    bg: '#E8F4F5',
    accent: '#1c4a4f',
    title: 'See your real day',
    body: 'A time-axis view shows your class blocks, free windows, and where assignments fall — so you can see exactly when to work on what.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '12px 14px', marginTop: 14 }}>
        {[
          { label: '9:00am', text: 'Geometry', color: '#7B6DD0', type: 'class' },
          { label: '10:00am', text: '1hr free — good time to work', color: '#1c4a4f', type: 'free' },
          { label: '11:00am', text: 'AP History', color: '#CC3F3A', type: 'class' },
          { label: '12:00pm', text: 'Lunch', color: '#E3EBEA', type: 'free' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
            <span style={{ fontSize: 10, color: Colors.textHint, width: 44, flexShrink: 0 }}>{r.label}</span>
            <div style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: r.type === 'class' ? `${r.color}22` : '#E8F4F5', borderLeft: `3px solid ${r.color}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: r.color }}>{r.text}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    bg: '#FEE8E7',
    accent: '#CC3F3A',
    title: 'Scripts to talk to your teacher',
    body: 'Missed a deadline? Need an extension? Don\'t know how to start that conversation? TrackIt writes a ready-to-send email for you.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '14px', marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Subject</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary, marginBottom: 10 }}>Missing Assignment — AP Bio Essay</div>
        <div style={{ fontSize: 12, color: Colors.textSecondary, lineHeight: 1.7, borderTop: '0.5px solid #E3EBEA', paddingTop: 10 }}>
          Hi [Teacher Name],<br/>
          I'm reaching out because I missed the deadline for my AP Bio Essay. I want to complete this work — is there any way I can still submit it?<br/>
          <span style={{ color: Colors.forest, fontWeight: 600 }}>Thank you,<br/>[Your name]</span>
        </div>
      </div>
    ),
  },
  {
    bg: '#FEF0DC',
    accent: '#B86B12',
    title: 'Focus timer built in',
    body: 'Start a focus session on any assignment. A timer tracks your work time and keeps you in the zone — no app switching needed.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', padding: '20px 14px', marginTop: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: Colors.forest, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>24:07</div>
        <div style={{ fontSize: 13, color: Colors.textHint, marginTop: 4, marginBottom: 16 }}>Working on: AP Bio Essay</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E3EBEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={Colors.textHint} strokeWidth="2.5" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#B8E04A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
      </div>
    ),
  },
];

function OnboardingShell({ step, children }: { step?: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: Colors.background, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: Colors.forest, padding: '52px 24px 24px' }}>
        {step && <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{step}</div>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 40px' }}>{children}</div>
    </div>
  );
}

interface Props {
  isNewSemester?: boolean;
  onComplete: () => void;
}

export default function OnboardingScreen({ isNewSemester = false, onComplete }: Props) {
  const { updateSettings, settings, updateCourses, courses: existingCourses, navigate } = useApp();

  const [step,          setStep]          = useState<Step>(isNewSemester ? 'grade' : 'features');
  const [featureIdx,    setFeatureIdx]    = useState(0);
  const [gradeLevel,    setGradeLevel]    = useState(settings.gradeLevel ?? '');
  const [semester,      setSemester]      = useState(settings.currentSemester ?? 'fall');
  const [newCourses,    setNewCourses]    = useState<Course[]>([]);
  const [addingClass,   setAddingClass]   = useState(false);
  const [className,     setClassName]     = useState('');
  const [classDesc,     setClassDesc]     = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(CLASS_COLORS[0]);

  // Swipe handling for feature cards
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -40 && featureIdx < FEATURES.length - 1) setFeatureIdx(i => i + 1);
    if (dx > 40 && featureIdx > 0) setFeatureIdx(i => i - 1);
    touchX.current = null;
  }

  function addCourse() {
    if (!className.trim()) return;
    const c: Course = { id: uid(), name: className.trim(), color: selectedColor, description: classDesc.trim() };
    setNewCourses(prev => [...prev, c]);
    setClassName(''); setClassDesc('');
    setSelectedColor(CLASS_COLORS[newCourses.length % CLASS_COLORS.length]);
    setAddingClass(false);
  }
  function removeCourse(id: string) { setNewCourses(prev => prev.filter(c => c.id !== id)); }

  async function finishSetup(goTo?: 'add' | 'canvas') {
    await updateSettings({ ...settings, gradeLevel, currentSemester: semester, onboardingComplete: true });
    if (isNewSemester) await updateCourses([...existingCourses, ...newCourses]);
    else await updateCourses(newCourses);
    if (goTo === 'canvas') navigate('canvas');
    else if (goTo === 'add') navigate('add');
    else onComplete();
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '15px', borderRadius: 14, border: 'none',
    background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
  };
  const btnSecondary: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 14,
    border: '1.5px solid #E3EBEA', background: '#fff',
    color: Colors.textSecondary, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 15, padding: '13px 14px', borderRadius: 12,
    border: '1.5px solid #E3EBEA', outline: 'none', fontFamily: 'inherit',
    color: Colors.textPrimary, background: '#fff', boxSizing: 'border-box',
  };

  // ── Feature showcase ──────────────────────────────────────────────────────
  if (step === 'features') {
    const f = FEATURES[featureIdx];
    const isLast = featureIdx === FEATURES.length - 1;

    // Icon paths per feature
    const icons = [
      // Steps
      <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
      // Canvas sync
      <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
      // Brain / people
      <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
      // Calendar
      <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
      // Message
      <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
      // Timer
      <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    ];

    return (
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: Colors.forest, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', overflow: 'hidden' }}
      >
        <style>{`
          @keyframes card-in  { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
          @keyframes card-out { from { opacity:1; } to { opacity:0; } }
        `}</style>

        {/* Progress dots — top right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, padding: '56px 24px 0' }}>
          {FEATURES.map((_, i) => (
            <div key={i} onClick={() => setFeatureIdx(i)}
              style={{ width: i === featureIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === featureIdx ? '#B8E04A' : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.25s' }} />
          ))}
        </div>

        {/* Main card — white rounded card that fills the middle */}
        <div style={{ flex: 1, padding: '20px 18px 0', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div
            key={featureIdx}
            style={{ flex: 1, background: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'card-in 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            {/* Colored header band */}
            <div style={{ background: f.bg, padding: '28px 24px 24px', flexShrink: 0 }}>
              {/* Icon */}
              <div style={{ width: 52, height: 52, borderRadius: 15, background: `${f.accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={f.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {icons[featureIdx]}
                </svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 10px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                {f.title}
              </h1>
              <p style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 1.65, margin: 0 }}>
                {f.body}
              </p>
            </div>

            {/* Preview area — scrollable if needed */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
              {f.preview}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ padding: '16px 18px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          {isLast ? (
            <button onClick={() => setStep('grade')}
              style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: '#B8E04A', color: Colors.forest, fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Get started <IconChevronRight size={18} color={Colors.forest} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('grade')}
                style={{ flex: 1, padding: '15px', borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Skip
              </button>
              <button onClick={() => setFeatureIdx(i => i + 1)}
                style={{ flex: 2, padding: '15px', borderRadius: 14, border: 'none', background: '#B8E04A', color: Colors.forest, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Next <IconChevronRight size={16} color={Colors.forest} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Grade level ───────────────────────────────────────────────────────────
  if (step === 'grade') {
    return (
      <OnboardingShell step={isNewSemester ? 'New semester' : 'Step 1 of 3'}>
        <div style={{ paddingTop: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>What grade are you in?</h2>
          <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 22px', lineHeight: 1.5 }}>This helps tailor your assignment steps to the right level.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {GRADE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setGradeLevel(opt.value)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 14, cursor: 'pointer', border: `1.5px solid ${gradeLevel === opt.value ? Colors.forest : '#E3EBEA'}`, background: gradeLevel === opt.value ? '#E8F4F5' : '#fff', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: gradeLevel === opt.value ? Colors.forest : Colors.textPrimary }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: gradeLevel === opt.value ? Colors.forest : Colors.textHint, marginTop: 1, opacity: 0.8 }}>{opt.sub}</div>
                </div>
                {gradeLevel === opt.value && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: Colors.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCheck size={12} color="#fff" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>Which semester?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SEMESTER_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSemester(opt.value)}
                  style={{ flex: 1, padding: '11px 8px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${semester === opt.value ? Colors.forest : '#E3EBEA'}`, background: semester === opt.value ? '#E8F4F5' : '#fff', color: semester === opt.value ? Colors.forest : Colors.textSecondary, fontSize: 13, fontWeight: semester === opt.value ? 700 : 400, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => gradeLevel && setStep('classes')} disabled={!gradeLevel}
            style={{ ...btnPrimary, background: gradeLevel ? Colors.forest : Colors.grayLight, color: gradeLevel ? '#fff' : Colors.textHint, cursor: gradeLevel ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Continue <IconChevronRight size={16} color={gradeLevel ? '#fff' : Colors.textHint} />
          </button>
        </div>
      </OnboardingShell>
    );
  }

  // ── Classes ───────────────────────────────────────────────────────────────
  if (step === 'classes') {
    return (
      <OnboardingShell step={isNewSemester ? 'New semester' : 'Step 2 of 3'}>
        <div style={{ paddingTop: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Add your classes</h2>
          <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 20px', lineHeight: 1.5 }}>Add each class you're taking this semester.</p>
          {newCourses.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', borderRadius: 14, border: '1.5px solid #E3EBEA', marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>{c.name}</div>
                {c.description && <div style={{ fontSize: 12, color: Colors.textHint, marginTop: 1 }}>{c.description}</div>}
              </div>
              <button onClick={() => removeCourse(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <IconX size={16} color={Colors.textHint} />
              </button>
            </div>
          ))}
          {addingClass ? (
            <div style={{ background: '#fff', borderRadius: 18, border: `1.5px solid ${Colors.forest}`, padding: 18, marginBottom: 14 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 7 }}>Class name *</label>
                <input autoFocus value={className} onChange={e => setClassName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && className.trim()) addCourse(); if (e.key === 'Escape') setAddingClass(false); }} placeholder="e.g. AP Biology, English 101" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 7 }}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span></label>
                <input value={classDesc} onChange={e => setClassDesc(e.target.value)} placeholder="e.g. Lab-heavy, weekly reports" style={{ ...inputStyle, fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {CLASS_COLORS.map(c => (
                    <button key={c} onClick={() => setSelectedColor(c)} style={{ width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${selectedColor === c ? '#fff' : 'transparent'}`, boxShadow: selectedColor === c ? `0 0 0 2px ${Colors.forest}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 0.15s' }}>
                      {selectedColor === c ? <IconCheck size={12} color="#fff" /> : null}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAddingClass(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #E3EBEA', background: '#fff', fontSize: 14, color: Colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={addCourse} disabled={!className.trim()} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: className.trim() ? Colors.forest : Colors.grayLight, color: className.trim() ? '#fff' : Colors.textHint, fontSize: 14, fontWeight: 700, cursor: className.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>Add class</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingClass(true)} style={{ width: '100%', padding: 14, borderRadius: 14, border: `1.5px dashed ${Colors.forest}`, background: 'transparent', color: Colors.forest, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
              + Add a class
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setStep('first_assignment')} disabled={newCourses.length === 0}
              style={{ ...btnPrimary, background: newCourses.length > 0 ? Colors.forest : Colors.grayLight, color: newCourses.length > 0 ? '#fff' : Colors.textHint, cursor: newCourses.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Continue <IconChevronRight size={16} color={newCourses.length > 0 ? '#fff' : Colors.textHint} />
            </button>
            <button onClick={() => setStep('first_assignment')} style={btnSecondary}>Skip for now</button>
          </div>
        </div>
      </OnboardingShell>
    );
  }

  // ── First assignment ──────────────────────────────────────────────────────
  if (step === 'first_assignment') {
    return (
      <OnboardingShell step={isNewSemester ? 'New semester' : 'Step 3 of 3'}>
        <div style={{ paddingTop: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Add your first assignments</h2>
          <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 24px', lineHeight: 1.5 }}>Upload a syllabus or connect Canvas to import everything at once.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div onClick={() => finishSetup('add')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: '#D9F5E5', border: '1.5px solid #1E8A5518', cursor: 'pointer', transition: 'opacity 0.15s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1E8A55', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#145C38' }}>Upload a syllabus</div>
                <div style={{ fontSize: 13, color: '#1E8A55', marginTop: 2 }}>AI reads your PDF and extracts all assignments</div>
              </div>
              <IconChevronRight size={18} color="#1E8A55" />
            </div>
            <div onClick={() => finishSetup('canvas')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: '#E0EEFB', border: '1.5px solid #2764A818', cursor: 'pointer', transition: 'opacity 0.15s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2764A8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A4880' }}>Connect Canvas</div>
                <div style={{ fontSize: 13, color: '#2764A8', marginTop: 2 }}>Auto-import all courses and upcoming assignments</div>
              </div>
              <IconChevronRight size={18} color="#2764A8" />
            </div>
            <div onClick={() => finishSetup('add')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1.5px solid #E3EBEA', cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#C8D5D3')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#E3EBEA')}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary }}>Add manually</div>
                <div style={{ fontSize: 13, color: Colors.textHint, marginTop: 2 }}>Type in assignment name, class, and due date</div>
              </div>
              <IconChevronRight size={18} color={Colors.textHint} />
            </div>
          </div>
          <button onClick={() => finishSetup()} style={btnSecondary}>I'll add assignments later</button>
        </div>
      </OnboardingShell>
    );
  }

  return null;
}
