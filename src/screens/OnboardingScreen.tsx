import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { uid } from '../data/store';
import { Colors, CLASS_COLORS } from '../theme';
import type { Course } from '../types';
import { IconChevronRight, IconCheck, IconX } from '../components/Icons';

type Step = 'welcome' | 'grade' | 'classes' | 'first_assignment';

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

interface Props {
  isNewSemester?: boolean;
  onComplete: () => void;
}

// Shared layout wrapper for all onboarding steps
function OnboardingShell({ step, total, children }: { step?: string; total?: number; children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: Colors.background,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Forest header strip */}
      <div style={{ background: Colors.forest, padding: '48px 24px 28px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: '#B8E04A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        {step && (
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            {step}
          </div>
        )}
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 40px' }}>
        {children}
      </div>
    </div>
  );
}

export default function OnboardingScreen({ isNewSemester = false, onComplete }: Props) {
  const { updateSettings, settings, updateCourses, courses: existingCourses, navigate } = useApp();

  const [step,          setStep]          = useState<Step>(isNewSemester ? 'grade' : 'welcome');
  const [gradeLevel,    setGradeLevel]    = useState(settings.gradeLevel ?? '');
  const [semester,      setSemester]      = useState(settings.currentSemester ?? 'fall');
  const [newCourses,    setNewCourses]    = useState<Course[]>([]);
  const [addingClass,   setAddingClass]   = useState(false);
  const [className,     setClassName]     = useState('');
  const [classDesc,     setClassDesc]     = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(CLASS_COLORS[0]);

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
    width: '100%', padding: '15px', borderRadius: 14,
    border: 'none', background: Colors.forest, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  };
  const btnSecondary: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 14,
    border: '1.5px solid #E3EBEA', background: '#fff',
    color: Colors.textSecondary, fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 15, padding: '13px 14px',
    borderRadius: 12, border: '1.5px solid #E3EBEA',
    outline: 'none', fontFamily: 'inherit',
    color: Colors.textPrimary, background: '#fff',
    boxSizing: 'border-box',
  };

  // ── Welcome ──
  if (step === 'welcome') {
    return (
      <div style={{ minHeight: '100vh', background: Colors.forest, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: '#B8E04A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 12px', textAlign: 'center', letterSpacing: '-0.04em' }}>
          Welcome to TrackIt
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 40px', maxWidth: 300 }}>
          Your personal assignment tracker, built to help you stay on top of your work — one step at a time.
        </p>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <button
            onClick={() => setStep('grade')}
            style={{ ...btnPrimary, background: '#B8E04A', color: Colors.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            Get started <IconChevronRight size={16} color={Colors.forest} />
          </button>
        </div>
      </div>
    );
  }

  // ── Grade level ──
  if (step === 'grade') {
    return (
      <OnboardingShell step={isNewSemester ? 'New semester' : 'Step 1 of 3'}>
        <div style={{ paddingTop: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>What grade are you in?</h2>
          <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 22px', lineHeight: 1.5 }}>
            This helps tailor your assignment steps to the right level.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {GRADE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGradeLevel(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
                  border: `1.5px solid ${gradeLevel === opt.value ? Colors.forest : '#E3EBEA'}`,
                  background: gradeLevel === opt.value ? '#E8F4F5' : '#fff',
                  fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: gradeLevel === opt.value ? Colors.forest : Colors.textPrimary }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: gradeLevel === opt.value ? Colors.forest : Colors.textHint, marginTop: 1, opacity: 0.8 }}>
                    {opt.sub}
                  </div>
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
            <label style={{ fontSize: 12, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
              Which semester?
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SEMESTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSemester(opt.value)}
                  style={{
                    flex: 1, padding: '11px 8px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${semester === opt.value ? Colors.forest : '#E3EBEA'}`,
                    background: semester === opt.value ? '#E8F4F5' : '#fff',
                    color: semester === opt.value ? Colors.forest : Colors.textSecondary,
                    fontSize: 13, fontWeight: semester === opt.value ? 700 : 400,
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => gradeLevel && setStep('classes')}
            disabled={!gradeLevel}
            style={{ ...btnPrimary, background: gradeLevel ? Colors.forest : Colors.grayLight, color: gradeLevel ? '#fff' : Colors.textHint, cursor: gradeLevel ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            Continue <IconChevronRight size={16} color={gradeLevel ? '#fff' : Colors.textHint} />
          </button>
        </div>
      </OnboardingShell>
    );
  }

  // ── Classes ──
  if (step === 'classes') {
    return (
      <OnboardingShell step={isNewSemester ? 'New semester' : 'Step 2 of 3'}>
        <div style={{ paddingTop: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Add your classes</h2>
          <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 20px', lineHeight: 1.5 }}>
            Add each class you're taking this semester.
          </p>

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
                <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 7 }}>
                  Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span>
                </label>
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
            <button
              onClick={() => setAddingClass(true)}
              style={{ width: '100%', padding: 14, borderRadius: 14, border: `1.5px dashed ${Colors.forest}`, background: 'transparent', color: Colors.forest, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}
            >
              + Add a class
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setStep('first_assignment')}
              disabled={newCourses.length === 0}
              style={{ ...btnPrimary, background: newCourses.length > 0 ? Colors.forest : Colors.grayLight, color: newCourses.length > 0 ? '#fff' : Colors.textHint, cursor: newCourses.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Continue <IconChevronRight size={16} color={newCourses.length > 0 ? '#fff' : Colors.textHint} />
            </button>
            <button onClick={() => setStep('first_assignment')} style={btnSecondary}>Skip for now</button>
          </div>
        </div>
      </OnboardingShell>
    );
  }

  // ── First assignment ──
  if (step === 'first_assignment') {
    return (
      <OnboardingShell step={isNewSemester ? 'New semester' : 'Step 3 of 3'}>
        <div style={{ paddingTop: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: Colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Add your first assignments</h2>
          <p style={{ fontSize: 14, color: Colors.textHint, margin: '0 0 24px', lineHeight: 1.5 }}>
            Upload a syllabus or connect Canvas to import everything at once.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {/* Syllabus — mint */}
            <div
              onClick={() => finishSetup('add')}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: '#D9F5E5', border: '1.5px solid #1E8A5518', cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1E8A55', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#145C38' }}>Upload a syllabus</div>
                <div style={{ fontSize: 13, color: '#1E8A55', marginTop: 2 }}>AI reads your PDF and extracts all assignments</div>
              </div>
              <IconChevronRight size={18} color="#1E8A55" />
            </div>

            {/* Canvas — sky */}
            <div
              onClick={() => finishSetup('canvas')}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: '#E0EEFB', border: '1.5px solid #2764A818', cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2764A8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A4880' }}>Connect Canvas</div>
                <div style={{ fontSize: 13, color: '#2764A8', marginTop: 2 }}>Auto-import all courses and upcoming assignments</div>
              </div>
              <IconChevronRight size={18} color="#2764A8" />
            </div>

            {/* Manual — white */}
            <div
              onClick={() => finishSetup('add')}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1.5px solid #E3EBEA', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#C8D5D3')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#E3EBEA')}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
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
