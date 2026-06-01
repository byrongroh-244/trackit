import { useRef, useState, useEffect } from 'react';
import { useApp } from '../hooks/useApp';
import { uid, generateSubtasks, inferType } from '../data/store';
import { Colors } from '../theme';
import {
  Screen, ScrollBody, BottomNav,
  Field, TextInput, Textarea, Select, SaveButton, useToast,
} from '../components/UI';
import ClassPicker from '../components/add/ClassPicker';
import VoiceInput  from '../components/add/VoiceInput';
import SyllabusParser from '../components/add/SyllabusParser';
import type { Assignment, AssignmentType, AssignmentEffort, Course } from '../types';

// ParsedItem is the shared contract between all import flows and the main screen
export interface ParsedItem {
  name: string;
  dueDate: string;
  type: AssignmentType;
  selected: boolean;
}

const NAV = [
  { label: 'Agenda',   icon: '', screen: 'today'    },
  { label: 'Calendar', icon: '', screen: 'calendar' },
  { label: 'Add',      icon: '', screen: 'add'      },
  { label: 'Classes',  icon: '', screen: 'classes'  },
  { label: 'Settings', icon: '', screen: 'settings' },
];

export default function AddScreen() {
  const { courses, assignments, settings, updateAssignments, upsertAssignments, updateCourses, navigate } = useApp();
  const { showToast } = useToast();

  // Read type pre-selected from QuickLaunch (stored in sessionStorage)
  const preSelectedType = (() => {
    try {
      const t = sessionStorage.getItem('trackit_add_type');
      sessionStorage.removeItem('trackit_add_type');
      return t as 'homework' | 'test' | 'quiz' | 'class' | null;
    } catch { return null; }
  })();

  const [mode,         setMode]         = useState<'menu' | 'pickClass' | 'syllabus' | 'manual' | 'voice' | 'inputMethod'>(() =>
    preSelectedType === 'class' ? 'menu' :
    preSelectedType             ? 'inputMethod' : 'menu'
  );
  const [targetClass,  setTargetClass]  = useState<Course | null>(null);
  const [effort,       setEffort]       = useState<AssignmentEffort>(null);
  const [preType,      setPreType]      = useState<AssignmentType>(
    preSelectedType && preSelectedType !== 'class'
      ? (preSelectedType as AssignmentType)
      : 'homework'
  );

  // If user picked "Add Class" from QuickLaunch, redirect to Classes immediately
  useEffect(() => {
    if (preSelectedType === 'class') navigate('classes');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nameRef  = useRef<HTMLInputElement>(null);
  const dateRef  = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const classRef = useRef<HTMLSelectElement>(null);

  const gradeLevel = settings.gradeLevel ?? '';

  // ── Import handlers ──────────────────────────────────────────────────────────

  async function handleSyllabusImport(items: ParsedItem[]) {
    if (!targetClass) return;
    const newAssignments: Assignment[] = await Promise.all(items.map(async item => ({
      id: uid(), name: item.name,
      classId: targetClass.id, className: targetClass.name, classColor: targetClass.color,
      dueDate: item.dueDate, done: false, notes: '',
      type: item.type,
      effort: null,
      subtasks: await generateSubtasks(item.name, item.dueDate, gradeLevel),
    })));
    upsertAssignments(newAssignments);
    showToast(`${newAssignments.length} assignment${newAssignments.length !== 1 ? 's' : ''} added to ${targetClass.name}!`, 'success');
    setMode('menu');
    setTargetClass(null);
  }

  async function handleVoiceImport(item: ParsedItem, className: string) {
    const cls = courses.find(c => c.name === className) ?? courses[0];
    if (!cls) { showToast('Please add a class first.', 'error'); return; }
    const newA: Assignment = {
      id: uid(), name: item.name,
      classId: cls.id, className: cls.name, classColor: cls.color,
      dueDate: item.dueDate, done: false, notes: '',
      type: item.type,
      effort: null,
      subtasks: await generateSubtasks(item.name, item.dueDate, gradeLevel),
    };
    await upsertAssignments([newA]);
    navigate('detail', newA.id);
  }

  async function save() {
    const name    = nameRef.current?.value.trim() ?? '';
    const date    = dateRef.current?.value ?? '';
    const notes   = notesRef.current?.value.trim() ?? '';
    const classId = classRef.current?.value ?? '';
    if (!name) { showToast('Please enter an assignment name.', 'error'); return; }
    if (!date) { showToast('Please select a due date.', 'error'); return; }
    if (courses.length === 0) { showToast('Please add a class first in the Classes tab.', 'error'); return; }
    const cls = courses.find(c => c.id === classId) ?? courses[0];
    const newA: Assignment = {
      id: uid(), name,
      classId: cls.id, className: cls.name, classColor: cls.color,
      dueDate: date, done: false, notes,
      type: preType || inferType(name),
      effort,
      subtasks: await generateSubtasks(name, date, gradeLevel, effort),
    };
    await updateAssignments([...assignments, newA], [newA]);
    setEffort(null);
    navigate('detail', newA.id);
  }

  const subtitle =
    mode === 'pickClass'    ? 'Select a class for this syllabus' :
    mode === 'syllabus'     ? `Uploading for ${targetClass?.name ?? ''}` :
    mode === 'manual'       ? 'Enter details manually' :
    mode === 'voice'        ? 'Say your assignment' :
    mode === 'inputMethod'  ? `How do you want to add it?` :
    'How would you like to add?';

  return (
    <Screen>
      {/* Dark forest header — primary nav destination, sets the tone */}
      <div style={{ background: Colors.forest, padding: '22px 20px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 27, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
              Add assignment
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
              {subtitle}
            </div>
          </div>
        </div>
      </div>

      <ScrollBody hasNav>

        {/* ── Menu — 2×2 large tile grid ── */}
        {mode === 'menu' && (
          <div style={{ padding: '18px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* Voice — lavender */}
            <div
              onClick={() => setMode('voice')}
              style={{ background: '#EAE5FB', border: '1.5px solid #7B6DD018', borderRadius: 20, padding: '22px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 140, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ width: 46, height: 46, borderRadius: 13, background: '#7B6DD0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#4A3FA0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Say it out loud</div>
            </div>

            {/* Syllabus — mint */}
            <div
              onClick={() => setMode('pickClass')}
              style={{ background: '#D9F5E5', border: '1.5px solid #1E8A5518', borderRadius: 20, padding: '22px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 140, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ width: 46, height: 46, borderRadius: 13, background: '#1E8A55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#145C38', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Upload syllabus</div>
            </div>

            {/* Canvas — sky */}
            <div
              onClick={() => navigate('canvas')}
              style={{ background: '#E0EEFB', border: '1.5px solid #2764A818', borderRadius: 20, padding: '22px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 140, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ width: 46, height: 46, borderRadius: 13, background: '#2764A8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1A4880', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Connect Canvas</div>
            </div>

            {/* Manual — white/forest */}
            <div
              onClick={() => setMode('manual')}
              style={{ background: '#fff', border: '1.5px solid #E3EBEA', borderRadius: 20, padding: '22px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 140, transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = Colors.forest)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#E3EBEA')}
            >
              <div style={{ width: 46, height: 46, borderRadius: 13, background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: Colors.textPrimary, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Type it in</div>
            </div>
          </div>
        )}

        {/* ── Input method picker ── */}
        {mode === 'inputMethod' && (
          <div style={{ padding: '24px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setMode('menu')} style={{ background: 'none', border: 'none', color: Colors.forest, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0, marginBottom: 8 }}>
              ← Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: Colors.textHint }}>Adding a</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: Colors.forest, background: '#E8F4F5', padding: '3px 10px', borderRadius: 20 }}>
                {preType.charAt(0).toUpperCase() + preType.slice(1)}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: Colors.textPrimary, marginBottom: 4 }}>
              How do you want to add it?
            </div>

            <button
              onClick={() => setMode('voice')}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 18, border: '1.5px solid #7B6DD018', background: '#EAE5FB', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#7B6DD0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#4A3FA0', marginBottom: 2 }}>Say it out loud</div>

              </div>
            </button>

            <button
              onClick={() => setMode('manual')}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 18, border: '1.5px solid #E3EBEA', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#C8D5D3')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#E3EBEA')}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#E8F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={Colors.forest} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: Colors.textPrimary, marginBottom: 2 }}>Type it in</div>

              </div>
            </button>
          </div>
        )}

        {/* ── Voice ── */}
        {mode === 'voice' && (
          <div style={{ paddingTop: 16 }}>
            <VoiceInput courses={courses} onDone={handleVoiceImport} onCancel={() => setMode('menu')} />
          </div>
        )}

        {/* ── Pick class ── */}
        {mode === 'pickClass' && (
          <div style={{ paddingTop: 16 }}>
            <ClassPicker
              courses={courses}
              updateCourses={updateCourses}
              onPick={(cls: import('../types').Course) => { setTargetClass(cls); setMode('syllabus'); }}
              onCancel={() => setMode('menu')}
            />
          </div>
        )}

        {/* ── Syllabus ── */}
        {mode === 'syllabus' && targetClass && (
          <div style={{ paddingTop: 16 }}>
            <SyllabusParser targetClass={targetClass} settings={settings} onDone={handleSyllabusImport} onCancel={() => setMode('pickClass')} />
          </div>
        )}

        {/* ── Manual form — forest active states ── */}
        {mode === 'manual' && (
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button onClick={() => setMode('menu')} style={{ background: 'none', border: 'none', color: Colors.forest, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0, marginBottom: 4 }}>← Back</button>
            <Field label="Assignment name *"><TextInput ref={nameRef} placeholder="e.g. Essay draft" /></Field>
            <Field label="Class">
              {courses.length === 0 ? (
                <div style={{ fontSize: 13, color: Colors.textHint, padding: '10px 12px', background: Colors.background, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)' }}>
                  No classes yet — <span onClick={() => navigate('classes')} style={{ color: Colors.forest, fontWeight: 600, cursor: 'pointer' }}>add one in Classes</span>
                </div>
              ) : (
                <Select ref={classRef}>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
              )}
            </Field>
            <Field label="Due date *"><TextInput ref={dateRef} type="date" /></Field>
            <Field label="Effort (optional)">
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { value: 'quick', label: 'Quick', sub: '< 30 min' },
                  { value: 'medium', label: 'Medium', sub: '1–2 hrs' },
                  { value: 'long',  label: 'Long',  sub: '2+ hrs' },
                ] as const).map(opt => {
                  const active = effort === opt.value;
                  return (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setEffort(active ? null : opt.value)}
                      style={{
                        flex: 1, padding: '9px 4px', borderRadius: 12,
                        border: `1.5px solid ${active ? Colors.forest : 'rgba(0,0,0,0.12)'}`,
                        background: active ? '#E8F4F5' : 'transparent',
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: active ? Colors.forest : Colors.textPrimary }}>{opt.label}</span>
                      <span style={{ fontSize: 11, color: active ? Colors.forest : Colors.textHint, opacity: active ? 0.8 : 1 }}>{opt.sub}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Notes (optional)"><Textarea ref={notesRef} placeholder="Requirements, page count, format…" /></Field>
            <SaveButton label="Save & view breakdown" onClick={save} />
            <p style={{ fontSize: 12, color: Colors.textHint, textAlign: 'center', margin: 0 }}>Saves the assignment and opens it with suggested steps</p>
          </div>
        )}
      </ScrollBody>

      <BottomNav current="add" onNavigate={s => navigate(s as any)} items={NAV} />
    </Screen>
  );
}
