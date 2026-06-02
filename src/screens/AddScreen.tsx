import { useRef, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { uid, generateSubtasks, inferType } from '../data/store';
import { Colors } from '../theme';
import { Screen, ScrollBody, BottomNav, useToast } from '../components/UI';
import { IconArrowLeft } from '../components/Icons';
import TrackItLogo from '../components/TrackItLogo';
import { ADD_TILES, AddTile, AddTileType } from '../components/addTiles';
import ClassPicker from '../components/add/ClassPicker';
import VoiceInput  from '../components/add/VoiceInput';
import SyllabusParser from '../components/add/SyllabusParser';
import type { Assignment, AssignmentType, AssignmentEffort, Course } from '../types';

export interface ParsedItem {
  name: string; dueDate: string; type: AssignmentType; selected: boolean;
}

const NAV = [
  { label: 'Agenda',   icon: '', screen: 'today'    },
  { label: 'Calendar', icon: '', screen: 'calendar' },
  { label: 'Add',      icon: '', screen: 'add'      },
  { label: 'Classes',  icon: '', screen: 'classes'  },
  { label: 'Settings', icon: '', screen: 'settings' },
];


// ── Shared SubHeader ──────────────────────────────────────────────────────────
function SubHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div style={{ background: Colors.forest, padding: '18px 20px 20px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: subtitle ? 8 : 0 }}>
        <button
          onClick={onBack}
          aria-label="Go back" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <IconArrowLeft size={17} color="rgba(255,255,255,0.8)" />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{title}</div>
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, paddingLeft: 44 }}>{subtitle}</div>
      )}
    </div>
  );
}

// ── Type Select Overlay — identical pattern to AuthScreen ──────────────────────
function TypeSelectOverlay({ onPick, onDismiss }: {
  onPick: (type: AddTileType) => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <style>{`
        @keyframes ql-backdrop-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes ql-sheet-in { from { transform:translateY(60px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes ql-tile-in  { from { transform:translateY(18px) scale(0.95); opacity:0 } to { transform:translateY(0) scale(1); opacity:1 } }
      `}</style>

      {/* Backdrop — identical to QuickLaunch */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 140,
          background: 'rgba(28,74,79,0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animation: 'ql-backdrop-in 0.22s ease both',
        }}
      />

      {/* Bottom sheet — identical structure to QuickLaunch */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 141,
          padding: '0 14px',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
          animation: 'ql-sheet-in 0.32s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* Header row — back arrow + heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button
            onClick={onDismiss}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            What are you adding?
          </span>
        </div>

        {/* 2×2 tile grid — same ADD_TILES, same AddTile component as QuickLaunch */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ADD_TILES.map((tile, i) => (
            <AddTile key={tile.type} tile={tile} delay={i * 40} onClick={() => onPick(tile.type)} />
          ))}
        </div>

        {/* Dismiss — same as QuickLaunch */}
        <button
          onClick={onDismiss}
          style={{ width: '100%', marginTop: 12, padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Dismiss
        </button>
      </div>
    </>
  );
}

export default function AddScreen() {
  const { courses, assignments, settings, updateAssignments, upsertAssignments, updateCourses, navigate } = useApp();
  const microsteps = settings.microstepsEnabled !== false; // default true
  const { showToast } = useToast();

  type Mode = 'typeSelect' | 'inputMethod' | 'manual' | 'voice' | 'pickClass' | 'syllabus';

  const [mode,    setMode]    = useState<Mode>('typeSelect');
  const [selType, setSelType] = useState<AssignmentType>('homework');
  const [targetClass, setTargetClass] = useState<Course | null>(null);
  const [effort,      setEffort]      = useState<AssignmentEffort>(null);

  const nameRef  = useRef<HTMLInputElement>(null);
  const dateRef  = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const classRef = useRef<HTMLSelectElement>(null);

  const gradeLevel = settings.gradeLevel ?? '';
  const isTask     = selType === 'task';
  const selTile    = ADD_TILES.find(t => t.type === selType) ?? ADD_TILES[0];



  function pickType(type: AddTileType) {
    setSelType(type as AssignmentType);
    // Task goes straight to manual — no voice/syllabus needed
    setMode(type === 'task' ? 'manual' : 'inputMethod');
  }

  // ── Import handlers ─────────────────────────────────────────────────────────

  async function handleSyllabusImport(items: ParsedItem[]) {
    if (!targetClass) return;
    const newAssignments: Assignment[] = await Promise.all(items.map(async item => ({
      id: uid(), name: item.name,
      classId: targetClass.id, className: targetClass.name, classColor: targetClass.color,
      dueDate: item.dueDate, done: false, notes: '',
      type: item.type, effort: null,
      subtasks: (item.type === 'task' || !microsteps) ? [] : await generateSubtasks(item.name, item.dueDate, gradeLevel),
    })));
    upsertAssignments(newAssignments);
    showToast(`${newAssignments.length} item${newAssignments.length !== 1 ? 's' : ''} added!`, 'success');
    setMode('typeSelect'); setTargetClass(null);
  }

  async function handleVoiceImport(item: ParsedItem, className: string) {
    const cls = courses.find(c => c.name === className) ?? courses[0];
    if (!cls) { showToast('Please add a class first.', 'error'); return; }
    const newA: Assignment = {
      id: uid(), name: item.name,
      classId: cls.id, className: cls.name, classColor: cls.color,
      dueDate: item.dueDate, done: false, notes: '',
      type: item.type, effort: null,
      subtasks: (item.type === 'task' || !microsteps) ? [] : await generateSubtasks(item.name, item.dueDate, gradeLevel),
    };
    await upsertAssignments([newA]);
    navigate(item.type === 'task' ? 'today' : 'detail', newA.id);
  }

  async function save() {
    const name    = nameRef.current?.value.trim()  ?? '';
    const date    = dateRef.current?.value          ?? '';
    const notes   = notesRef.current?.value.trim()  ?? '';
    const classId = classRef.current?.value          ?? '';
    if (!name) { showToast('Please enter a name.', 'error'); return; }
    if (!date) { showToast('Please select a due date.', 'error'); return; }
    if (courses.length === 0) { showToast('Please add a class first.', 'error'); return; }
    const cls = courses.find(c => c.id === classId) ?? courses[0];
    const newA: Assignment = {
      id: uid(), name,
      classId: cls.id, className: cls.name, classColor: cls.color,
      dueDate: date, done: false, notes,
      type: selType || inferType(name),
      effort: isTask ? null : effort,
      subtasks: (isTask || !microsteps) ? [] : await generateSubtasks(name, date, gradeLevel, effort),
    };
    await updateAssignments([...assignments, newA], [newA]);
    setEffort(null);
    navigate(isTask ? 'today' : 'detail', newA.id);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 15, padding: '13px 14px',
    borderRadius: 12, border: '1.5px solid #E3EBEA',
    outline: 'none', fontFamily: 'inherit',
    color: Colors.textPrimary, background: '#fff',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  // ── Voice ─────────────────────────────────────────────────────────────────────
  if (mode === 'voice') {
    return (
      <Screen>
        <VoiceInput courses={courses} onDone={handleVoiceImport} onCancel={() => setMode('inputMethod')} />
        <BottomNav current="add" onNavigate={s => navigate(s as any)} items={NAV} />
      </Screen>
    );
  }

  // ── Pick class ────────────────────────────────────────────────────────────────
  if (mode === 'pickClass') {
    return (
      <Screen>
        <ClassPicker
          courses={courses}
          updateCourses={updateCourses}
          onPick={(cls: Course) => { setTargetClass(cls); setMode('syllabus'); }}
          onCancel={() => setMode('inputMethod')}
        />
        <BottomNav current="add" onNavigate={s => navigate(s as any)} items={NAV} />
      </Screen>
    );
  }

  // ── Syllabus ──────────────────────────────────────────────────────────────────
  if (mode === 'syllabus' && targetClass) {
    return (
      <Screen>
        <SyllabusParser targetClass={targetClass} settings={settings} onDone={handleSyllabusImport} onCancel={() => setMode('pickClass')} />
        <BottomNav current="add" onNavigate={s => navigate(s as any)} items={NAV} />
      </Screen>
    );
  }

  // ── Manual form ───────────────────────────────────────────────────────────────
  if (mode === 'manual') {
    return (
      <Screen>
        <SubHeader
          title={`Add ${selTile.label}`}
          subtitle={isTask ? 'Name, class, and due date' : 'AI will generate micro-steps after saving'}
          onBack={() => setMode(isTask ? 'typeSelect' : 'inputMethod')}
        />
        <ScrollBody hasNav>
          <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Type badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: selTile.bg, borderRadius: 10, padding: '8px 14px', alignSelf: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: selTile.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ transform: 'scale(0.65)', display: 'flex' }}>{selTile.icon}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: selTile.textColor }}>{selTile.label}</span>
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
                {isTask ? 'Task name' : 'Assignment name'} *
              </label>
              <input
                ref={nameRef} autoFocus
                placeholder={
                  selType === 'homework' ? 'e.g. Chapter 4 worksheet' :
                  selType === 'test'     ? 'e.g. Midterm Exam' :
                  selType === 'quiz'     ? 'e.g. Vocab Quiz 3' :
                  selType === 'task'     ? 'e.g. Return permission slip' :
                  selType === 'project'  ? 'e.g. Science Fair project' : 'Name…'
                }
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = Colors.forest)}
                onBlur={e =>  (e.target.style.borderColor = '#E3EBEA')}
              />
            </div>

            {/* Class */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Class</label>
              {courses.length === 0 ? (
                <div style={{ fontSize: 13, color: Colors.textHint, padding: '12px 14px', background: Colors.background, borderRadius: 10, border: '1.5px solid #E3EBEA' }}>
                  No classes yet —{' '}
                  <span onClick={() => navigate('classes')} style={{ color: Colors.forest, fontWeight: 700, cursor: 'pointer' }}>add one in Classes</span>
                </div>
              ) : (
                <select ref={classRef} style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = Colors.forest)}
                  onBlur={e =>  (e.target.style.borderColor = '#E3EBEA')}
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            {/* Due date */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>Due date *</label>
              <input ref={dateRef} type="date" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = Colors.forest)}
                onBlur={e =>  (e.target.style.borderColor = '#E3EBEA')}
              />
            </div>

            {/* Effort — not for tasks */}
            {!isTask && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
                  Effort <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, opacity: 0.7 }}>(optional)</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([{ value: 'quick', label: 'Quick', sub: '< 30m' }, { value: 'medium', label: 'Medium', sub: '1–2 hrs' }, { value: 'long', label: 'Long', sub: '2+ hrs' }] as const).map(opt => {
                    const active = effort === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setEffort(active ? null : opt.value)}
                        style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: `1.5px solid ${active ? Colors.forest : 'rgba(0,0,0,0.1)'}`, background: active ? '#E8F4F5' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s' }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: active ? Colors.forest : Colors.textPrimary }}>{opt.label}</span>
                        <span style={{ fontSize: 11, color: active ? Colors.forest : Colors.textHint, opacity: active ? 0.8 : 1 }}>{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
                Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, opacity: 0.7 }}>(optional)</span>
              </label>
              <textarea ref={notesRef} placeholder={isTask ? 'Any extra details…' : 'Requirements, page count, format…'} rows={3}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                onFocus={e => (e.target.style.borderColor = Colors.forest)}
                onBlur={e =>  (e.target.style.borderColor = '#E3EBEA')}
              />
            </div>

            {/* Save */}
            <button onClick={save} style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: Colors.forest, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#B8E04A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isTask ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={Colors.forest} stroke="none"><polygon points="5,3 21,12 5,21"/></svg>
                )}
              </div>
              {isTask ? 'Add to agenda' : 'Save & view breakdown'}
            </button>

            {!isTask && (
              <p style={{ fontSize: 12, color: Colors.textHint, textAlign: 'center', margin: 0 }}>AI generates micro-steps after saving</p>
            )}
          </div>
        </ScrollBody>
        <BottomNav current="add" onNavigate={s => navigate(s as any)} items={NAV} />
      </Screen>
    );
  }

  // ── Input method ──────────────────────────────────────────────────────────────
  if (mode === 'inputMethod') {
    return (
      <Screen>
        <SubHeader title={selTile.label} subtitle="How do you want to add it?" onBack={() => setMode('typeSelect')} />
        <ScrollBody hasNav>
          <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            <button onClick={() => setMode('voice')}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px', borderRadius: 18, border: '1.5px solid #7B6DD018', background: '#EAE5FB', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#7B6DD0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#4A3FA0', letterSpacing: '-0.02em' }}>Say it out loud</span>
            </button>

            <button onClick={() => setMode('manual')}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px', borderRadius: 18, border: '1.5px solid #E3EBEA', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = Colors.forest)} onMouseLeave={e => (e.currentTarget.style.borderColor = '#E3EBEA')}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: Colors.textPrimary, letterSpacing: '-0.02em' }}>Type it in</span>
            </button>

            {!isTask && (
              <button onClick={() => setMode('pickClass')}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px', borderRadius: 18, border: '1.5px solid #1E8A5518', background: '#D9F5E5', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'opacity 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1E8A55', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#145C38', letterSpacing: '-0.02em' }}>Upload syllabus</span>
              </button>
            )}
          </div>
        </ScrollBody>
        <BottomNav current="add" onNavigate={s => navigate(s as any)} items={NAV} />
      </Screen>
    );
  }

  // ── typeSelect — bottom sheet overlay identical to QuickLaunch ───────────────
  return (
    <Screen>
      <div style={{ flex: 1 }} />
      <TypeSelectOverlay onPick={pickType} onDismiss={() => navigate('today')} />
      <BottomNav current="add" onNavigate={s => navigate(s as any)} items={NAV} />
    </Screen>
  );
}
